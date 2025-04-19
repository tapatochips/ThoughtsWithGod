
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './firebaseConfig';
import { functions, httpsCallable } from './firebaseFunctions';
import { createPaymentMethod, createSubscription as stripeCreateSubscription } from '../payment/revenueCatService';
import { formatDate } from '../../utils/paymentUtils';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  durationMonths: number;
}

export interface Subscription {
  userId: string;
  planId: string;
  status: 'active' | 'expired' | 'canceled';
  startDate: Timestamp;
  endDate: Timestamp;
  autoRenew: boolean;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  paymentMethod?: {
    id: string;
    type: 'credit_card' | 'google_pay' | 'apple_pay';
    last4?: string; // Last 4 digits if credit card
  };
  transactionId?: string;
}

// Available subscription plans
export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'monthly_basic',
    name: 'Monthly Basic',
    description: 'Access to all premium features for 1 month',
    price: 4.99,
    features: [
      'Ad-free experience',
      'Unlimited favorite verses',
      'Personalized daily verses',
      'Prayer board access'
    ],
    durationMonths: 1
  },
  {
    id: 'monthly_premium',
    name: 'Monthly Premium',
    description: 'Enhanced experience with additional features',
    price: 9.99,
    features: [
      'All Basic features',
      'Audio Bible readings',
      'Advanced Bible study tools',
      'Downloadable content for offline use',
      'Priority support'
    ],
    durationMonths: 1
  },
  {
    id: 'yearly_premium',
    name: 'Yearly Premium',
    description: 'Our best value plan with 2 months free',
    price: 99.99,
    features: [
      'All Premium features',
      'Two months free (compared to monthly)',
      'Early access to new features',
      'Annual spiritual growth report'
    ],
    durationMonths: 12
  }
];

// Get user's current subscription status
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  if (!db) return null;
  
  const subscriptionRef = doc(db, 'subscriptions', userId);
  const subscriptionDoc = await getDoc(subscriptionRef);
  
  if (subscriptionDoc.exists()) {
    const subscription = subscriptionDoc.data() as Subscription;
    
    // Check if subscription is expired
    const now = Timestamp.now();
    if (subscription.status === 'active' && subscription.endDate.toMillis() < now.toMillis()) {
      // Update status to expired if end date has passed
      await updateDoc(subscriptionRef, { status: 'expired' });
      return { ...subscription, status: 'expired' };
    }
    
    return subscription;
  }
  
  return null;
}

// Create or update a subscription
export async function createSubscription(
  user: User,
  planId: string,
  paymentDetails: {
    cardNumber?: string;
    expMonth?: number;
    expYear?: number;
    cvc?: string;
    paymentType: 'credit_card' | 'google_pay' | 'apple_pay';
  }
): Promise<{ success: boolean; error?: string; subscription?: Subscription }> {
  if (!db || !user) {
    return { success: false, error: 'Database or user not available' };
  }
  
  const selectedPlan = subscriptionPlans.find(plan => plan.id === planId);
  if (!selectedPlan) {
    return { success: false, error: 'Invalid subscription plan' };
  }
  
  try {
    // Create payment method with Stripe
    let paymentMethodId: string | null = null;
    
    if (paymentDetails.paymentType === 'credit_card' && 
        paymentDetails.cardNumber && 
        paymentDetails.expMonth && 
        paymentDetails.expYear && 
        paymentDetails.cvc) {
      
      paymentMethodId = await createPaymentMethod({
        number: paymentDetails.cardNumber,
        expMonth: paymentDetails.expMonth,
        expYear: paymentDetails.expYear,
        cvc: paymentDetails.cvc
      });
      
      if (!paymentMethodId) {
        return { success: false, error: 'Failed to create payment method' };
      }
    } else {
      // For Apple Pay / Google Pay, we would use the payment token instead
      // This is just a mock for demonstration purposes
      paymentMethodId = `pm_${Math.random().toString(36).substring(2, 15)}`;
    }
    
    // Call Firebase Function to create subscription
    if (!functions) {
      return { success: false, error: 'Firebase functions not available' };
    }
    
    const createSubscriptionFunction = httpsCallable(functions, 'createSubscription');
    const result = await createSubscriptionFunction({
      planId,
      paymentMethodId,
      customerEmail: user.email
    });
    
    const { subscriptionId, stripeCustomerId } = result.data as { subscriptionId: string; stripeCustomerId: string };
    
    // Subscription should be created in Firestore by the Cloud Function
    // But we'll fetch it to return to the client
    const subscription = await getUserSubscription(user.uid);
    
    if (!subscription) {
      return { success: false, error: 'Subscription was created but could not be retrieved' };
    }
    
    // Send receipt email
    if (!functions) {
      return { success: true, subscription };
    }
    
    const sendReceiptFunction = httpsCallable(functions, 'sendReceiptEmail');
    await sendReceiptFunction({
      email: user.email,
      purchaseDetails: {
        amount: selectedPlan.price * 100, // Convert to cents
        transactionId: subscriptionId,
        purchaseDate: new Date().toISOString(),
        productName: selectedPlan.name,
        description: `Subscription to ${selectedPlan.name} plan`
      }
    });
    
    return { success: true, subscription };
  } catch (error) {
    console.error('Failed to create subscription:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred while creating subscription' 
    };
  }
}

// Cancel a subscription
export async function cancelSubscription(userId: string): Promise<boolean> {
  try {
    // Call Firebase Function to cancel subscription
    if (!functions) return false;
    
    const cancelSubscriptionFunction = httpsCallable(functions, 'cancelSubscription');
    await cancelSubscriptionFunction({});
    
    return true;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return false;
  }
}

// Toggle auto-renewal setting
export async function toggleAutoRenew(userId: string, autoRenew: boolean): Promise<boolean> {
  if (!db) return false;
  
  try {
    if (!functions) return false;
    
    // Call Firebase Function to toggle auto-renew
    const toggleAutoRenewFunction = httpsCallable(functions, 'toggleAutoRenew');
    await toggleAutoRenewFunction({ autoRenew });
    
    return true;
  } catch (error) {
    console.error('Error toggling auto-renew:', error);
    return false;
  }
}

// Validate subscription with server
export async function validateSubscription(userId: string): Promise<{
  active: boolean;
  plan?: string;
  endDate?: string;
  autoRenew?: boolean;
}> {
  try {
    if (!functions) return { active: false };
    
    // Call Firebase Function to validate subscription
    const validateSubscriptionFunction = httpsCallable(functions, 'validateSubscription');
    const result = await validateSubscriptionFunction({});
    
    return result.data as {
      active: boolean;
      plan?: string;
      endDate?: string;
      autoRenew?: boolean;
    };
  } catch (error) {
    console.error('Error validating subscription:', error);
    return { active: false };
  }
}

// Check if user has an active subscription
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    const validationResult = await validateSubscription(userId);
    return validationResult.active;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    
    // Fall back to local check if server validation fails
    const subscription = await getUserSubscription(userId);
    return subscription !== null && subscription.status === 'active';
  }
}

// Process a payment
export async function processPayment(
  user: User,
  planId: string,
  paymentDetails: {
    cardNumber?: string;
    expMonth?: number;
    expYear?: number;
    cvc?: string;
    paymentType: 'credit_card' | 'google_pay' | 'apple_pay';
  }
): Promise<{
  success: boolean;
  transactionId?: string;
  error?: string;
}> {
  const selectedPlan = subscriptionPlans.find(plan => plan.id === planId);
  if (!selectedPlan) {
    return {
      success: false,
      error: 'Invalid subscription plan'
    };
  }

  try {
    // Create payment method with Stripe
    let paymentMethodId: string | null = null;
    
    if (paymentDetails.paymentType === 'credit_card' && 
        paymentDetails.cardNumber && 
        paymentDetails.expMonth && 
        paymentDetails.expYear && 
        paymentDetails.cvc) {
      
      paymentMethodId = await createPaymentMethod({
        number: paymentDetails.cardNumber,
        expMonth: paymentDetails.expMonth,
        expYear: paymentDetails.expYear,
        cvc: paymentDetails.cvc
      });
    } else {
      // For Apple Pay / Google Pay, we'd handle that differently
      // This is a simplified example
      paymentMethodId = `pm_${Math.random().toString(36).substring(2, 15)}`;
    }
    
    if (!paymentMethodId) {
      return {
        success: false,
        error: 'Failed to create payment method'
      };
    }
    
    if (!functions) {
      return {
        success: false,
        error: 'Firebase functions not available'
      };
    }
    
    // Process the payment using the Cloud Function
    const createPaymentIntentFunction = httpsCallable(functions, 'createPaymentIntent');
    const result = await createPaymentIntentFunction({
      amount: Math.round(selectedPlan.price * 100), // Convert to cents
      currency: 'usd',
      paymentMethodId,
      description: `${selectedPlan.name} Subscription`,
      metadata: {
        planId,
        userId: user.uid
      },
      receiptEmail: user.email
    });
    
    return {
      success: true,
      transactionId: (result.data as any).transactionId,
    };
  } catch (error) {
    console.error('Payment processing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown payment error'
    };
  }
}