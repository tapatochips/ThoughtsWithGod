import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import * as nodemailer from 'nodemailer';

// Initialize Firebase Admin (only once)
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// Initialize Stripe with proper configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-11-20.acacia' as Stripe.LatestApiVersion,
});

// Email configuration
const emailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'thoughtwithgod@gmail.com',
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
        secrets: ['STRIPE_SECRET_KEY'],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in to create subscription');
        }

        const { planId, paymentMethodId, customerEmail } = request.data;
        const userId = request.auth.uid;

        try {
            // Plan mapping 
            const planPrices: Record<string, { priceId: string; amount: number }> = {
                'monthly_basic': { priceId: 'price_XXXXXXXXXXXXX', amount: 499 },
                'monthly_premium': { priceId: 'price_XXXXXXXXXXXXX', amount: 999 },
                'yearly_premium': { priceId: 'price_XXXXXXXXXXXXX', amount: 9999 },
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

            // Update user profile premium status
            await admin.firestore().collection('userProfiles').doc(userId).update({
                isPremium: true,
                premiumPlan: planId,
                premiumExpiry: admin.firestore.Timestamp.fromDate(endDate),
                premiumUpdatedAt: admin.firestore.Timestamp.now(),
            });

            return {
                subscriptionId: subscription.id,
                stripeCustomerId: customerId,
            };
        } catch (error: any) {
            console.error('Subscription creation failed:', error);
            throw new HttpsError('internal', error.message || 'Subscription creation failed');
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
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never'
                },
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
        } catch (error: any) {
            console.error('Payment intent creation failed:', error);
            throw new HttpsError('internal', error.message || 'Payment processing failed');
        }
    }
);

// Create a payment method (for testing - in production use Stripe SDK on client)
interface CreatePaymentMethodData {
    card: {
        number: string;
        expMonth: number;
        expYear: number;
        cvc: string;
    };
}

export const createPaymentMethod = onCall<CreatePaymentMethodData>(
    {
        cors: true,
        secrets: ['STRIPE_SECRET_KEY'],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in');
        }

        const { card } = request.data;

        try {
            // WARNING: This is for testing only!
            // In production, use Stripe Elements or React Native SDK on the client
            const paymentMethod = await stripe.paymentMethods.create({
                type: 'card',
                card: {
                    number: card.number,
                    exp_month: card.expMonth,
                    exp_year: card.expYear,
                    cvc: card.cvc,
                },
            });

            return {
                paymentMethodId: paymentMethod.id,
            };
        } catch (error: any) {
            console.error('Error creating payment method:', error);
            throw new HttpsError('internal', error.message || 'Failed to create payment method');
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
                canceledAt: admin.firestore.Timestamp.now(),
            });

            return { success: true };
        } catch (error: any) {
            console.error('Subscription cancellation failed:', error);
            throw new HttpsError('internal', error.message || 'Subscription cancellation failed');
        }
    }
);

// Toggle auto-renewal
interface ToggleAutoRenewData {
    autoRenew: boolean;
}

export const toggleAutoRenew = onCall<ToggleAutoRenewData>(
    {
        cors: true,
        secrets: ['STRIPE_SECRET_KEY'],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in');
        }

        const { autoRenew } = request.data;
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

            // Update subscription in Stripe
            await stripe.subscriptions.update(stripeSubscriptionId, {
                cancel_at_period_end: !autoRenew,
            });

            // Update Firestore
            await admin.firestore().collection('subscriptions').doc(userId).update({
                autoRenew,
            });

            return { success: true };
        } catch (error: any) {
            console.error('Error toggling auto-renew:', error);
            throw new HttpsError('internal', error.message || 'Failed to update auto-renewal');
        }
    }
);

// =================== PAYMENT METHOD FUNCTIONS ===================

// Get customer's payment methods
export const getPaymentMethods = onCall(
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
            // Get customer ID from Firestore
            const userDoc = await admin.firestore().collection('users').doc(userId).get();
            const customerId = userDoc.data()?.stripeCustomerId;

            if (!customerId) {
                return { paymentMethods: [] };
            }

            // Get payment methods from Stripe
            const paymentMethods = await stripe.paymentMethods.list({
                customer: customerId,
                type: 'card',
            });

            return {
                paymentMethods: paymentMethods.data.map(pm => ({
                    id: pm.id,
                    type: 'credit_card',
                    last4: pm.card?.last4,
                    brand: pm.card?.brand,
                })),
            };
        } catch (error: any) {
            console.error('Error fetching payment methods:', error);
            throw new HttpsError('internal', error.message || 'Failed to fetch payment methods');
        }
    }
);

// Update default payment method
interface UpdatePaymentMethodData {
    paymentMethodId: string;
}

export const updateDefaultPaymentMethod = onCall<UpdatePaymentMethodData>(
    {
        cors: true,
        secrets: ['STRIPE_SECRET_KEY'],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in');
        }

        const { paymentMethodId } = request.data;
        const userId = request.auth.uid;

        try {
            // Get customer ID from Firestore
            const userDoc = await admin.firestore().collection('users').doc(userId).get();
            const customerId = userDoc.data()?.stripeCustomerId;

            if (!customerId) {
                throw new HttpsError('not-found', 'Customer not found');
            }

            // Update default payment method in Stripe
            await stripe.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });

            return { success: true };
        } catch (error: any) {
            console.error('Error updating payment method:', error);
            throw new HttpsError('internal', error.message || 'Failed to update payment method');
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
            const isNotExpired = endDate && endDate.toMillis() > now.toMillis();

            return {
                active: isActive && isNotExpired,
                plan: subscriptionData.planId,
                endDate: endDate?.toDate().toISOString(),
                autoRenew: subscriptionData.autoRenew ?? true,
            };
        } catch (error: any) {
            console.error('Subscription validation failed:', error);
            return { active: false };
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
        cors: true,
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
        } catch (error: any) {
            console.error('Error sending receipt email:', error);
            throw new HttpsError('internal', error.message || 'Failed to send receipt email');
        }
    }
);

// =================== STRIPE WEBHOOK ===================

export const stripeWebhook = onRequest(
    {
        cors: false,
        secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    },
    async (request, response) => {
        const sig = request.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!sig || !endpointSecret) {
            response.status(400).send('Missing signature or secret');
            return;
        }

        let event: Stripe.Event;

        try {
            // Use request.rawBody if available, otherwise request.body
            const payload = (request as any).rawBody || request.body;
            event = stripe.webhooks.constructEvent(
                payload,
                sig,
                endpointSecret
            );
        } catch (err: any) {
            console.error('Webhook signature verification failed:', err.message);
            response.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }

        // Handle the event
        try {
            switch (event.type) {
                case 'customer.subscription.created':
                case 'customer.subscription.updated': {
                    const subscription = event.data.object as Stripe.Subscription;
                    const userId = subscription.metadata.userId;

                    if (userId) {
                        await admin.firestore().collection('subscriptions').doc(userId).set({
                            status: subscription.status,
                            currentPeriodEnd: new Date((subscription.current_period_end as number)* 1000),
                            cancelAtPeriodEnd: subscription.cancel_at_period_end,
                            planId: subscription.metadata.planId,
                            stripeSubscriptionId: subscription.id,
                            stripeCustomerId: subscription.customer as string,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        }, { merge: true });

                        // Update user profile premium status
                        await admin.firestore().collection('userProfiles').doc(userId).update({
                            isPremium: subscription.status === 'active',
                            premiumPlan: subscription.metadata.planId,
                            premiumExpiry: admin.firestore.Timestamp.fromDate(new Date((subscription.current_period_end as number) * 1000)),
                            premiumUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                    }
                    break;
                }

                case 'customer.subscription.deleted': {
                    const subscription = event.data.object as Stripe.Subscription;
                    const userId = subscription.metadata.userId;

                    if (userId) {
                        await admin.firestore().collection('subscriptions').doc(userId).update({
                            status: 'canceled',
                            canceledAt: admin.firestore.FieldValue.serverTimestamp(),
                        });

                        // Update user profile premium status
                        await admin.firestore().collection('userProfiles').doc(userId).update({
                            isPremium: false,
                            premiumPlan: null,
                            premiumExpiry: null,
                            premiumUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                    }
                    break;
                }

                case 'invoice.payment_succeeded': {
                    const invoice = event.data.object as Stripe.Invoice;
                    console.log('Payment succeeded for invoice:', invoice.id);

                    // Send receipt email if configured
                    if (invoice.customer_email && invoice.id) {
                        const receiptData: ReceiptEmailData = {
                            email: invoice.customer_email,
                            purchaseDetails: {
                                amount: invoice.amount_paid,
                                transactionId: invoice.id,
                                purchaseDate: new Date(invoice.created * 1000).toISOString(),
                                productName: 'ThoughtsWithGod Subscription',
                                description: invoice.description || 'Monthly subscription',
                            }
                        };

                        // Call sendReceiptEmail function
                        try {
                            await sendReceiptEmail.run({
                                data: receiptData,
                                auth: { uid: 'system' }
                            } as any);
                        } catch (error) {
                            console.error('Failed to send receipt email:', error);
                        }
                    }
                    break;
                }

                case 'invoice.payment_failed': {
                    const invoice = event.data.object as Stripe.Invoice;
                    const customerId = invoice.customer as string;

                    console.log('Payment failed for invoice:', invoice.id);

                    // Find user by Stripe customer ID
                    const usersSnapshot = await admin.firestore()
                        .collection('users')
                        .where('stripeCustomerId', '==', customerId)
                        .limit(1)
                        .get();

                    if (!usersSnapshot.empty) {
                        const userId = usersSnapshot.docs[0].id;

                        // Update subscription status
                        await admin.firestore().collection('subscriptions').doc(userId).update({
                            paymentStatus: 'failed',
                            lastPaymentFailure: admin.firestore.FieldValue.serverTimestamp(),
                        });
                    }
                    break;
                }

                default:
                    console.log(`Unhandled event type ${event.type}`);
            }

            response.json({ received: true });
        } catch (error) {
            console.error('Error processing webhook:', error);
            response.status(500).send('Webhook processing failed');
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
            const existingProfile = await admin.firestore()
                .collection('userProfiles')
                .doc(userId)
                .get();

            if (!existingProfile.exists) {
                await admin.firestore().collection('userProfiles').doc(userId).set({
                    userId,
                    email: userData.email || '',
                    username: userData.email?.split('@')[0] || `user_${userId.substring(0, 5)}`,
                    createdAt: admin.firestore.Timestamp.now(),
                    isPremium: false,
                    preferences: {
                        theme: 'light',
                        fontSize: 'medium',
                        reminders: false,
                    },
                });

                console.log(`User profile created for ${userId}`);
            }
        } catch (error) {
            console.error('Failed to create user profile:', error);
        }
    }
);