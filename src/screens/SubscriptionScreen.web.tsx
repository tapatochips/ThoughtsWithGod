import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeProvider';
import { useFirebase } from '../context/FirebaseContext';

// Web version of SubscriptionScreen.tsx. The native screen uses the native
// Stripe SDK (CardField, useStripe), which can't load on web. Stripe Checkout
// replaces this placeholder in story P-1.
const SubscriptionScreen: React.FC = () => {
  const { theme } = useTheme();
  const { isPremiumUser, premiumPlan } = useFirebase();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Ionicons name="star-outline" size={48} color={theme.colors.primary} />
      <Text style={[styles.title, { color: theme.colors.text }]}>Premium</Text>
      <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
        {isPremiumUser
          ? `You're a Premium member${premiumPlan ? ` (${premiumPlan})` : ''}. Thank you for your support!`
          : 'Subscribing on the web is coming soon. For now, you can subscribe in the iOS or Android app.'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 480,
  },
});

export default SubscriptionScreen;
