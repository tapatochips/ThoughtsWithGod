// src/screens/SubscriptionScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeProvider';
import { useFirebase } from '../context/FirebaseContext';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
  subscriptionPlans,
  openPaymentLink
} from '../services/payment/paymentService';

interface SubscriptionScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useFirebase();

  const [selectedPlan, setSelectedPlan] = useState(subscriptionPlans[0]);

  // Helper function for consistent shadow styling
  const getShadowStyle = (theme: any) => {
    if (Platform.OS === 'ios') {
      return {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      };
    } else {
      return {
        elevation: 3,
      };
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to subscribe.');
      return;
    }

    if (!selectedPlan) {
      Alert.alert('Please Select a Plan', 'Please select a subscription plan to continue.');
      return;
    }

    try {
      // Open payment link in browser
      const success = await openPaymentLink(selectedPlan);

      if (success) {
        Alert.alert(
          'Payment Page Opened',
          'Please complete your payment in the browser. After payment, return to the app.'
        );
      } else {
        Alert.alert(
          'Could Not Open Browser',
          'Please visit our website to complete your subscription.'
        );
      }
    } catch (error) {
      console.error('Error handling subscription:', error);
      Alert.alert('Error', 'An error occurred while processing your request.');
    }
  };

  if (!user) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="person-circle-outline" size={48} color={theme.colors.primary} />
        <Text style={[styles.message, { color: theme.colors.text }]}>
          Please log in to access subscription features.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.header, { color: theme.colors.text }]}>
          Support ThoughtsWithGod
        </Text>

        <Text style={[styles.subheader, { color: theme.colors.textSecondary }]}>
          Choose a subscription plan to unlock premium features
        </Text>

        {subscriptionPlans.map(plan => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planCard,
              {
                backgroundColor: theme.colors.card,
                ...getShadowStyle(theme)
              },
              selectedPlan.id === plan.id && {
                borderColor: theme.colors.primary,
                borderWidth: 2
              }
            ]}
            onPress={() => setSelectedPlan(plan)}
            activeOpacity={0.8}
          >
            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: theme.colors.text }]}>{plan.name}</Text>
              <Text style={[styles.planPrice, { color: theme.colors.primary }]}>
                ${plan.price.toFixed(2)}{plan.durationMonths === 1 ? '/month' : '/year'}
              </Text>
            </View>

            <Text style={[styles.planDescription, { color: theme.colors.textSecondary }]}>
              {plan.description}
            </Text>

            <View style={styles.featuresContainer}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                  <Text style={[styles.featureText, { color: theme.colors.text }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.subscribeButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSubscribe}
        >
          <Ionicons name="card-outline" size={20} color="white" />
          <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
        </TouchableOpacity>

        <View style={styles.supportInfo}>
          <Ionicons name="information-circle-outline" size={24} color={theme.colors.secondary} />
          <Text style={[styles.supportText, { color: theme.colors.textSecondary }]}>
            After payment, your premium features will be activated within 24 hours. If you have any questions, please contact support@thoughtswithgod.com.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subheader: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  planCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  planDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  featuresContainer: {
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    marginLeft: 8,
    fontSize: 14,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  subscribeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  supportInfo: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginTop: 16,
  },
  supportText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});

export default SubscriptionScreen;