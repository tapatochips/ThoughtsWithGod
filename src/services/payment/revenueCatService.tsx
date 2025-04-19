import { Platform } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import Constants from 'expo-constants';
import { Alert } from 'react-native';

// Define subscription offering identifiers - these should match with set up in RevenueCat dashboard
export const OFFERING_IDENTIFIER = 'default'; // The default offering in RevenueCat
export const ENTITLEMENT_ID = 'premium'; // The entitlement ID for premium access

// Define subscription plan types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number; // This will be populated from RevenueCat
  features: string[];
  durationMonths: number;
}

/**
 * Map of our app's subscription products to their descriptions
 */
export const SUBSCRIPTION_PLANS: Record<string, Omit<SubscriptionPlan, 'price'>> = {
  'monthly_basic': {
    id: 'monthly_basic',
    name: 'Monthly Basic',
    description: 'Access to all premium features for 1 month',
    features: [
      'Ad-free experience',
      'Unlimited favorite verses',
      'Personalized daily verses',
      'Prayer board access'
    ],
    durationMonths: 1
  },
  'monthly_premium': {
    id: 'monthly_premium',
    name: 'Monthly Premium',
    description: 'Enhanced experience with additional features',
    features: [
      'All Basic features',
      'Audio Bible readings',
      'Advanced Bible study tools',
      'Downloadable content for offline use',
      'Priority support'
    ],
    durationMonths: 1
  },
  'yearly_premium': {
    id: 'yearly_premium',
    name: 'Yearly Premium',
    description: 'Our best value plan with 2 months free',
    features: [
      'All Premium features',
      'Two months free (compared to monthly)',
      'Early access to new features',
      'Annual spiritual growth report'
    ],
    durationMonths: 12
  }
};

// RevenueCat product IDs to map to app's subscription plans
// These need to match the product IDs set up in App Store Connect / Google Play Console
export const PRODUCT_ID_MAP: Record<string, string> = {
  // iOS product IDs
  'com.yourdomain.thoughtswithgod.monthlybasic': 'monthly_basic',
  'com.yourdomain.thoughtswithgod.monthlypremium': 'monthly_premium',
  'com.yourdomain.thoughtswithgod.yearlypremium': 'yearly_premium',
  
  // Android product IDs (might be the same)
  'com.yourdomain.thoughtswithgod.monthlybasic': 'monthly_basic',
  'com.yourdomain.thoughtswithgod.monthlypremium': 'monthly_premium',
  'com.yourdomain.thoughtswithgod.yearlypremium': 'yearly_premium',
};

/**
 * Initialize RevenueCat with your API keys
 */
export async function initializeRevenueCat(): Promise<boolean> {
  try {
    // Get API keys from app config
    const iosKey = Constants.expoConfig?.extra?.REVENUECAT_API_KEY_IOS;
    const androidKey = Constants.expoConfig?.extra?.REVENUECAT_API_KEY_ANDROID;
    
    if (!iosKey || !androidKey) {
      console.error('RevenueCat API keys are not configured');
      return false;
    }
    
    // Debug mode for development - remove in production
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    
    // Initialize with the appropriate API key based on platform
    await Purchases.configure({
      apiKey: Platform.OS === 'ios' ? iosKey : androidKey,
    });
    
    console.log('RevenueCat initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    return false;
  }
}

/**
 * Identify user for RevenueCat
 * Call this when the user logs in
 */
export async function identifyUser(userId: string): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.logIn(userId);
    console.log('User identified with RevenueCat:', userId);
    return customerInfo;
  } catch (error) {
    console.error('Failed to identify user with RevenueCat:', error);
    return null;
  }
}

/**
 * Reset user identity
 * Call this when the user logs out
 */
export async function resetUser(): Promise<void> {
  try {
    await Purchases.logOut();
    console.log('RevenueCat user reset');
  } catch (error) {
    console.error('Failed to reset RevenueCat user:', error);
  }
}

/**
 * Get the current offerings available for purchase
 * This includes all subscription plans with their prices from the stores
 */
export async function getOfferings(): Promise<PurchasesPackage[] | null> {
  try {
    const offerings = await Purchases.getOfferings();
    
    if (!offerings.current) {
      console.log('No offerings available');
      return null;
    }
    
    console.log('Current offerings:', offerings.current);
    return offerings.current.availablePackages;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
}

/**
 * Get subscription plans with current prices
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const packages = await getOfferings();
    
    if (!packages) {
      return Object.values(SUBSCRIPTION_PLANS).map(plan => ({
        ...plan,
        price: 0, // Default price if we can't get the actual price
      }));
    }
    
    // Map packages to subscription plans with prices
    const plans: SubscriptionPlan[] = [];
    
    for (const pkg of packages) {
      const productId = pkg.product.identifier;
      const planId = PRODUCT_ID_MAP[productId];
      
      if (planId && SUBSCRIPTION_PLANS[planId]) {
        plans.push({
          ...SUBSCRIPTION_PLANS[planId],
          // Convert price string to number
          price: Number(pkg.product.price) || 0
        });
      }
    }
    
    return plans;
  } catch (error) {
    console.error('Failed to get subscription plans:', error);
    return [];
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(packageToPurchase: PurchasesPackage): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    
    return {
      success: true,
      customerInfo
    };
  } catch (error: any) {
    // Check for user cancellation
    if (error.userCancelled) {
      return {
        success: false,
        error: 'Purchase cancelled'
      };
    }
    
    console.error('Failed to purchase package:', error);
    Alert.alert('Purchase Failed', error.message || 'An unknown error occurred');
    
    return {
      success: false,
      error: error.message || 'Failed to process purchase'
    };
  }
}

/**
 * Get current user subscription status
 */
export async function getCurrentSubscription(): Promise<{
  isActive: boolean;
  planId?: string;
  expirationDate?: Date;
  willRenew?: boolean;
}> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    
    // Check if user has active entitlement
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    
    if (!entitlement) {
      return { isActive: false };
    }
    
    // Map store product ID to plan ID
    const planId = PRODUCT_ID_MAP[entitlement.productIdentifier];
    
    return {
      isActive: true,
      planId,
      expirationDate: new Date(entitlement.expirationDate),
      willRenew: !entitlement.willRenew
    };
  } catch (error) {
    console.error('Failed to get current subscription:', error);
    return { isActive: false };
  }
}

/**
 * Restore purchases for the current user
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  isSubscriptionActive: boolean;
}> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    
    // Check if user has active entitlement after restore
    const isSubscriptionActive = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    
    return {
      success: true,
      isSubscriptionActive
    };
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    return {
      success: false,
      isSubscriptionActive: false
    };
  }
}

/**
 * Check if a user has premium access
 * You can call this anywhere in your app to gate premium features
 */
export async function hasPremiumAccess(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    console.error('Failed to check premium access:', error);
    return false;
  }
}