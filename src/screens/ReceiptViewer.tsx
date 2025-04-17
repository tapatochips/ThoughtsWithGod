import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFirebase } from '../context/FirebaseContext';
import { useTheme } from '../context/ThemeProvider';
import { NavigationProp, ParamListBase, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { formatDate, formatPrice } from '../utils/paymentUtils';
import { functions } from '../services/firebase/firebaseFunctions';

type RouteParams = {
  transactionId: string;
  planName: string;
  amount: number;
  purchaseDate: string;
  paymentMethod?: string;
  status: 'active' | 'canceled' | 'expired';
};

const ReceiptViewer: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useFirebase();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const [loading, setLoading] = useState(false);
  const [resendingReceipt, setResendingReceipt] = useState(false);
  
  // Get receipt data from route params
  const {
    transactionId,
    planName,
    amount,
    purchaseDate,
    paymentMethod = 'Credit Card',
    status
  } = route.params || {};

  // Handle share receipt
  const handleShareReceipt = async () => {
    try {
      const receiptDate = new Date(purchaseDate).toLocaleDateString();
      const message = `Thoughts With God Subscription Receipt\n\nPlan: ${planName}\nAmount: ${formatPrice(amount)}\nDate: ${receiptDate}\nTransaction ID: ${transactionId}`;
      
      await Share.share({
        message,
        title: 'Thoughts With God - Subscription Receipt',
      });
    } catch (error) {
      console.error('Error sharing receipt:', error);
    }
  };
  
  // Resend receipt email
  const handleResendEmail = async () => {
    if (!user || !user.email || !functions) return;
    
    try {
      setResendingReceipt(true);
      
      // Call the Cloud Function to send receipt email
      const sendReceiptEmailFunction = httpsCallable(functions, 'sendReceiptEmail');
      await sendReceiptEmailFunction({
        email: user.email,
        purchaseDetails: {
          amount: amount * 100, // Convert to cents
          transactionId,
          purchaseDate,
          productName: planName,
          description: `Subscription to ${planName}`
        }
      });
      
      alert(`Receipt sent to ${user.email}`);
    } catch (error) {
      console.error('Error resending receipt:', error);
      alert('Failed to send receipt email. Please try again.');
    } finally {
      setResendingReceipt(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Receipt</Text>
        
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      
      <View style={[styles.receiptCard, { 
        backgroundColor: theme.colors.card,
        shadowColor: theme.colors.shadow
      }]}>
        <View style={styles.logoContainer}>
          <Ionicons name="book" size={48} color={theme.colors.primary} />
          <Text style={[styles.appName, { color: theme.colors.primary }]}>
            Thoughts With God
          </Text>
        </View>
        
        <Text style={[styles.receiptTitle, { color: theme.colors.text }]}>
          Subscription Receipt
        </Text>
        
        <View style={[styles.receiptDivider, { backgroundColor: theme.colors.divider }]} />
        
        <View style={styles.receiptRow}>
          <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
            Plan
          </Text>
          <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
            {planName}
          </Text>
        </View>
        
        <View style={styles.receiptRow}>
          <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
            Amount
          </Text>
          <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
            {formatPrice(amount)}
          </Text>
        </View>
        
        <View style={styles.receiptRow}>
          <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
            Date
          </Text>
          <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
            {formatDate(purchaseDate)}
          </Text>
        </View>
        
        <View style={styles.receiptRow}>
          <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
            Payment Method
          </Text>
          <Text style={[styles.receiptValue, { color: theme.colors.text }]}>
            {paymentMethod}
          </Text>
        </View>
        
        <View style={styles.receiptRow}>
          <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
            Status
          </Text>
          <View style={[
            styles.statusBadge, 
            { 
              backgroundColor: 
                status === 'active' ? `${theme.colors.success}20` :
                status === 'canceled' ? `${theme.colors.warning}20` :
                `${theme.colors.danger}20`
            }
          ]}>
            <Text style={[
              styles.statusText, 
              { 
                color: 
                  status === 'active' ? theme.colors.success :
                  status === 'canceled' ? theme.colors.warning :
                  theme.colors.danger
              }
            ]}>
              {status === 'active' ? 'Active' : 
               status === 'canceled' ? 'Canceled' : 
               'Expired'}
            </Text>
          </View>
        </View>
        
        <View style={styles.receiptRow}>
          <Text style={[styles.receiptLabel, { color: theme.colors.textSecondary }]}>
            Transaction ID
          </Text>
          <Text style={[styles.transactionId, { color: theme.colors.text }]}>
            {transactionId}
          </Text>
        </View>
        
        <View style={[styles.receiptDivider, { backgroundColor: theme.colors.divider }]} />
        
        <Text style={[styles.thankYouText, { color: theme.colors.text }]}>
          Thank you for your subscription!
        </Text>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleShareReceipt}
        >
          <Ionicons name="share-outline" size={20} color="white" />
          <Text style={styles.actionButtonText}>Share Receipt</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
          onPress={handleResendEmail}
          disabled={resendingReceipt}
        >
          {resendingReceipt ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <>
              <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>
                Email Receipt
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
        For any questions about your subscription, please contact support@thoughtswithgod.com
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    position: 'relative',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  receiptCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  receiptDivider: {
    height: 1,
    marginVertical: 16,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  receiptValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionId: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  thankYouText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '48%',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  helpText: {
    textAlign: 'center',
    fontSize: 12,
    marginHorizontal: 16,
    marginBottom: 24,
  },
});

export default ReceiptViewer;