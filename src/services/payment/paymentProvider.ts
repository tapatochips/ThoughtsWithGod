import { Platform } from 'react-native';

// Apple requires In-App Purchase for digital subscriptions (App Store
// Review Guideline 3.1.1), so iOS uses RevenueCat while Android keeps
// Stripe. This is the single import point SubscriptionScreen.tsx and
// FirebaseContext.tsx should use for provider-agnostic pieces.
export const isApplePlatform = Platform.OS === 'ios';

export type { SubscriptionPlan } from './subscriptionPlans';
export { subscriptionPlans } from './subscriptionPlans';

// Entitlement truth always lives server-side in Firestore (populated by
// either stripeWebhook or revenueCatWebhook) and is read through this one
// callable regardless of which provider processed the purchase — do not
// fork this function per platform.
export { validateSubscription } from './stripeService';
