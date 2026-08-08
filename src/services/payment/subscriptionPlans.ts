export interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    price: number;
    priceId?: string; // Stripe Price ID
    appleProductId?: string; // App Store Connect / RevenueCat product ID (iOS)
    features: string[];
    durationMonths: number;
}

// Available subscription plans.
//
// SINGLE SOURCE OF TRUTH for client-side plan display, on both platforms.
// IMPORTANT: `id` values MUST match the keys in the Cloud Function's planPrices
// map (functions/index.tsx). The actual charge amount comes from the Stripe
// Price object (Android) or the App Store Connect product (iOS) referenced
// for each plan — the `price` field here is display-only and should match
// both dashboards.
export const subscriptionPlans: SubscriptionPlan[] = [
    {
        id: 'monthly_basic',
        name: 'Monthly Tier 1',
        description: 'Want to support us?',
        price: 4.99,
        appleProductId: 'com.tapatochips.thoughtswithgod.monthly_basic',
        features: [
            'This plan helps keep the app running!'
        ],
        durationMonths: 1
    },
    {
        id: 'monthly_premium',
        name: 'Monthly Tier 2',
        description: 'Support the app with a higher tier subscription, thank you!',
        price: 9.99,
        appleProductId: 'com.tapatochips.thoughtswithgod.monthly_premium',
        features: [
            'Want to support us more? Choose this plan!',
        ],
        durationMonths: 1
    },
    {
        id: 'monthly_pro',
        name: 'Monthly Tier 3',
        description: 'Our most generous monthly support tier, thank you so much!',
        price: 20.00,
        appleProductId: 'com.tapatochips.thoughtswithgod.monthly_pro',
        features: [
            'Want to support us even more? Choose this plan!',
        ],
        durationMonths: 1
    },
    {
        id: 'yearly_premium',
        name: 'Yearly Premium',
        description: 'Our best value yearly plan',
        price: 99.99,
        appleProductId: 'com.tapatochips.thoughtswithgod.yearly_premium',
        features: [
            'Want to support us even more? Choose this plan!',
        ],
        durationMonths: 12
    }
];
