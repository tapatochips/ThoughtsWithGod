

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import * as nodemailer from 'nodemailer';

// Initialize Firebase Admin (only once)
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// Initialize Stripe 
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16', 
});

// Email configuration
const emailTransport = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'thoughtswithgod@gmail.com',
        pass: process.env.EMAIL_PASS || '', // Use app password
    },
});

// =================== SUBSCRIPTION FUNCTIONS ===================

interface CreateSubscriptionData {
    planId: string;
    paymentMethodId: string;
    customerEmail: string;
}

export const createSubscription = onCall<CreateSubscriptionData>(
    {
        cors: true,
        secrets: ['STRIPE_SECRET_KEY'], // This tells Firebase to inject the secret
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in to create subscription');
        }

        const { planId, paymentMethodId, customerEmail } = request.data;
        const userId = request.auth.uid;

        try {
            // Simple plan mapping
            const planPrices: Record<string, { priceId: string; amount: number }> = {
                'monthly_basic': { priceId: 'price_basic_monthly', amount: 499 },
                'monthly_premium': { priceId: 'price_premium_monthly', amount: 999 },
                'yearly_premium': { priceId: 'price_yearly_premium', amount: 9999 },
            };

            const plan = planPrices[planId];
            if (!plan) {
                throw new HttpsError('invalid-argument', 'Invalid subscription plan');
            }

            // Check if customer exists in Firestore
            const userDoc = await admin.firestore().collection('users').doc(userId).get();
            let customerId = userDoc.data()?.stripeCustomerId;

            if (!customerId) {
                // Create new Stripe customer
                const customer = await stripe.customers.create({
                    email: customerEmail,
                    payment_method: paymentMethodId,
                    invoice_settings: { default_payment_method: paymentMethodId },
                    metadata: { userId },
                });
                customerId = customer.id;

                // Save to Firestore
                await admin.firestore().collection('users').doc(userId).set(
                    { stripeCustomerId: customerId },
                    { merge: true }
                );
            } else {
                // Update existing customer payment method
                await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
                await stripe.customers.update(customerId, {
                    invoice_settings: { default_payment_method: paymentMethodId },
                });
            }

            // Create subscription
            const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: plan.priceId }],
                expand: ['latest_invoice.payment_intent'],
                metadata: { userId, planId },
            });

            // Calculate end date
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + (planId.includes('yearly') ? 12 : 1));

            // Save subscription to Firestore
            await admin.firestore().collection('subscriptions').doc(userId).set({
                userId,
                planId,
                status: 'active',
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: customerId,
                startDate: admin.firestore.Timestamp.now(),
                endDate: admin.firestore.Timestamp.fromDate(endDate),
                autoRenew: true,
                paymentMethod: {
                    id: paymentMethodId,
                    type: 'credit_card',
                },
            });

            return {
                subscriptionId: subscription.id,
                stripeCustomerId: customerId,
            };
        } catch (error) {
            console.error('Subscription creation failed:', error);
            throw new HttpsError('internal', 'Subscription creation failed');
        }
    }
);

// =================== PAYMENT FUNCTIONS ===================

interface PaymentIntentData {
    amount: number;
    currency: string;
    paymentMethodId: string;
    description: string;
    metadata?: Record<string, string>;
    receiptEmail?: string;
}

export const createPaymentIntent = onCall<PaymentIntentData>(
    {
        cors: true,
        secrets: ['STRIPE_SECRET_KEY'],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in');
        }

        const { amount, currency, paymentMethodId, description, metadata, receiptEmail } = request.data;

        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Convert to cents
                currency,
                payment_method: paymentMethodId,
                confirm: true,
                automatic_payment_methods: { enabled: true },
                description,
                metadata: {
                    ...metadata,
                    userId: request.auth.uid,
                },
                receipt_email: receiptEmail,
            });

            return {
                clientSecret: paymentIntent.client_secret,
                transactionId: paymentIntent.id,
            };
        } catch (error) {
            console.error('Payment intent creation failed:', error);
            throw new HttpsError('internal', 'Payment processing failed');
        }
    }
);

// =================== SUBSCRIPTION MANAGEMENT ===================

export const cancelSubscription = onCall(
    {
        cors: true,
        secrets: ['STRIPE_SECRET_KEY'],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in');
        }

        const userId = request.auth.uid;

        try {
            // Get subscription from Firestore
            const subscriptionDoc = await admin.firestore().collection('subscriptions').doc(userId).get();
            if (!subscriptionDoc.exists) {
                throw new HttpsError('not-found', 'No active subscription found');
            }

            const subscriptionData = subscriptionDoc.data();
            const stripeSubscriptionId = subscriptionData?.stripeSubscriptionId;

            if (!stripeSubscriptionId) {
                throw new HttpsError('not-found', 'No Stripe subscription ID found');
            }

            // Cancel subscription with Stripe (at period end)
            await stripe.subscriptions.update(stripeSubscriptionId, {
                cancel_at_period_end: true,
            });

            // Update Firestore
            await admin.firestore().collection('subscriptions').doc(userId).update({
                status: 'canceled',
                autoRenew: false,
            });

            return { success: true };
        } catch (error) {
            console.error('Subscription cancellation failed:', error);
            throw new HttpsError('internal', 'Subscription cancellation failed');
        }
    }
);

// =================== EMAIL FUNCTIONS ===================

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

export const sendReceiptEmail = onCall<ReceiptEmailData>(
    {
        secrets: ['EMAIL_USER', 'EMAIL_PASS'],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in');
        }

        const { email, purchaseDetails } = request.data;
        const { amount, transactionId, purchaseDate, productName, description } = purchaseDetails;

        try {
            const mailOptions = {
                from: '"Thoughts With God" <thoughtswithgod@gmail.com>',
                to: email,
                subject: 'Your Thoughts With God Receipt',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #5271FF; text-align: center;">Thoughts With God</h1>
            <h2>Receipt for Your Purchase</h2>
            
            <div style="background-color: #f7f9fc; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Purchase Details</h3>
              <p><strong>Item:</strong> ${productName}</p>
              <p><strong>Description:</strong> ${description}</p>
              <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</p>
              <p><strong>Transaction ID:</strong> ${transactionId}</p>
              <p><strong>Date:</strong> ${new Date(purchaseDate).toLocaleDateString()}</p>
            </div>
            
            <p style="text-align: center; color: #777; font-size: 12px;">
              Thank you for your purchase! If you have any questions, please contact support@thoughtswithgod.com
            </p>
          </div>
        `,
            };

            await emailTransport.sendMail(mailOptions);
            return { success: true };
        } catch (error) {
            console.error('Error sending receipt email:', error);
            throw new HttpsError('internal', 'Failed to send receipt email');
        }
    }
);

// =================== VALIDATION FUNCTIONS ===================

export const validateSubscription = onCall(
    {
        cors: true,
        secrets: ['STRIPE_SECRET_KEY'],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in');
        }

        const userId = request.auth.uid;

        try {
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
            const isActive = subscription.status === 'active' || subscription.status === 'trialing';

            // Check if subscription end date is in the future
            const now = admin.firestore.Timestamp.now();
            const endDate = subscriptionData.endDate;
            const isNotExpired = endDate.toMillis() > now.toMillis();

            return {
                active: isActive && isNotExpired,
                plan: subscriptionData.planId,
                endDate: endDate.toDate().toISOString(),
                autoRenew: subscriptionData.autoRenew,
            };
        } catch (error) {
            console.error('Subscription validation failed:', error);
            return { active: false };
        }
    }
);

// =================== FIRESTORE TRIGGERS ===================

// Auto-create user profile when user document is created
export const createUserProfile = onDocumentCreated(
    'users/{userId}',
    async (event) => {
        const userId = event.params.userId;
        const userData = event.data?.data();

        if (!userData) return;

        try {
            await admin.firestore().collection('userProfiles').doc(userId).set({
                userId,
                email: userData.email || '',
                username: userData.email?.split('@')[0] || `user_${userId.substring(0, 5)}`,
                createdAt: admin.firestore.Timestamp.now(),
                preferences: {
                    theme: 'light',
                    fontSize: 'medium',
                },
            });

            console.log(`User profile created for ${userId}`);
        } catch (error) {
            console.error('Failed to create user profile:', error);
        }
    }
);