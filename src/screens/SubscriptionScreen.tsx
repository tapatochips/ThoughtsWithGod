import React, { useState, useEffect } from 'react';
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

  {/* Payment Form Modal */}
  {showPaymentForm && (
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
                onChangeText={(text) => setCardCVC(text.replace(/[^0-9]/g, ''))}
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
  )}

  securePaymentText: {
    fontSize: 12,
    marginLeft: 6,
    textAlign: 'center',
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
  guarantee: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },