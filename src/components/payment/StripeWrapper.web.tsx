import React, { ReactNode } from 'react';

// Web: no native Stripe SDK. Web payments use Stripe Checkout (story P-1).
const StripeWrapper: React.FC<{ children: ReactNode }> = ({ children }) => <>{children}</>;

export default StripeWrapper;
