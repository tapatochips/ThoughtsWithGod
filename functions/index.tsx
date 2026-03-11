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

// CORS config — must be declared before any onCall() usage to avoid
// a temporal dead zone error when the module is loaded for analysis.
// Localhost origins are only allowed when running the local emulator.
const PRODUCTION_ORIGINS = [
    'https://thoughtswithgod.com',
    'https://www.thoughtswithgod.com',
];

function getCorsConfig() {
    // When running under the Firebase emulator, allow all origins (true).
    // In production, restrict to the explicit allow-list only.
    const isDev = process.env.FUNCTIONS_EMULATOR === 'true';
    return isDev ? true : PRODUCTION_ORIGINS;
}

// Stripe and nodemailer are initialized lazily so that the Firebase CLI can
// analyze the functions source without secrets being present at load time.
// Secrets are only injected when a handler actually runs.

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
    if (!_stripe) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) throw new HttpsError('internal', 'Payment service is not configured');
        _stripe = new Stripe(key, {
            apiVersion: '2024-11-20.acacia' as Stripe.LatestApiVersion,
        });
    }
    return _stripe;
}

let _emailTransport: ReturnType<typeof nodemailer.createTransport> | null = null;
function getEmailTransport(): ReturnType<typeof nodemailer.createTransport> {
    if (!_emailTransport) {
        const user = process.env.EMAIL_USER || 'thoughtwithgod@gmail.com';
        const pass = process.env.EMAIL_PASS;
        if (!pass) throw new HttpsError('internal', 'Email service is not configured');
        _emailTransport = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass },
        });
    }
    return _emailTransport;
}

// =================== SUBSCRIPTION FUNCTIONS ===================

interface CreateSubscriptionData {
    planId: string;
    paymentMethodId: string;
    customerEmail: string;
}

export const createSubscription = onCall<CreateSubscriptionData>(
    {
        cors: getCorsConfig(),
        secrets: ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_MONTHLY_BASIC', 'STRIPE_PRICE_MONTHLY_PREMIUM', 'STRIPE_PRICE_MONTHLY_PRO', 'STRIPE_PRICE_YEARLY_PREMIUM'],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in to create subscription');
        }

        const { planId, paymentMethodId, customerEmail } = request.data;
        const userId = request.auth.uid;

        try {
            // Plan mapping — price IDs are stored as Cloud Function secrets so they
            // are never hard-coded in source and cannot be changed without a deploy.
            const planPrices: Record<string, { priceId: string; amount: number }> = {
                'monthly_basic': { priceId: process.env.STRIPE_PRICE_MONTHLY_BASIC || '', amount: 499 },
                'monthly_premium': { priceId: process.env.STRIPE_PRICE_MONTHLY_PREMIUM || '', amount: 999 },
                'monthly_pro': { priceId: process.env.STRIPE_PRICE_MONTHLY_PRO || '', amount: 2000 },
                'yearly_premium': { priceId: process.env.STRIPE_PRICE_YEARLY_PREMIUM || '', amount: 9999 },
            };

            const plan = planPrices[planId];
            if (!plan) {
                throw new HttpsError('invalid-argument', 'Invalid subscription plan');
            }

            if (!plan.priceId) {
                console.error(`Stripe price ID not configured for plan: ${planId}`);
                throw new HttpsError('internal', 'Subscription plan is not configured. Please contact support.');
            }

            // Check if customer exists in Firestore
            const userDoc = await admin.firestore().collection('users').doc(userId).get();
            let customerId = userDoc.data()?.stripeCustomerId;

            if (!customerId) {
                // Create new Stripe customer
                const customer = await getStripe().customers.create({
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
                await getStripe().paymentMethods.attach(paymentMethodId, { customer: customerId });
                await getStripe().customers.update(customerId, {
                    invoice_settings: { default_payment_method: paymentMethodId },
                });
            }

            // Create subscription
            const subscription = await getStripe().subscriptions.create({
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
            throw new HttpsError('internal', 'Subscription creation failed. Please try again.');
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
        cors: getCorsConfig(),
        secrets: ['STRIPE_SECRET_KEY'],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in');
        }

        const { amount, currency, paymentMethodId, description, metadata, receiptEmail } = request.data;

        try {
            const paymentIntent = await getStripe().paymentIntents.create({
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
            throw new HttpsError('internal', 'Payment processing failed. Please try again.');
        }
    }
);

// NOTE: Payment methods should be created client-side using Stripe Elements or
// React Native Stripe SDK for PCI-DSS compliance. Never handle raw card data
// on the server. The client should use @stripe/stripe-react-native to create
// payment methods and pass the paymentMethodId to the server.

// =================== SUBSCRIPTION MANAGEMENT ===================

export const cancelSubscription = onCall(
    {
        cors: getCorsConfig(),
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
            await getStripe().subscriptions.update(stripeSubscriptionId, {
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
            throw new HttpsError('internal', 'Subscription cancellation failed. Please try again.');
        }
    }
);

// Toggle auto-renewal
interface ToggleAutoRenewData {
    autoRenew: boolean;
}

export const toggleAutoRenew = onCall<ToggleAutoRenewData>(
    {
        cors: getCorsConfig(),
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
            await getStripe().subscriptions.update(stripeSubscriptionId, {
                cancel_at_period_end: !autoRenew,
            });

            // Update Firestore
            await admin.firestore().collection('subscriptions').doc(userId).update({
                autoRenew,
            });

            return { success: true };
        } catch (error: any) {
            console.error('Error toggling auto-renew:', error);
            throw new HttpsError('internal', 'Failed to update auto-renewal. Please try again.');
        }
    }
);

// =================== PAYMENT METHOD FUNCTIONS ===================

// Get customer's payment methods
export const getPaymentMethods = onCall(
    {
        cors: getCorsConfig(),
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
            const paymentMethods = await getStripe().paymentMethods.list({
                customer: customerId,
                type: 'card',
            });

            return {
                paymentMethods: paymentMethods.data.map((pm: Stripe.PaymentMethod) => ({
                    id: pm.id,
                    type: 'credit_card',
                    last4: pm.card?.last4,
                    brand: pm.card?.brand,
                })),
            };
        } catch (error: any) {
            console.error('Error fetching payment methods:', error);
            throw new HttpsError('internal', 'Failed to fetch payment methods. Please try again.');
        }
    }
);

// Update default payment method
interface UpdatePaymentMethodData {
    paymentMethodId: string;
}

export const updateDefaultPaymentMethod = onCall<UpdatePaymentMethodData>(
    {
        cors: getCorsConfig(),
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
            await getStripe().customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });

            return { success: true };
        } catch (error: any) {
            console.error('Error updating payment method:', error);
            throw new HttpsError('internal', 'Failed to update payment method. Please try again.');
        }
    }
);

// =================== VALIDATION FUNCTIONS ===================

/**
 * Server-side premium status validation
 * This function validates premium status against both Firestore AND Stripe
 * to prevent client-side bypass attacks
 */
export const validateSubscription = onCall(
    {
        cors: getCorsConfig(),
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
                // Also check userProfiles and sync if needed
                await syncPremiumStatus(userId, false);
                return { active: false };
            }

            const subscriptionData = subscriptionDoc.data();
            const stripeSubscriptionId = subscriptionData?.stripeSubscriptionId;

            if (!stripeSubscriptionId) {
                await syncPremiumStatus(userId, false);
                return { active: false };
            }

            // Validate with Stripe (source of truth)
            const subscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId);
            const isActive = subscription.status === 'active' || subscription.status === 'trialing';

            // If Stripe says inactive, update our records
            if (!isActive) {
                await syncPremiumStatus(userId, false);
                return { active: false };
            }

            // Check if subscription end date is in the future
            const now = admin.firestore.Timestamp.now();
            const endDate = subscriptionData.endDate;
            const isNotExpired = endDate && endDate.toMillis() > now.toMillis();

            // Sync status if needed
            if (!isNotExpired) {
                await syncPremiumStatus(userId, false);
            }

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

/**
 * Check if user has premium access for a specific feature
 * Use this before allowing access to premium-only features
 */
export const checkPremiumAccess = onCall(
    {
        cors: getCorsConfig(),
        secrets: ['STRIPE_SECRET_KEY'],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in');
        }

        const userId = request.auth.uid;
        const { feature } = request.data as { feature?: string };

        try {
            // Get subscription status
            const subscriptionDoc = await admin.firestore().collection('subscriptions').doc(userId).get();

            if (!subscriptionDoc.exists) {
                return { hasAccess: false, reason: 'no_subscription' };
            }

            const subscriptionData = subscriptionDoc.data();

            // Check status
            if (subscriptionData?.status !== 'active') {
                return { hasAccess: false, reason: 'subscription_inactive' };
            }

            // Check expiry
            const now = admin.firestore.Timestamp.now();
            const endDate = subscriptionData?.endDate;
            if (endDate && endDate.toMillis() < now.toMillis()) {
                // Expired - update status and deny access
                await syncPremiumStatus(userId, false);
                return { hasAccess: false, reason: 'subscription_expired' };
            }

            // Validate with Stripe for extra security on sensitive features
            if (feature === 'sensitive' && subscriptionData?.stripeSubscriptionId) {
                const subscription = await getStripe().subscriptions.retrieve(subscriptionData.stripeSubscriptionId);
                if (subscription.status !== 'active' && subscription.status !== 'trialing') {
                    await syncPremiumStatus(userId, false);
                    return { hasAccess: false, reason: 'stripe_validation_failed' };
                }
            }

            return {
                hasAccess: true,
                plan: subscriptionData?.planId,
                expiresAt: endDate?.toDate().toISOString(),
            };
        } catch (error: any) {
            console.error('Premium access check failed:', error);
            return { hasAccess: false, reason: 'error' };
        }
    }
);

/**
 * Helper function to sync premium status in userProfiles
 * This ensures the client-side cached status matches server reality
 */
async function syncPremiumStatus(userId: string, isPremium: boolean, plan?: string, expiry?: Date): Promise<void> {
    try {
        const updateData: Record<string, any> = {
            isPremium,
            premiumUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (isPremium && plan) {
            updateData.premiumPlan = plan;
        } else if (!isPremium) {
            updateData.premiumPlan = null;
        }

        if (isPremium && expiry) {
            updateData.premiumExpiry = admin.firestore.Timestamp.fromDate(expiry);
        } else if (!isPremium) {
            updateData.premiumExpiry = null;
        }

        await admin.firestore().collection('userProfiles').doc(userId).update(updateData);
    } catch (error) {
        console.error('Failed to sync premium status:', error);
    }
}

// =================== EMAIL FUNCTIONS ===================

interface ReceiptEmailData {
    purchaseDetails: {
        amount: number;
        transactionId: string;
        purchaseDate: string;
        productName: string;
        description: string;
    };
}

/** Escape untrusted strings before embedding in HTML. */
function escapeHtml(value: string): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Internal helper — used by both the callable and the Stripe webhook.
 * `to` must come from a trusted source (auth token or Stripe invoice); never
 * pass a value that originated directly from an unverified client request.
 */
async function sendReceiptEmailInternal(
    to: string,
    purchaseDetails: ReceiptEmailData['purchaseDetails']
): Promise<void> {
    const { amount, transactionId, purchaseDate, productName, description } = purchaseDetails;

    const mailOptions = {
        from: '"Thoughts With God" <thoughtswithgod@gmail.com>',
        to,
        subject: 'Your Thoughts With God Receipt',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #5271FF; text-align: center;">Thoughts With God</h1>
                <h2>Receipt for Your Purchase</h2>

                <div style="background-color: #f7f9fc; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3>Purchase Details</h3>
                    <p><strong>Item:</strong> ${escapeHtml(productName)}</p>
                    <p><strong>Description:</strong> ${escapeHtml(description)}</p>
                    <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</p>
                    <p><strong>Transaction ID:</strong> ${escapeHtml(transactionId)}</p>
                    <p><strong>Date:</strong> ${escapeHtml(new Date(purchaseDate).toLocaleDateString())}</p>
                </div>

                <p style="text-align: center; color: #777; font-size: 12px;">
                    Thank you for your purchase! If you have any questions, please contact support@thoughtswithgod.com
                </p>
            </div>
        `,
    };

    await getEmailTransport().sendMail(mailOptions);
}

export const sendReceiptEmail = onCall<ReceiptEmailData>(
    {
        cors: getCorsConfig(),
        secrets: ['EMAIL_USER', 'EMAIL_PASS'],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in');
        }

        // Use the email from the verified auth token — never trust the client-
        // supplied email field, which could target arbitrary addresses.
        const toEmail = request.auth.token.email;
        if (!toEmail) {
            throw new HttpsError('invalid-argument', 'No verified email address on file for this account');
        }

        const { purchaseDetails } = request.data;

        try {
            await sendReceiptEmailInternal(toEmail, purchaseDetails);
            return { success: true };
        } catch (error: any) {
            console.error('Error sending receipt email:', error);
            throw new HttpsError('internal', 'Failed to send receipt email. Please try again.');
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
            event = getStripe().webhooks.constructEvent(
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
                        // current_period_end was removed from Stripe's TypeScript types in
                        // API version 2024-09-30+ but the field is still present in the
                        // response object at runtime. Cast via unknown to satisfy the compiler.
                        const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

                        await admin.firestore().collection('subscriptions').doc(userId).set({
                            status: subscription.status,
                            currentPeriodEnd: new Date(periodEnd * 1000),
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
                            premiumExpiry: admin.firestore.Timestamp.fromDate(new Date(periodEnd * 1000)),
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
                        // Call internal helper directly — the email comes from Stripe
                        // (trusted server-side source), so no client spoofing risk here.
                        try {
                            await sendReceiptEmailInternal(invoice.customer_email, {
                                amount: invoice.amount_paid,
                                transactionId: invoice.id,
                                purchaseDate: new Date(invoice.created * 1000).toISOString(),
                                productName: 'ThoughtsWithGod Subscription',
                                description: invoice.description || 'Monthly subscription',
                            });
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

// =================== ACCOUNT DELETION ===================

/**
 * Permanently deletes all data for the authenticated user and their Firebase Auth account.
 * Required by Apple App Store (guideline 5.1.1) and Google Play since Dec 2023.
 *
 * Deletes (in order):
 *   1. Active Stripe subscription (cancel immediately)
 *   2. All Firestore collections owned by the user
 *   3. Firebase Auth account
 */
export const deleteAccount = onCall(
    {
        cors: getCorsConfig(),
        secrets: ['STRIPE_SECRET_KEY'],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in');
        }

        const userId = request.auth.uid;
        const db = admin.firestore();

        // 1. Cancel any active Stripe subscription immediately
        try {
            const subscriptionDoc = await db.collection('subscriptions').doc(userId).get();
            if (subscriptionDoc.exists) {
                const stripeSubscriptionId = subscriptionDoc.data()?.stripeSubscriptionId;
                if (stripeSubscriptionId) {
                    await getStripe().subscriptions.cancel(stripeSubscriptionId);
                }
            }
        } catch (err) {
            // Log but don't block deletion — Stripe subscription may already be cancelled
            console.error('deleteAccount: Stripe cancellation error (continuing):', err);
        }

        // 2. Delete all Firestore data for this user
        const collectionsToDelete = [
            db.collection('users').doc(userId),
            db.collection('userProfiles').doc(userId),
            db.collection('subscriptions').doc(userId),
            db.collection('rateLimits').doc(userId),
        ];

        // Delete subcollections of the user document
        const subcollections = ['favorites', 'readingProgress', 'favoriteVerses', 'ownedPrayers'];
        for (const sub of subcollections) {
            try {
                const snap = await db.collection(`users/${userId}/${sub}`).get();
                const batch = db.batch();
                snap.docs.forEach(d => batch.delete(d.ref));
                if (!snap.empty) await batch.commit();
            } catch (err) {
                console.error(`deleteAccount: failed to delete subcollection ${sub}:`, err);
            }
        }

        // Delete top-level documents in a single batch
        const batch = db.batch();
        collectionsToDelete.forEach(ref => batch.delete(ref));
        await batch.commit();

        // 3. Delete the Firebase Auth account last (invalidates all tokens)
        await admin.auth().deleteUser(userId);

        return { success: true };
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