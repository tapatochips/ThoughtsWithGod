// src/screens/SubscriptionScreen.tsx
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeProvider';
import { useFirebase } from '../context/FirebaseContext';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
  getSubscriptionPlans,
  SubscriptionPlan,
  getOfferings,
  purchasePackage,
  getCurrentSubscription,
  restorePurchases,
  PRODUCT_ID_MAP
} from '../services/payment/revenueCatService';
import { PurchasesPackage } from 'react-native-purchases';

interface SubscriptionScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, isPremiumUser } = useFirebase();
  
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<{
    isActive: boolean;
    planId?: string;
    expirationDate?: Date;
    willRenew?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [restoringPurchases, setRestoringPurchases] = useState(false);

  // Fetch subscription plans and current subscription on load
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get current subscription status
        const subscription = await getCurrentSubscription();
        setCurrentSubscription(subscription);
        
        // Get available packages
        const availablePackages = await getOfferings();
        if (availablePackages) {
          setPackages(availablePackages);
        }
        
        // Get subscription plans with prices
        const plans = await getSubscriptionPlans();
        setSubscriptionPlans(plans);
        
        // Pre-select the user's current plan or the first available plan
        if (subscription.isActive && subscription.planId) {
          const currentPlan = plans.find(plan => plan.id === subscription.planId);
          if (currentPlan) {
            setSelectedPlan(currentPlan);
          } else {
            setSelectedPlan(plans[0]);
          }
        } else {
          setSelectedPlan(plans[0]);
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSubscribe = async () => {
    if (!user || !selectedPlan) return;
    
    setProcessing(true);
    try {
      // Find the package that corresponds to the selected plan
      const packageToPurchase = packages.find(pkg => 
        PRODUCT_ID_MAP[pkg.product.identifier] === selectedPlan.id
      );
      
      if (!packageToPurchase) {
        Alert.alert('Error', 'Selected subscription package not found');
        return;
      }
      
      // Purchase the package
      const result = await purchasePackage(packageToPurchase);
      
      if (result.success) {
        // Get updated subscription status
        const updatedSubscription = await getCurrentSubscription();
        setCurrentSubscription(updatedSubscription);
        
        Alert.alert('Success', `Thank you! Your ${selectedPlan.name} subscription is now active.`);
      } else if (result.error && !result.error.includes('cancelled')) {
        Alert.alert('Subscription Failed', result.error);
      }
    } catch (error: any) {
      console.error('Error purchasing subscription:', error);
      Alert.alert('Error', error.message || 'An unknown error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (!user) return;
    
    setRestoringPurchases(true);
    try {
      const result = await restorePurchases();
      
      if (result.success) {
        // Get updated subscription status
        const updatedSubscription = await getCurrentSubscription();
        setCurrentSubscription(updatedSubscription);
        
        if (result.isSubscriptionActive) {
          Alert.alert('Purchases Restored', 'Your subscription has been successfully restored.');
        } else {
          Alert.alert('No Purchases Found', 'No active subscriptions were found for your account.');
        }
      } else {
        Alert.alert('Restore Failed', 'Failed to restore purchases. Please try again.');
      }
    } catch (error: any) {
      console.error('Error restoring purchases:', error);
      Alert.alert('Error', error.message || 'An unknown error occurred');
    } finally {
      setRestoringPurchases(false);
    }
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
          { backgroundColor: currentSubscription?.isActive ? `${theme.colors.success}20` : `${theme.colors.danger}20` }
        ]}>
          <Text style={[
            styles.statusText, 
            { color: currentSubscription?.isActive ? theme.colors.success : theme.colors.danger }
          ]}>
            {currentSubscription?.isActive ? 'Active' : 'Expired'}
          </Text>
        </View>
      </View>
      
      <View style={styles.subscriptionDetails}>
        <View style={styles.subscriptionDetail}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Plan:</Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {subscriptionPlans.find(p => p.id === currentSubscription?.planId)?.name || 'Unknown'}
          </Text>
        </View>
        
        {currentSubscription?.expirationDate && (
          <View style={styles.subscriptionDetail}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Expires:</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {currentSubscription.expirationDate.toLocaleDateString()}
            </Text>
          </View>
        )}
        
        <View style={styles.subscriptionDetail}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Auto-Renewal:</Text>
          <Text style={[styles.detailValue, { color: currentSubscription?.willRenew ? theme.colors.success : theme.colors.danger }]}>
            {currentSubscription?.willRenew ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
      </View>
      
      <View style={styles.subscriptionActions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('ProfileSetup')}
        >
          <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>Profile Settings</Text>
        </TouchableOpacity>
        
        <Text style={[styles.manageSubscriptionText, { color: theme.colors.textSecondary }]}>
          To cancel or manage your subscription, please visit the App Store/Google Play Store.
        </Text>
      </View>
    </View>
  );

  const renderPlans = () => (
    <View style={styles.plansContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {currentSubscription?.isActive ? 'Available Plans' : 'Choose a Subscription Plan'}
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
            selectedPlan?.id === plan.id && { 
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
          
          {selectedPlan?.id === plan.id && !currentSubscription?.isActive && (
            <TouchableOpacity 
              style={[styles.subscribeButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSubscribe}
              disabled={processing}
              activeOpacity={0.7}
            >
              {processing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={18} color="white" style={{ marginRight: 6 }} />
                  <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          {currentSubscription?.isActive && currentSubscription.planId === plan.id && (
            <View style={[
              styles.currentPlanBadge, 
              { backgroundColor: theme.colors.success }
            ]}>
              <Text style={styles.currentPlanText}>Current Plan</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity
        style={[styles.restoreButton, { borderColor: theme.colors.primary }]}
        onPress={handleRestorePurchases}
        disabled={restoringPurchases}
      >
        {restoringPurchases ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Text style={[styles.restoreButtonText, { color: theme.colors.primary }]}>
            Restore Purchases
          </Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.guaranteeContainer}>
        <Ionicons name="shield-checkmark-outline" size={30} color={theme.colors.success} />
        <Text style={[styles.guaranteeText, { color: theme.colors.text }]}>
          Premium Features, Seamless Experience
        </Text>
        <Text style={[styles.guaranteeDescription, { color: theme.colors.textSecondary }]}>
          Subscribe to unlock all premium features and support the continued development of Thoughts With God.
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
        {currentSubscription?.isActive && renderCurrentSubscription()}
        {renderPlans()}
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
  plansContainer: {
    paddingHorizontal: 8,
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
    fontWeight: '600',
    marginLeft: 8,
  },
  manageSubscriptionText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
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
  restoreButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 16,
  },
  restoreButtonText: {
    fontWeight: '500',
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
});

export default SubscriptionScreen;