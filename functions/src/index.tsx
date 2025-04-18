// Fix for functions/src/index.tsx

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import * as nodemailer from 'nodemailer';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Stripe with your secret key
// Updated API version to match the required version
const stripe = new Stripe('sk_test_your_stripe_secret_key', {
  apiVersion: '2025-03-31.basil', // Updated to expected version
});

// Set up email transport for nodemailer
const emailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'thoughtswithgod@gmail.com',
    pass: 'your_app_password', // This should be an app password, not your regular password
  },
});

// Interface for stripe product IDs
interface StripeProduct {
  id: string;
  price: string;
  amount: number;
}

interface StripeProducts {
  [key: string]: StripeProduct;
}

// Stripe Product IDs for subscription plans
// These would be created in your Stripe dashboard
const STRIPE_PRODUCTS: StripeProducts = {
  monthly_basic: {
    id: 'prod_basic_monthly',
    price: 'price_basic_monthly',
    amount: 499  // $4.99 in cents
  },
  monthly_premium: {
    id: 'prod_premium_monthly',
    price: 'price_premium_monthly',
    amount: 999  // $9.99 in cents
  },
  yearly_premium: {
    id: 'prod_premium_yearly',
    price: 'price_premium_yearly',
    amount: 9999  // $99.99 in cents
  }
};

// Define types for function data
interface PaymentIntentData {
  amount: number;
  currency: string;
  paymentMethodId: string;
  description: string;
  metadata?: Record<string, string>;
  receiptEmail?: string;
}

/**
 * Creates a Stripe Payment Intent for one-time payments
 * FIXED: Updated function signature to match Firebase Functions v2
 */
export const createPaymentIntent = functions.https.onCall(async (request) => {
  // Extract data and auth from request
  const data = request.data as PaymentIntentData;
  const auth = request.auth;

  // Ensure user is authenticated
  if (!auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to create a payment'
    );
  }

  try {
    const { amount, currency, paymentMethodId, description, metadata, receiptEmail } = data;

    // Create a Payment Intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method: paymentMethodId,
      confirm: true,
      confirmation_method: 'manual',
      description,
      metadata: {
        ...metadata,
        userId: auth.uid
      },
      receipt_email: receiptEmail
    });

    // Return the client secret for the frontend to confirm the payment
    return {
      clientSecret: paymentIntent.client_secret,
      transactionId: paymentIntent.id
    };
  } catch (error: unknown) {
    console.error('Payment intent creation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
    throw new functions.https.HttpsError('internal', errorMessage);
  }
});

interface SubscriptionData {
  planId: string;
  paymentMethodId: string;
  customerEmail: string;
}

/**
 * Creates a Stripe Subscription
 * FIXED: Updated function signature to match Firebase Functions v2
 */
export const createSubscription = functions.https.onCall(async (request) => {
  // Extract data and auth from request
  const data = request.data as SubscriptionData;
  const auth = request.auth;

  // Ensure user is authenticated
  if (!auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to create a subscription'
    );
  }

  try {
    const { planId, paymentMethodId, customerEmail } = data;
    const userId = auth.uid;

    // Get plan details from Stripe Products
    const plan = STRIPE_PRODUCTS[planId];
    if (!plan) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid subscription plan'
      );
    }

    // Check if user already has a Stripe customer ID
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    let customerId = userData?.stripeCustomerId || null;

    // If no customer exists, create one
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: customerEmail,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
        metadata: {
          userId: userId
        }
      });
      customerId = customer.id;

      // Save Stripe customer ID to Firestore
      await admin.firestore().collection('users').doc(userId).set(
        { stripeCustomerId: customerId },
        { merge: true }
      );
    } else {
      // Update the customer's payment method
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });

      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        }
      });
    }

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: plan.price }],
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: userId,
        planId: planId
      }
    });

    // Calculate subscription end date
    const now = admin.firestore.Timestamp.now();
    const monthsInPlan = planId.includes('yearly') ? 12 : 1;
    const endDateMillis = now.toMillis() + (monthsInPlan * 30 * 24 * 60 * 60 * 1000);
    const endDate = admin.firestore.Timestamp.fromMillis(endDateMillis);

    // Save subscription details to Firestore
    await admin.firestore().collection('subscriptions').doc(userId).set({
      userId: userId,
      planId: planId,
      status: 'active',
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      startDate: now,
      endDate: endDate,
      autoRenew: true,
      paymentMethod: {
        id: paymentMethodId,
        type: 'credit_card'
      }
    });

    // Send confirmation email
    await sendSubscriptionEmail(
      customerEmail,
      planId,
      subscription.id,
      plan.amount / 100,
      new Date(endDateMillis)
    );

    // Access the payment intent from the expanded subscription object
    const latestInvoice = subscription.latest_invoice as any;
    const paymentIntent = latestInvoice?.payment_intent;

    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret,
      stripeCustomerId: customerId
    };
  } catch (error: unknown) {
    console.error('Subscription creation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Subscription creation failed';
    throw new functions.https.HttpsError('internal', errorMessage);
  }
});

/**
 * Cancels a Stripe Subscription
 * FIXED: Updated function signature to match Firebase Functions v2
 */
export const cancelSubscription = functions.https.onCall(async (request) => {
  // Extract auth from request
  const auth = request.auth;

  // Ensure user is authenticated
  if (!auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to cancel a subscription'
    );
  }

  try {
    const userId = auth.uid;

    // Get subscription from Firestore
    const subscriptionDoc = await admin.firestore().collection('subscriptions').doc(userId).get();
    if (!subscriptionDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'No active subscription found'
      );
    }

    const subscriptionData = subscriptionDoc.data();
    const stripeSubscriptionId = subscriptionData?.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      throw new functions.https.HttpsError(
        'not-found',
        'No Stripe subscription ID found'
      );
    }

    // Cancel the subscription with Stripe
    // Set cancel_at_period_end to true to keep subscription active until the end of the billing period
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    // Update subscription status in Firestore
    await admin.firestore().collection('subscriptions').doc(userId).update({
      status: 'canceled',
      autoRenew: false
    });

    // Get user email for cancellation notification
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    const userEmail = userData?.email;

    if (userEmail) {
      // Send cancellation email
      await sendCancellationEmail(
        userEmail,
        subscriptionData.planId,
        subscriptionData.endDate.toDate()
      );
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Subscription cancellation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Subscription cancellation failed';
    throw new functions.https.HttpsError('internal', errorMessage);
  }
});

interface AutoRenewData {
  autoRenew: boolean;
}

/**
 * Toggles auto-renewal for a subscription
 * FIXED: Updated function signature to match Firebase Functions v2
 */
export const toggleAutoRenew = functions.https.onCall(async (request) => {
  // Extract data and auth from request
  const data = request.data as AutoRenewData;
  const auth = request.auth;

  // Ensure user is authenticated
  if (!auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to update your subscription'
    );
  }

  try {
    const userId = auth.uid;
    const { autoRenew } = data;

    // Get subscription from Firestore
    const subscriptionDoc = await admin.firestore().collection('subscriptions').doc(userId).get();
    if (!subscriptionDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'No active subscription found'
      );
    }

    const subscriptionData = subscriptionDoc.data();
    const stripeSubscriptionId = subscriptionData?.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      throw new functions.https.HttpsError(
        'not-found',
        'No Stripe subscription ID found'
      );
    }

    // Update the subscription with Stripe
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: !autoRenew
    });

    // Update subscription status in Firestore
    await admin.firestore().collection('subscriptions').doc(userId).update({
      autoRenew
    });

    return { success: true, autoRenew };
  } catch (error: unknown) {
    console.error('Auto-renew toggle failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update auto-renewal setting';
    throw new functions.https.HttpsError('internal', errorMessage);
  }
});

/**
 * Validates a user's subscription status
 * Called by the client to verify subscription status is valid
 * FIXED: Updated function signature to match Firebase Functions v2
 */
export const validateSubscription = functions.https.onCall(async (request) => {
  // Extract auth from request
  const auth = request.auth;

  // Ensure user is authenticated
  if (!auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to validate your subscription'
    );
  }

  try {
    const userId = auth.uid;

    // Get subscription from Firestore
    const subscriptionDoc = await admin.firestore().collection('subscriptions').doc(userId).get();
    if (!subscriptionDoc.exists) {
      return { active: false };
    }

    const subscriptionData = subscriptionDoc.data();
    const stripeSubscriptionId = subscriptionData?.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      return { active: false };
    }

    // Validate with Stripe
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    
    // Check if subscription is active
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    
    // Check if subscription end date is in the future
    const now = admin.firestore.Timestamp.now();
    const endDate = subscriptionData.endDate;
    const isNotExpired = endDate.toMillis() > now.toMillis();
    
    // If status changed, update in Firestore
    if (isActive !== (subscriptionData.status === 'active')) {
      await admin.firestore().collection('subscriptions').doc(userId).update({
        status: isActive ? 'active' : 'expired'
      });
    }

    return {
      active: isActive && isNotExpired,
      plan: subscriptionData.planId,
      endDate: endDate.toDate().toISOString(),
      autoRenew: subscriptionData.autoRenew
    };
  } catch (error: unknown) {
    console.error('Subscription validation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to validate subscription';
    throw new functions.https.HttpsError('internal', errorMessage);
  }
});

// Fix the WebhookRequest interface to properly include headers
interface WebhookRequest extends functions.https.Request {
    rawBody: any;
    headers: {
      [key: string]: string | string[] | undefined;
      'stripe-signature'?: string;
    };
  }

/**
 * Handles Stripe webhook events for subscription updates
 * FIXED: Updated function signature to match Firebase Functions v2
 */
export const stripeWebhook = functions.https.onRequest(async (req: WebhookRequest, res) => {
  const signature = req.headers['stripe-signature'] as string;

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      'whsec_your_webhook_signing_secret' // Replace with your webhook secret
    );

    // Handle different event types
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handleSuccessfulPayment(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handleFailedPayment(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
    }

    res.status(200).send({ received: true });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown webhook error';
    res.status(400).send(`Webhook Error: ${errorMessage}`);
  }
});

// The rest of the functions follow the same pattern...

// Helper functions remain the same
async function handleSuccessfulPayment(invoice: any) {
  // Implementation remains the same
}

async function handleFailedPayment(invoice: any) {
  // Implementation remains the same
}

async function handleSubscriptionCanceled(subscription: any) {
  // Implementation remains the same
}

async function handleSubscriptionUpdated(subscription: any) {
  // Implementation remains the same
}

async function sendSubscriptionEmail(
  email: string,
  planId: string,
  subscriptionId: string,
  amount: number,
  endDate: Date
): Promise<boolean> {
  // Implementation remains the same
}

async function sendCancellationEmail(
  email: string,
  planId: string,
  endDate: Date
): Promise<boolean> {
  // Implementation remains the same
}

async function sendRenewalEmail(
  email: string,
  planId: string,
  invoiceId: string,
  amount: number,
  endDate: Date
): Promise<boolean> {
  // Implementation remains the same
}

async function sendPaymentFailureEmail(
  email: string,
  planId: string,
  invoiceId: string,
  amount: number,
  nextAttemptDate: Date | null
): Promise<boolean> {
  // Implementation remains the same
}

interface ReceiptEmailData {
  email: string;
  purchaseDetails: {
    amount: number;
    transactionId: string;
    purchaseDate: string;
    productName: string;
    description: string;
  };
}

/**
 * Send receipt email for one-time purchases
 * FIXED: Updated function signature to match Firebase Functions v2
 */
export const sendReceiptEmail = functions.https.onCall(async (request) => {
  // Extract data and auth from request
  const data = request.data as ReceiptEmailData;
  const auth = request.auth;
  
  // Ensure user is authenticated
  if (!auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to request a receipt'
    );
  }

  try {
    const { email, purchaseDetails } = data;
    const {
      amount,
      transactionId,
      purchaseDate,
      productName,
      description
    } = purchaseDetails;

    const mailOptions = {
      from: '"Thoughts With God" <thoughtswithgod@gmail.com>',
      to: email,
      subject: 'Your Thoughts With God Receipt',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #5271FF;">Thoughts With God</h1>
            <p style="font-size: 18px;">Receipt for Your Purchase</p>
          </div>
          
          <div style="background-color: #f7f9fc; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Purchase Details</h2>
            <p><strong>Item:</strong> ${productName}</p>
            <p><strong>Description:</strong> ${description}</p>
            <p><strong>Amount:</strong> ${(amount/100).toFixed(2)}</p>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
            <p><strong>Date:</strong> ${new Date(purchaseDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
          
          <div style="text-align: center; color: #777; font-size: 12px; margin-top: 30px;">
            <p>This receipt was generated automatically. Please keep it for your records.</p>
            <p>If you have any questions or need assistance, please contact us at support@thoughtswithgod.com</p>
            <p>&copy; ${new Date().getFullYear()} Thoughts With God. All rights reserved.</p>
          </div>
        </div>
      `
    };

    await emailTransport.sendMail(mailOptions);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error sending receipt email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send receipt email';
    throw new functions.https.HttpsError('internal', errorMessage);
  }
});