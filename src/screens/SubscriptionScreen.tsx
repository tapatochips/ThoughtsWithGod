import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeProvider';
import { useFirebase } from '../context/FirebaseContext';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
  subscriptionPlans,
  SubscriptionPlan,
  getUserSubscription,
  Subscription,
  processPayment,
  createSubscription,
  cancelSubscription,
  toggleAutoRenew,
  validateSubscription
} from '../services/firebase/subscriptionService';
import { formatDate, formatPrice, validateCreditCard, validateExpDate } from '../utils/paymentUtils';
import { initializeStripe, presentNativePayUI } from '../services/payment/stripeService';

interface SubscriptionScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useFirebase();
  
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentType, setPaymentType] = useState<'credit_card' | 'google_pay' | 'apple_pay'>('credit_card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [cardError, setCardError] = useState<string | null>(null);
  const [validatingSubscription, setValidatingSubscription] = useState(false);

  // Initialize Stripe on component mount
  useEffect(() => {
    const initStripe = async () => {
      await initializeStripe();
    };
    
    initStripe();
  }, []);

  // Fetch current subscription on load
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setValidatingSubscription(true);
        
        // First, validate with the server
        const validation = await validateSubscription(user.uid);
        
        if (validation.active) {
          // Get full subscription details from Firestore
          const subscription = await getUserSubscription(user.uid);
          setCurrentSubscription(subscription);
          
          // If user has a subscription, preselect that plan
          if (subscription) {
            const plan = subscriptionPlans.find(p => p.id === subscription.planId);
            if (plan) setSelectedPlan(plan);
          }
        } else {
          // Default to first plan if no subscription
          setSelectedPlan(subscriptionPlans[0]);
          setCurrentSubscription(null);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        
        // Fallback to local database check if server validation fails
        try {
          const subscription = await getUserSubscription(user.uid);
          setCurrentSubscription(subscription);
          
          if (subscription) {
            const plan = subscriptionPlans.find(p => p.id === subscription.planId);
            if (plan) setSelectedPlan(plan);
          } else {
            setSelectedPlan(subscriptionPlans[0]);
          }
        } catch (fallbackError) {
          console.error('Error in fallback subscription check:', fallbackError);
        }
      } finally {
        setLoading(false);
        setValidatingSubscription(false);
      }
    };

    fetchSubscription();
  }, [user]);

  // Format card number with spaces
  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const groups = [];
    
    for (let i = 0; i < cleaned.length; i += 4) {
      groups.push(cleaned.substring(i, i + 4));
    }
    
    return groups.join(' ').trim();
  };
  
  // Format expiry date
  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    if (cleaned.length <= 2) {
      return cleaned;
    }
    
    return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
  };
  
  // Validate payment form
  const validatePaymentForm = (): boolean => {
    // Clear previous errors
    setCardError(null);
    
    if (paymentType === 'credit_card') {
      // Validate card number
      const formattedNumber = cardNumber.replace(/\s+/g, '');
      if (!validateCreditCard(formattedNumber)) {
        setCardError('Please enter a valid credit card number');
        return false;
      }
      
      // Validate expiry date
      if (!validateExpDate(cardExpiry)) {
        setCardError('Please enter a valid expiration date (MM/YY)');
        return false;
      }
      
      // Validate CVC
      if (cardCVC.length < 3) {
        setCardError('Please enter a valid security code');
        return false;
      }
    }
    
    return true;
  };

  const handlePaymentSubmit = async () => {
    if (!user || !selectedPlan) return;
    
    // Validate form first
    if (!validatePaymentForm()) {
      return;
    }
    
    setProcessing(true);
    try {
      if (paymentType === 'credit_card') {
        // Parse expiry date
        const [expMonth, expYear] = cardExpiry.split('/').map(Number);
        
        // Create subscription with Stripe
        const result = await createSubscription(user, selectedPlan.id, {
          cardNumber: cardNumber.replace(/\s+/g, ''),
          expMonth,
          expYear: 2000 + expYear, // Convert to full year
          cvc: cardCVC,
          paymentType: 'credit_card'
        });
        
        if (result.success && result.subscription) {
          setCurrentSubscription(result.subscription);
          setShowPaymentForm(false);
          Alert.alert("Subscription Active", `Thank you! Your ${selectedPlan.name} subscription is now active.`);
        } else {
          Alert.alert("Payment Failed", result.error || "Payment processing failed. Please try again.");
        }
      } else if (paymentType === 'apple_pay' || paymentType === 'google_pay') {
        // Handle native payment methods
        const nativePaymentResult = await presentNativePayUI(
          selectedPlan,
          user.email || '',
          user.uid
        );
        
        if (nativePaymentResult.success && nativePaymentResult.paymentMethodId) {
          // Create subscription with the native payment method
          const result = await createSubscription(user, selectedPlan.id, {
            paymentType: paymentType
          });
          
          if (result.success && result.subscription) {
            setCurrentSubscription(result.subscription);
            setShowPaymentForm(false);
            Alert.alert("Subscription Active", `Thank you! Your ${selectedPlan.name} subscription is now active.`);
          } else {
            Alert.alert("Payment Failed", result.error || "Payment processing failed. Please try again.");
          }
        } else {
          Alert.alert("Payment Failed", nativePaymentResult.error || "Native payment processing failed.");
        }
      }
    } catch (error) {
      console.error('Error processing subscription:', error);
      Alert.alert("Error", "Failed to process subscription. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !currentSubscription) return;
    
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel your subscription? You'll still have access until the end of your billing period.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setProcessing(true);
            try {
              const success = await cancelSubscription(user.uid);
              if (success) {
                const updatedSubscription = await getUserSubscription(user.uid);
                setCurrentSubscription(updatedSubscription);
                Alert.alert("Subscription Canceled", "Your subscription has been canceled. You'll have access until the end of your current billing period.");
              } else {
                Alert.alert("Error", "Failed to cancel subscription. Please try again.");
              }
            } catch (error) {
              console.error('Error canceling subscription:', error);
              Alert.alert("Error", "Failed to cancel subscription. Please try again.");
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleToggleAutoRenew = async () => {
    if (!user || !currentSubscription) return;
    
    setProcessing(true);
    try {
      const newAutoRenewValue = !currentSubscription.autoRenew;
      const success = await toggleAutoRenew(user.uid, newAutoRenewValue);
      
      if (success) {
        const updatedSubscription = await getUserSubscription(user.uid);
        setCurrentSubscription(updatedSubscription);
        Alert.alert(
          "Auto-Renewal Updated", 
          newAutoRenewValue 
            ? "Your subscription will automatically renew at the end of your billing period." 
            : "Your subscription will not renew. You'll have access until the end of your current billing period."
        );
      } else {
        Alert.alert("Error", "Failed to update auto-renewal settings. Please try again.");
      }
    } catch (error) {
      console.error('Error updating auto-renewal:', error);
      Alert.alert("Error", "Failed to update auto-renewal settings. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const viewReceipt = () => {
    if (!currentSubscription) return;
    
    navigation.navigate('ReceiptViewer', {
      transactionId: currentSubscription.transactionId || 'N/A',
      planName: subscriptionPlans.find(p => p.id === currentSubscription.planId)?.name || 'Subscription',
      amount: subscriptionPlans.find(p => p.id === currentSubscription.planId)?.price || 0,
      purchaseDate: currentSubscription.startDate.toDate().toISOString(),
      status: currentSubscription.status
    });
  };

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

  const renderCurrentSubscription = () => (
    <View style={[styles.subscriptionCard, { backgroundColor: theme.colors.card, ...getShadowStyle(theme) }]}>
      <View style={styles.subscriptionHeader}>
        <Text style={[styles.subscriptionTitle, { color: theme.colors.text }]}>
          Current Subscription
        </Text>
        
        <View style={[
          styles.statusBadge, 
          { 
            backgroundColor: 
              currentSubscription?.status === 'active' ? `${theme.colors.success}20` :
              currentSubscription?.status === 'canceled' ? `${theme.colors.warning}20` : 
              `${theme.colors.danger}20` 
          }
        ]}>
          <Text style={[
            styles.statusText, 
            {
              color: 
                currentSubscription?.status === 'active' ? theme.colors.success :
                currentSubscription?.status === 'canceled' ? theme.colors.warning : 
                theme.colors.danger
            }
          ]}>
            {currentSubscription?.status === 'active' ? 'Active' : 
             currentSubscription?.status === 'canceled' ? 'Canceled' : 'Expired'}
          </Text>
        </View>
      </View>
      
      <View style={styles.subscriptionDetails}>
        <View style={styles.subscriptionDetail}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Plan:</Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {subscriptionPlans.find(p => p.id === currentSubscription?.planId)?.name}
          </Text>
        </View>
        
        <View style={styles.subscriptionDetail}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Price:</Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {formatPrice(subscriptionPlans.find(p => p.id === currentSubscription?.planId)?.price || 0)}
            {currentSubscription?.planId.includes('yearly') ? '/year' : '/month'}
          </Text>
        </View>
        
        <View style={styles.subscriptionDetail}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Renewal Date:</Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {currentSubscription?.endDate ? formatDate(currentSubscription.endDate.toDate().toISOString()) : 'N/A'}
          </Text>
        </View>
        
        <View style={styles.subscriptionDetail}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Auto-Renewal:</Text>
          <Text style={[styles.detailValue, { color: currentSubscription?.autoRenew ? theme.colors.success : theme.colors.danger }]}>
            {currentSubscription?.autoRenew ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
      </View>
      
      <View style={styles.subscriptionActions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          onPress={viewReceipt}
        >
          <Ionicons name="receipt-outline" size={20} color="white" />
          <Text style={styles.actionButtonText}>View Receipt</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { 
            backgroundColor: currentSubscription?.autoRenew ? theme.colors.danger : theme.colors.success 
          }]}
          onPress={handleToggleAutoRenew}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons 
                name={currentSubscription?.autoRenew ? "close-circle-outline" : "refresh-outline"} 
                size={20} 
                color="white" 
              />
              <Text style={styles.actionButtonText}>
                {currentSubscription?.autoRenew ? 'Cancel Auto-Renewal' : 'Enable Auto-Renewal'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        
        {currentSubscription?.status === 'active' && (
          <TouchableOpacity 
            style={[styles.cancelButton, { borderColor: theme.colors.danger }]}
            onPress={handleCancelSubscription}
            disabled={processing}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.danger }]}>
              Cancel Subscription
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderPlans = () => (
    <View>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {currentSubscription ? 'Available Plans' : 'Choose a Subscription Plan'}
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
            selectedPlan?.id === plan.id && { borderColor: theme.colors.primary, borderWidth: 2 }
          ]}
          onPress={() => setSelectedPlan(plan)}
        >
          <View style={styles.planHeader}>
            <Text style={[styles.planName, { color: theme.colors.text }]}>{plan.name}</Text>
            <Text style={[styles.planPrice, { color: theme.colors.primary }]}>
              {formatPrice(plan.price)}{plan.durationMonths === 1 ? '/month' : '/year'}
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
          
          {selectedPlan?.id === plan.id && !currentSubscription && (
            <TouchableOpacity 
              style={[styles.subscribeButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowPaymentForm(true)}
            >
              <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
            </TouchableOpacity>
          )}
          
          {currentSubscription && currentSubscription.planId === plan.id && (
            <View style={[
              styles.currentPlanBadge, 
              { backgroundColor: theme.colors.success }
            ]}>
              <Text style={styles.currentPlanText}>Current Plan</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
      
      <View style={styles.guaranteeContainer}>
        <Ionicons name="shield-checkmark-outline" size={30} color={theme.colors.success} />
        <Text style={[styles.guaranteeText, { color: theme.colors.text }]}>
          30-Day Money Back Guarantee
        </Text>
        <Text style={[styles.guaranteeDescription, { color: theme.colors.textSecondary }]}>
          If you're not completely satisfied, simply cancel within the first 30 days for a full refund.
        </Text>
      </View>
    </View>
  );

  const renderPaymentForm = () => (
    <View style={[styles.paymentForm, { backgroundColor: theme.colors.card, ...getShadowStyle(theme) }]}>
      <View style={styles.paymentHeader}>
        <Text style={[styles.paymentTitle, { color: theme.colors.text }]}>Payment Method</Text>
        <TouchableOpacity onPress={() => setShowPaymentForm(false)} disabled={processing}>
          <Ionicons name="close-circle-outline" size={24} color={theme.colors.danger} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.paymentOptions}>
        <TouchableOpacity
          style={[
            styles.paymentOption,
            { borderColor: paymentType === 'credit_card' ? theme.colors.primary : theme.colors.border }
          ]}
          onPress={() => setPaymentType('credit_card')}
          disabled={processing}
        >
          <Ionicons name="card-outline" size={24} color={theme.colors.primary} />
          <Text style={[styles.paymentOptionText, { color: theme.colors.text }]}>Credit Card</Text>
        </TouchableOpacity>
        
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[
              styles.paymentOption,
              { borderColor: paymentType === 'apple_pay' ? theme.colors.primary : theme.colors.border }
            ]}
            onPress={() => setPaymentType('apple_pay')}
            disabled={processing}
          >
            <Ionicons name="logo-apple" size={24} color={theme.colors.text} />
            <Text style={[styles.paymentOptionText, { color: theme.colors.text }]}>Apple Pay</Text>
          </TouchableOpacity>
        )}
        
        {Platform.OS === 'android' && (
          <TouchableOpacity
            style={[
              styles.paymentOption,
              { borderColor: paymentType === 'google_pay' ? theme.colors.primary : theme.colors.border }
            ]}
            onPress={() => setPaymentType('google_pay')}
            disabled={processing}
          >
            <Ionicons name="logo-google" size={24} color={theme.colors.primary} />
            <Text style={[styles.paymentOptionText, { color: theme.colors.text }]}>Google Pay</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {paymentType === 'credit_card' && (
        <View style={styles.cardInputContainer}>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Card Number</Text>
          <TextInput
            style={[
              styles.cardInput,
              { 
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.background,
                color: theme.colors.text
              }
            ]}
            placeholder="1234 5678 9012 3456"
            placeholderTextColor={theme.colors.secondary}
            value={cardNumber}
            onChangeText={(text) => setCardNumber(formatCardNumber(text))}
            keyboardType="number-pad"
            maxLength={19} // 16 digits + 3 spaces
            editable={!processing}
          />
          
          <View style={styles.cardRow}>
            <View style={styles.cardInputHalf}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Expiry Date</Text>
              <TextInput
                style={[
                  styles.cardInput,
                  { 
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text
                  }
                ]}
                placeholder="MM/YY"
                placeholderTextColor={theme.colors.secondary}
                value={cardExpiry}
                onChangeText={(text) => setCardExpiry(formatExpiry(text))}
                keyboardType="number-pad"
                maxLength={5} // MM/YY
                editable={!processing}
              />
            </View>
            
            <View style={styles.cardInputHalf}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Security Code</Text>
              <TextInput
                style={[
                  styles.cardInput,
                  { 
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text
                  }
                ]}
                placeholder="CVC"
                placeholderTextColor={theme.colors.secondary}
                value={cardCVC}
                onChangeText={(text) => setCVC(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={4}
                editable={!processing}
              />
            </View>
          </View>
          
          {cardError && (
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>
              {cardError}
            </Text>
          )}
        </View>
      )}
      
      <View style={styles.orderSummary}>
        <Text style={[styles.orderSummaryTitle, { color: theme.colors.text }]}>Order Summary</Text>
        <View style={styles.orderDetail}>
          <Text style={[styles.orderDetailLabel, { color: theme.colors.textSecondary }]}>
            Plan:
          </Text>
          <Text style={[styles.orderDetailValue, { color: theme.colors.text }]}>
            {selectedPlan?.name}
          </Text>
        </View>
        <View style={styles.orderDetail}>
          <Text style={[styles.orderDetailLabel, { color: theme.colors.textSecondary }]}>
            Period:
          </Text>
          <Text style={[styles.orderDetailValue, { color: theme.colors.text }]}>
            {selectedPlan?.durationMonths === 1 ? 'Monthly' : 'Annual'}
          </Text>
        </View>
        <View style={[styles.orderTotal, { borderTopColor: theme.colors.divider }]}>
          <Text style={[styles.orderTotalLabel, { color: theme.colors.text }]}>
            Total:
          </Text>
          <Text style={[styles.orderTotalValue, { color: theme.colors.primary }]}>
            ${selectedPlan?.price.toFixed(2)}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          styles.payButton,
          { backgroundColor: theme.colors.primary },
          processing && { opacity: 0.7 }
        ]}
        onPress={handlePaymentSubmit}
        disabled={processing}
      >
        {processing ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={styles.payButtonText}>
            Complete Purchase
          </Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.securePaymentInfo}>
        <Ionicons name="lock-closed" size={16} color={theme.colors.success} />
        <Text style={[styles.securePaymentText, { color: theme.colors.textSecondary }]}>
          Secure payment processing. Your payment information is encrypted.
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.message, { color: theme.colors.text }]}>
          Loading subscription information...
        </Text>
      </View>
    );
  }

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
        {currentSubscription && renderCurrentSubscription()}
        {renderPlans()}
      </ScrollView>
      
      {showPaymentForm && renderPaymentForm()}
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 16,
  },
  subscriptionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subscriptionDetails: {
    marginBottom: 16,
  },
  subscriptionDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  subscriptionActions: {
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '600',
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
    marginBottom: 16,
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
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  subscribeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  currentPlanBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  currentPlanText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  guaranteeContainer: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  guaranteeText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  guaranteeDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  paymentForm: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  paymentOption: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    width: '48%',
  },
  paymentOptionText: {
    marginTop: 8,
    fontWeight: '500',
  },
  cardInputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  cardInput: {
    height: 45,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardInputHalf: {
    width: '48%',
  },
  errorText: {
    fontSize: 14,
    marginTop: -6,
    marginBottom: 12,
  },
  orderSummary: {
    marginBottom: 20,
  },
  orderSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  orderDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderDetailLabel: {
    fontSize: 14,
  },
  orderDetailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  orderTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  payButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  payButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  securePaymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  securePaymentText: {
    fontSize: 12,
    marginLeft: 6,
    textAlign: 'center',
  },
});

export default SubscriptionScreen;