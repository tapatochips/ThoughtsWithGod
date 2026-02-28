import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeProvider';
import { useFirebase } from '../context/FirebaseContext';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
  subscriptionPlans,
  createSubscription,
  validateSubscription,
  cancelSubscription
} from '../services/payment/stripeService';

interface SubscriptionScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, refreshPremiumStatus } = useFirebase();

  const { createPaymentMethod } = useStripe();
  const [selectedPlan, setSelectedPlan] = useState(subscriptionPlans[0]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [cardComplete, setCardComplete] = useState(false);

  useEffect(() => {
    checkCurrentSubscription();
  }, []);

  const checkCurrentSubscription = async () => {
    try {
      const result = await validateSubscription();
      if (result.active) {
        setCurrentSubscription(result);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to subscribe.');
      return;
    }

    if (!cardComplete) {
      Alert.alert('Incomplete Card', 'Please enter your complete card details.');
      return;
    }

    setProcessing(true);

    try {
      const { paymentMethod, error: stripeError } = await createPaymentMethod({
        paymentMethodType: 'Card',
      });

      if (stripeError || !paymentMethod) {
        Alert.alert('Card Error', stripeError?.message || 'Could not process card details.');
        setProcessing(false);
        return;
      }

      const result = await createSubscription(
        selectedPlan.id,
        paymentMethod.id,
        user.email || ''
      );

      if (result.success) {
        Alert.alert(
          'Success!',
          'Your subscription has been activated. Thank you for your support!',
          [
            {
              text: 'OK',
              onPress: () => {
                refreshPremiumStatus();
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert('Payment Failed', result.error || 'Please try again.');
      }
    } catch (error) {
      console.error('Error processing subscription:', error);
      Alert.alert('Error', 'An error occurred while processing your payment.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              const success = await cancelSubscription();
              if (success) {
                Alert.alert('Subscription Canceled', 'Your subscription has been canceled.');
                await checkCurrentSubscription();
                refreshPremiumStatus();
              } else {
                Alert.alert('Error', 'Failed to cancel subscription. Please try again.');
              }
            } catch (error) {
              Alert.alert('Error', 'An error occurred while canceling your subscription.');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

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

  if (loadingSubscription) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // If user has an active subscription, show management view
  if (currentSubscription) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.header, { color: theme.colors.text }]}>
            Manage Subscription
          </Text>

          <View style={[styles.currentPlanCard, {
            backgroundColor: theme.colors.card,
            ...getShadowStyle(theme)
          }]}>
            <Ionicons name="star" size={32} color={theme.colors.warning} />
            <Text style={[styles.currentPlanTitle, { color: theme.colors.text }]}>
              You're a Premium Member!
            </Text>
            <Text style={[styles.currentPlanText, { color: theme.colors.textSecondary }]}>
              Current Plan: {currentSubscription.plan}
            </Text>
            <Text style={[styles.currentPlanText, { color: theme.colors.textSecondary }]}>
              {currentSubscription.autoRenew
                ? `Renews on ${new Date(currentSubscription.endDate).toLocaleDateString()}`
                : `Expires on ${new Date(currentSubscription.endDate).toLocaleDateString()}`
              }
            </Text>

            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: `${theme.colors.danger}15` }]}
              onPress={handleCancelSubscription}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color={theme.colors.danger} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color={theme.colors.danger} />
                  <Text style={[styles.cancelButtonText, { color: theme.colors.danger }]}>
                    Cancel Subscription
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Show subscription plans and payment form
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.header, { color: theme.colors.text }]}>
            Choose Your Plan
          </Text>

          <Text style={[styles.subheader, { color: theme.colors.textSecondary }]}>
            Remove ads, and save unlimited verses. Your support helps us keep the app running and continuously improving!
          </Text>

          {/* Plan Selection */}
          {!showPaymentForm && subscriptionPlans.map(plan => (
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

          {/* Continue Button or Payment Form */}
          {!showPaymentForm ? (
            <TouchableOpacity
              style={[styles.subscribeButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowPaymentForm(true)}
            >
              <Text style={styles.subscribeButtonText}>Continue to Payment</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.paymentForm, {
              backgroundColor: theme.colors.card,
              ...getShadowStyle(theme)
            }]}>
              <Text style={[styles.paymentTitle, { color: theme.colors.text }]}>
                Payment Details
              </Text>

              <Text style={[styles.selectedPlanText, { color: theme.colors.textSecondary }]}>
                {selectedPlan.name} - ${selectedPlan.price.toFixed(2)}
              </Text>

              <CardField
                postalCodeEnabled={false}
                style={styles.cardField}
                cardStyle={{
                  backgroundColor: theme.colors.background,
                  textColor: theme.colors.text,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  borderRadius: 8,
                }}
                onCardChange={(details) => setCardComplete(details.complete)}
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.cancelFormButton, { backgroundColor: theme.colors.surface }]}
                  onPress={() => setShowPaymentForm(false)}
                >
                  <Text style={[styles.cancelFormButtonText, { color: theme.colors.text }]}>
                    Back
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.payButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleSubscribe}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="card-outline" size={20} color="white" />
                      <Text style={styles.payButtonText}>Subscribe</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={[styles.securityText, { color: theme.colors.textSecondary }]}>
                <Ionicons name="lock-closed" size={12} /> Your payment info is secure and encrypted
              </Text>
            </View>
          )}

          <View style={styles.supportInfo}>
            <Ionicons name="information-circle-outline" size={24} color={theme.colors.secondary} />
            <Text style={[styles.supportText, { color: theme.colors.textSecondary }]}>
              You can cancel your subscription at any time. For support, contact support@thoughtswithgod.com
            </Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  },
  paymentForm: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  selectedPlanText: {
    fontSize: 16,
    marginBottom: 20,
  },
  cardField: {
    height: 50,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelFormButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '30%',
    alignItems: 'center',
  },
  cancelFormButtonText: {
    fontWeight: '600',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '65%',
  },
  payButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  securityText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
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
  currentPlanCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  currentPlanTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  currentPlanText: {
    fontSize: 16,
    marginBottom: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  cancelButtonText: {
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SubscriptionScreen;