import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firebaseFunctions';
import Constants from 'expo-constants';

export interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    price: number;
    priceId?: string; // Stripe Price ID
    features: string[];
    durationMonths: number;
}

export interface PaymentMethod {
    id: string;
    type: 'credit_card' | 'google_pay' | 'apple_pay';
    last4?: string;
}

// Get Stripe publishable key from config
export const STRIPE_PUBLISHABLE_KEY = Constants.expoConfig?.extra?.STRIPE_PUBLISHABLE_KEY || '';

// Available subscription plans
export const subscriptionPlans: SubscriptionPlan[] = [
    {
        id: 'monthly_basic',
        name: 'Monthly Basic',
        description: 'Want to support us?',
        price: 4.99,
        priceId: 'price_basic_monthly', // Update with your actual Stripe Price ID
        features: [
            'This plan helps keep the app running!'
        ],
        durationMonths: 1
    },
    {
        id: 'monthly_premium',
        name: 'Monthly Premium',
        description: 'Enhanced experience with additional features',
        price: 9.99,
        priceId: 'price_premium_monthly', // Update with your actual Stripe Price ID
        features: [
            'Want to support us more? Choose this plan!',
        ],
        durationMonths: 1
    },
    {
        id: 'yearly_premium',
        name: 'Yearly Premium',
        description: 'Our best value plan with 2 months free',
        price: 80.00,
        priceId: 'price_yearly_premium', // Update with your actual Stripe Price ID
        features: [
            'Want to support us even more? Choose this plan!',
        ],
        durationMonths: 12
    }
];

// Create a payment method (for credit cards)
export async function createPaymentMethod(cardDetails: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
}): Promise<string | null> {

    // For now, create a payment method on the server
    try {
        if (!functions) {
            console.error('Firebase functions not initialized');
            return null;
        }

        const createPaymentMethodFunction = httpsCallable(functions, 'createPaymentMethod');
        const result = await createPaymentMethodFunction({
            card: cardDetails
        });

        return (result.data as any).paymentMethodId;
    } catch (error) {
        console.error('Error creating payment method:', error);
        return null;
    }
}

// Create a subscription
export async function createSubscription(
    planId: string,
    paymentMethodId: string,
    customerEmail: string
): Promise<{
    success: boolean;
    subscriptionId?: string;
    error?: string;
}> {
    try {
        if (!functions) {
            return { success: false, error: 'Firebase functions not initialized' };
        }

        const createSubscriptionFunction = httpsCallable(functions, 'createSubscription');
        const result = await createSubscriptionFunction({
            planId,
            paymentMethodId,
            customerEmail
        });

        const data = result.data as any;

        return {
            success: true,
            subscriptionId: data.subscriptionId
        };
    } catch (error: any) {
        console.error('Error creating subscription:', error);
        return {
            success: false,
            error: error.message || 'Failed to create subscription'
        };
    }
}

// Cancel a subscription
export async function cancelSubscription(): Promise<boolean> {
    try {
        if (!functions) {
            console.error('Firebase functions not initialized');
            return false;
        }

        const cancelSubscriptionFunction = httpsCallable(functions, 'cancelSubscription');
        await cancelSubscriptionFunction({});

        return true;
    } catch (error) {
        console.error('Error canceling subscription:', error);
        return false;
    }
}

// Validate subscription status
export async function validateSubscription(): Promise<{
    active: boolean;
    plan?: string;
    endDate?: string;
    autoRenew?: boolean;
}> {
    try {
        if (!functions) {
            return { active: false };
        }

        const validateSubscriptionFunction = httpsCallable(functions, 'validateSubscription');
        const result = await validateSubscriptionFunction({});

        return result.data as any;
    } catch (error) {
        console.error('Error validating subscription:', error);
        return { active: false };
    }
}

// Process a one-time payment (for future use)
export async function processPayment(
    amount: number,
    paymentMethodId: string,
    description: string
): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
}> {
    try {
        if (!functions) {
            return { success: false, error: 'Firebase functions not initialized' };
        }

        const createPaymentIntentFunction = httpsCallable(functions, 'createPaymentIntent');
        const result = await createPaymentIntentFunction({
            amount,
            currency: 'usd',
            paymentMethodId,
            description
        });

        const data = result.data as any;

        return {
            success: true,
            transactionId: data.transactionId
        };
    } catch (error: any) {
        console.error('Error processing payment:', error);
        return {
            success: false,
            error: error.message || 'Payment failed'
        };
    }
}

// Get customer's payment methods
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
        if (!functions) {
            return [];
        }

        const getPaymentMethodsFunction = httpsCallable(functions, 'getPaymentMethods');
        const result = await getPaymentMethodsFunction({});

        return (result.data as any).paymentMethods || [];
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        return [];
    }
}

// Update default payment method
export async function updateDefaultPaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
        if (!functions) {
            return false;
        }

        const updatePaymentMethodFunction = httpsCallable(functions, 'updateDefaultPaymentMethod');
        await updatePaymentMethodFunction({ paymentMethodId });

        return true;
    } catch (error) {
        console.error('Error updating payment method:', error);
        return false;
    }
}