// Web version of revenueCatService.tsx. RevenueCat handles Apple In-App
// Purchase and only runs on iOS, so this file keeps `react-native-purchases`
// out of the web bundle. Callers guard with `isApplePlatform`; reaching any of
// these on web is a bug.
import type * as Native from './revenueCatService';

function iosOnly(): never {
    throw new Error('RevenueCat is only available on iOS');
}

export const REVENUECAT_IOS_API_KEY: typeof Native.REVENUECAT_IOS_API_KEY = '';
export const configureRevenueCat: typeof Native.configureRevenueCat = iosOnly;
export const getOfferings: typeof Native.getOfferings = iosOnly;
export const purchasePackage: typeof Native.purchasePackage = iosOnly;
export const restorePurchases: typeof Native.restorePurchases = iosOnly;
export const validateSubscriptionApple: typeof Native.validateSubscriptionApple = iosOnly;
export const openManageSubscriptions: typeof Native.openManageSubscriptions = iosOnly;
