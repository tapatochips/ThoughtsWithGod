import React, { ReactNode } from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY } from '../../services/payment/stripeService';

// Native (iOS + Android): SubscriptionScreen.tsx calls useStripe(), which
// needs this provider. The web bundle loads StripeWrapper.web.tsx instead,
// because @stripe/stripe-react-native is native-only.
const StripeWrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
  <StripeProvider
    publishableKey={STRIPE_PUBLISHABLE_KEY}
    merchantIdentifier="merchant.com.yourcompany.thoughtswithgod"
  >
    <>{children}</>
  </StripeProvider>
);

export default StripeWrapper;
