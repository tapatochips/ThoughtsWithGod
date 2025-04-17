import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import * as nodemailer from 'nodemailer';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Stripe with your secret key
const stripe = new Stripe('sk_test_your_stripe_secret_key', {
  apiVersion: '2023-08-16', // Use the current API version
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
 */
export const createPaymentIntent = functions.https.onCall(async (data: PaymentIntentData, context: functions.https.CallableContext) => {
  // Ensure user is authenticated
  if (!context.auth) {
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
        userId: context.auth.uid
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
 */
export const createSubscription = functions.https.onCall(async (data: SubscriptionData, context: functions.https.CallableContext) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to create a subscription'
    );
  }

  try {
    const { planId, paymentMethodId, customerEmail } = data;
    const userId = context.auth.uid;

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
 */
export const cancelSubscription = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to cancel a subscription'
    );
  }

  try {
    const userId = context.auth.uid;

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
 */
export const toggleAutoRenew = functions.https.onCall(async (data: AutoRenewData, context: functions.https.CallableContext) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to update your subscription'
    );
  }

  try {
    const userId = context.auth.uid;
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
 */
export const validateSubscription = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to validate your subscription'
    );
  }

  try {
    const userId = context.auth.uid;

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
 */
export const stripeWebhook = functions.https.onRequest(async (req: WebhookRequest, res: functions.Response) => {
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

/**
 * Handle successful payment webhook
 */
async function handleSuccessfulPayment(invoice: any) {
  if (invoice.subscription) {
    // This is a subscription payment
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata?.userId;
    
    if (!userId) {
      console.error('No userId found in subscription metadata');
      return;
    }
    
    // Get current subscription data
    const subscriptionDoc = await admin.firestore().collection('subscriptions').doc(userId).get();
    if (!subscriptionDoc.exists) {
      console.error('No subscription document found for user:', userId);
      return;
    }
    
    const subscriptionData = subscriptionDoc.data();
    
    // Calculate new end date based on the subscription plan
    const planId = subscriptionData?.planId;
    const monthsInPlan = planId?.includes('yearly') ? 12 : 1;
    const currentEndDate = subscriptionData?.endDate.toDate();
    const newEndDateMillis = currentEndDate.getTime() + (monthsInPlan * 30 * 24 * 60 * 60 * 1000);
    const newEndDate = admin.firestore.Timestamp.fromMillis(newEndDateMillis);
    
    // Update the subscription in Firestore
    await admin.firestore().collection('subscriptions').doc(userId).update({
      status: 'active',
      endDate: newEndDate,
      // Reset to active if it was canceled but renewed
      autoRenew: true
    });
    
    // Get user email for renewal notification
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    const userEmail = userData?.email;
    
    if (userEmail) {
      // Get the plan details for the email
      const plan = planId ? STRIPE_PRODUCTS[planId] : null;
      const amount = plan ? plan.amount / 100 : (invoice.amount_paid / 100);
      
      // Send renewal confirmation email
      await sendRenewalEmail(
        userEmail,
        planId || 'unknown_plan',
        invoice.id,
        amount,
        new Date(newEndDateMillis)
      );
    }
  }
}

/**
 * Handle failed payment webhook
 */
async function handleFailedPayment(invoice: any) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata?.userId;
    
    if (!userId) {
      console.error('No userId found in subscription metadata');
      return;
    }
    
    // Get user email for payment failure notification
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    const userEmail = userData?.email;
    
    if (userEmail) {
      // Get subscription details
      const subscriptionDoc = await admin.firestore().collection('subscriptions').doc(userId).get();
      if (subscriptionDoc.exists) {
        const subscriptionData = subscriptionDoc.data();
        
        // Send payment failure email
        await sendPaymentFailureEmail(
          userEmail,
          subscriptionData?.planId || 'unknown_plan',
          invoice.id,
          invoice.amount_due / 100,
          invoice.next_payment_attempt
            ? new Date(invoice.next_payment_attempt * 1000)
            : null
        );
      }
    }
  }
}

/**
 * Handle subscription canceled webhook
 */
async function handleSubscriptionCanceled(subscription: any) {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    console.error('No userId found in subscription metadata');
    return;
  }
  
  // Update subscription status in Firestore
  await admin.firestore().collection('subscriptions').doc(userId).update({
    status: 'canceled',
    autoRenew: false
  });
}

/**
 * Handle subscription updated webhook
 */
async function handleSubscriptionUpdated(subscription: any) {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    console.error('No userId found in subscription metadata');
    return;
  }
  
  // Update subscription status in Firestore if needed
  const status = subscription.status === 'active' || subscription.status === 'trialing'
    ? 'active'
    : subscription.status;
  
  const autoRenew = !subscription.cancel_at_period_end;
  
  await admin.firestore().collection('subscriptions').doc(userId).update({
    status,
    autoRenew
  });
}

/**
 * Send subscription confirmation email
 */
async function sendSubscriptionEmail(
  email: string,
  planId: string,
  subscriptionId: string,
  amount: number,
  endDate: Date
): Promise<boolean> {
  const planName = planId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const mailOptions = {
    from: '"Thoughts With God" <thoughtswithgod@gmail.com>',
    to: email,
    subject: 'Your Subscription Confirmation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #5271FF;">Thoughts With God</h1>
          <p style="font-size: 18px;">Thank you for your subscription!</p>
        </div>
        
        <div style="background-color: #f7f9fc; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">Subscription Details</h2>
          <p><strong>Plan:</strong> ${planName}</p>
          <p><strong>Amount:</strong> ${amount.toFixed(2)}</p>
          <p><strong>Subscription ID:</strong> ${subscriptionId}</p>
          <p><strong>Active Until:</strong> ${endDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3>What's Included in Your Subscription:</h3>
          <ul>
            ${planId.includes('premium') ? `
              <li>Unlimited favorite verses</li>
              <li>Unlimited prayer requests</li>
              <li>Access to verse notes feature</li>
              <li>Commenting on prayer board</li>
              <li>Advanced Bible study tools</li>
              ${planId.includes('yearly') ? '<li>Annual spiritual growth report</li>' : ''}
            ` : `
              <li>Unlimited favorite verses</li>
              <li>Unlimited prayer requests</li>
              <li>Access to verse notes feature</li>
              <li>Commenting on prayer board</li>
            `}
          </ul>
        </div>
        
        <div style="background-color: #e9f7ef; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="color: #27ae60; margin-top: 0;">Next Steps</h3>
          <p>Your subscription is now active! You can start using all premium features immediately.</p>
          <p>You can manage your subscription from the Profile Settings screen in the app.</p>
        </div>
        
        <div style="text-align: center; color: #777; font-size: 12px; margin-top: 30px;">
          <p>If you have any questions or need assistance, please contact us at support@thoughtswithgod.com</p>
          <p>&copy; ${new Date().getFullYear()} Thoughts With God. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    await emailTransport.sendMail(mailOptions);
    console.log(`Subscription confirmation email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending subscription confirmation email:', error);
    return false;
  }
}

/**
 * Send subscription cancellation email
 */
async function sendCancellationEmail(
  email: string,
  planId: string,
  endDate: Date
): Promise<boolean> {
  const planName = planId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const mailOptions = {
    from: '"Thoughts With God" <thoughtswithgod@gmail.com>',
    to: email,
    subject: 'Subscription Cancellation Confirmation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #5271FF;">Thoughts With God</h1>
          <p style="font-size: 18px;">Your subscription has been canceled</p>
        </div>
        
        <div style="background-color: #f7f9fc; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">Cancellation Details</h2>
          <p><strong>Plan:</strong> ${planName}</p>
          <p><strong>Access Until:</strong> ${endDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p>We're sorry to see you go! Your premium features will remain active until the end of your current billing period as shown above.</p>
          <p>After that date, your account will revert to the free version with limited features.</p>
        </div>
        
        <div style="background-color: #f5edf7; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="color: #8e44ad; margin-top: 0;">We'd Love Your Feedback</h3>
          <p>If you have a moment, we'd appreciate knowing why you decided to cancel. Your feedback helps us improve our service.</p>
          <p>Simply reply to this email with your thoughts.</p>
        </div>
        
        <div style="background-color: #e9f7ef; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="color: #27ae60; margin-top: 0;">Want to Resubscribe?</h3>
          <p>You can resubscribe anytime from the Profile Settings screen in the app.</p>
        </div>
        
        <div style="text-align: center; color: #777; font-size: 12px; margin-top: 30px;">
          <p>If you have any questions or need assistance, please contact us at support@thoughtswithgod.com</p>
          <p>&copy; ${new Date().getFullYear()} Thoughts With God. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    await emailTransport.sendMail(mailOptions);
    console.log(`Cancellation email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    return false;
  }
}

/**
 * Send subscription renewal email
 */
async function sendRenewalEmail(
  email: string,
  planId: string,
  invoiceId: string,
  amount: number,
  endDate: Date
): Promise<boolean> {
  const planName = planId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const mailOptions = {
    from: '"Thoughts With God" <thoughtswithgod@gmail.com>',
    to: email,
    subject: 'Your Subscription Has Been Renewed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #5271FF;">Thoughts With God</h1>
          <p style="font-size: 18px;">Your subscription has been renewed!</p>
        </div>
        
        <div style="background-color: #f7f9fc; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">Renewal Details</h2>
          <p><strong>Plan:</strong> ${planName}</p>
          <p><strong>Amount:</strong> ${amount.toFixed(2)}</p>
          <p><strong>Invoice ID:</strong> ${invoiceId}</p>
          <p><strong>Active Until:</strong> ${endDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p>Thank you for continuing your journey with Thoughts With God! Your premium features will remain active until the date shown above.</p>
        </div>
        
        <div style="background-color: #e9f7ef; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="color: #27ae60; margin-top: 0;">Manage Your Subscription</h3>
          <p>You can manage your subscription anytime from the Profile Settings screen in the app.</p>
        </div>
        
        <div style="text-align: center; color: #777; font-size: 12px; margin-top: 30px;">
          <p>If you have any questions or need assistance, please contact us at support@thoughtswithgod.com</p>
          <p>&copy; ${new Date().getFullYear()} Thoughts With God. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    await emailTransport.sendMail(mailOptions);
    console.log(`Renewal email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending renewal email:', error);
    return false;
  }
}

/**
 * Send payment failure email
 */
async function sendPaymentFailureEmail(
  email: string,
  planId: string,
  invoiceId: string,
  amount: number,
  nextAttemptDate: Date | null
): Promise<boolean> {
  const planName = planId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const mailOptions = {
    from: '"Thoughts With God" <thoughtswithgod@gmail.com>',
    to: email,
    subject: 'Action Required: Subscription Payment Failed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #5271FF;">Thoughts With God</h1>
          <p style="font-size: 18px; color: #e74c3c;">Action Required: Payment Failed</p>
        </div>
        
        <div style="background-color: #fdeded; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #e74c3c;">
          <h2 style="color: #e74c3c; margin-top: 0;">Payment Failure Notice</h2>
          <p>We were unable to process your subscription payment.</p>
        </div>
        
        <div style="background-color: #f7f9fc; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-top: 0;">Payment Details</h3>
          <p><strong>Plan:</strong> ${planName}</p>
          <p><strong>Amount:</strong> ${amount.toFixed(2)}</p>
          <p><strong>Invoice ID:</strong> ${invoiceId}</p>
          ${nextAttemptDate ? `
            <p><strong>Next Attempt:</strong> ${nextAttemptDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
          ` : ''}
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3>What This Means:</h3>
          <p>Your payment method was declined. This could be due to insufficient funds, an expired card, or other issues with your payment method.</p>
          <p>If we're unable to collect payment, your premium features may be disabled.</p>
        </div>
        
        <div style="background-color: #e9f7ef; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="color: #27ae60; margin-top: 0;">How to Fix This:</h3>
          <ol>
            <li>Go to Profile Settings in the Thoughts With God app</li>
            <li>Tap on 'Manage Subscription'</li>
            <li>Select 'Update Payment Method'</li>
            <li>Enter your updated payment information</li>
          </ol>
        </div>
        
        <div style="text-align: center; color: #777; font-size: 12px; margin-top: 30px;">
          <p>If you have any questions or need assistance, please contact us at support@thoughtswithgod.com</p>
          <p>&copy; ${new Date().getFullYear()} Thoughts With God. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    await emailTransport.sendMail(mailOptions);
    console.log(`Payment failure email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending payment failure email:', error);
    return false;
  }
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
 */
export const sendReceiptEmail = functions.https.onCall(async (data: ReceiptEmailData, context: functions.https.CallableContext) => {
  // Ensure user is authenticated
  if (!context.auth) {
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