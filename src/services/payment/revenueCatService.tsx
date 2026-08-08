import { Linking } from 'react-native';
import Constants from 'expo-constants';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';

// RevenueCat public SDK key (Apple App Store) from config.
export const REVENUECAT_IOS_API_KEY = Constants.expoConfig?.extra?.REVENUECAT_IOS_API_KEY || '';

let configured = false;

// Must be called once, after the Firebase user is known, before any other
// RevenueCat call. Uses the Firebase UID as RevenueCat's appUserID so the
// webhook payload (functions/index.tsx revenueCatWebhook) can map back to
// the same Firestore user doc.
export function configureRevenueCat(userId: string): void {
    if (configured || !REVENUECAT_IOS_API_KEY) {
        return;
    }

    Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY, appUserID: userId });
    configured = true;
}

function entitlementFromCustomerInfo(customerInfo: CustomerInfo): {
    active: boolean;
    plan?: string;
    endDate?: string;
} {
    const activeEntitlements = Object.values(customerInfo.entitlements.active);
    const entitlement = activeEntitlements[0];

    if (!entitlement) {
        return { active: false };
    }

    return {
        active: true,
        plan: entitlement.productIdentifier,
        endDate: entitlement.expirationDate || undefined,
    };
}

// Fetch the current Offering's Packages, keyed by RevenueCat package
// identifier (which mirrors our plan ids, e.g. monthly_basic).
export async function getOfferings(): Promise<PurchasesPackage[]> {
    try {
        const offerings = await Purchases.getOfferings();
        return offerings.current?.availablePackages || [];
    } catch (error) {
        console.error('Error fetching RevenueCat offerings:', error);
        return [];
    }
}

// Purchase a package. Entitlement truth still comes from Firestore via the
// RevenueCat webhook — this local result is only used for immediate UI
// feedback, not as the source of truth.
export async function purchasePackage(pkg: PurchasesPackage): Promise<{
    success: boolean;
    userCancelled?: boolean;
    active?: boolean;
    plan?: string;
    endDate?: string;
    error?: string;
}> {
    try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        return { success: true, ...entitlementFromCustomerInfo(customerInfo) };
    } catch (error: any) {
        if (error?.userCancelled) {
            return { success: false, userCancelled: true };
        }
        console.error('Error purchasing RevenueCat package:', error);
        return { success: false, error: error?.message || 'Purchase failed' };
    }
}

// Apple requires a visible restore-purchases option (Guideline 3.1.2).
export async function restorePurchases(): Promise<{
    success: boolean;
    active?: boolean;
    plan?: string;
    endDate?: string;
    error?: string;
}> {
    try {
        const customerInfo = await Purchases.restorePurchases();
        return { success: true, ...entitlementFromCustomerInfo(customerInfo) };
    } catch (error: any) {
        console.error('Error restoring purchases:', error);
        return { success: false, error: error?.message || 'Restore failed' };
    }
}

// Local-only check, used to avoid a UI flash while waiting for the
// RevenueCat webhook to land in Firestore. NOT the entitlement source of
// truth — the shared validateSubscription callable is.
export async function validateSubscriptionApple(): Promise<{
    active: boolean;
    plan?: string;
    endDate?: string;
}> {
    try {
        const customerInfo = await Purchases.getCustomerInfo();
        return entitlementFromCustomerInfo(customerInfo);
    } catch (error) {
        console.error('Error reading local RevenueCat customer info:', error);
        return { active: false };
    }
}

// Apple subscriptions can only be canceled through Apple's own UI.
export function openManageSubscriptions(): void {
    Linking.openURL('itms-apps://apps.apple.com/account/subscriptions').catch((error) => {
        console.error('Error opening Apple subscription management:', error);
    });
}
