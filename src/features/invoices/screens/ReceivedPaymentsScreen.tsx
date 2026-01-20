import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { Icon } from '@/shared/utils/icons';
import { format } from 'date-fns';
import AppButton from '@/shared/components/ui/AppButton';
import { recordInvoicePayments } from '../invoices.service';
import { useProfileStore } from '@/shared/store/profileStore';

type Props = NativeStackScreenProps<RootStackParamList, 'ReceivedPayments'>;

interface PartialPayment {
  id: string;
  amount: number;
  date: string;
}

export default function ReceivedPaymentsScreen({ route, navigation }: Props) {
  const { invoiceId, totalAmount, paidAmount: initialPaidAmount } = route.params;
  const { theme } = useTheme();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  
  // State
  const [payments, setPayments] = useState<PartialPayment[]>([]);
  const [isFullyPaid, setIsFullyPaid] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Calculate totals
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0) + initialPaidAmount;
  const toPay = Math.max(0, totalAmount - totalPaid);
  
  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toFixed(2)}`;
  };

  const handleAddPayment = () => {
    const amount = parseFloat(newPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }
    
    if (amount > toPay) {
      Alert.alert('Amount Too High', `The payment amount exceeds the remaining balance of ${formatCurrency(toPay)}.`);
      return;
    }
    
    const newPayment: PartialPayment = {
      id: `payment-${Date.now()}`,
      amount,
      date: newPaymentDate,
    };
    
    setPayments([...payments, newPayment]);
    setNewPaymentAmount('');
    setShowAddPayment(false);
    
    // Check if fully paid
    if (totalPaid + amount >= totalAmount) {
      setIsFullyPaid(true);
    }
  };

  const handleToggleFullyPaid = () => {
    if (!isFullyPaid) {
      // Mark as fully paid - add remaining amount as payment
      if (toPay > 0) {
        const finalPayment: PartialPayment = {
          id: `payment-${Date.now()}`,
          amount: toPay,
          date: format(new Date(), 'yyyy-MM-dd'),
        };
        setPayments([...payments, finalPayment]);
      }
    }
    setIsFullyPaid(!isFullyPaid);
  };

  const handleDone = async () => {
    if (!activeBusiness?.id) {
      Alert.alert('Error', 'No active business selected');
      return;
    }
    try {
      await recordInvoicePayments(activeBusiness.id, invoiceId, payments, isFullyPaid);
      navigation.goBack();
    } catch (error) {
      console.error('Error saving payments:', error);
      Alert.alert('Error', 'Failed to save payments. Please try again.');
    }
  };

  const goBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Received Payments"
        leftAction={{ icon: 'chevron-left', onPress: goBack }}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Summary Section */}
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.cardBackground }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Total</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{formatCurrency(totalAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Paid</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.success }]}>{formatCurrency(totalPaid)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowLast]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>To Pay</Text>
            <Text style={[styles.summaryValue, { color: toPay > 0 ? theme.colors.error : theme.colors.success }]}>
              {formatCurrency(toPay)}
            </Text>
          </View>
        </View>

        {/* Fully Paid Toggle */}
        <TouchableOpacity 
          style={[styles.toggleCard, { backgroundColor: theme.colors.cardBackground }]}
          onPress={handleToggleFullyPaid}
          activeOpacity={0.7}
        >
          <View style={styles.toggleContent}>
            <Icon 
              name={isFullyPaid ? 'checkmark-circle' : 'ellipse-outline'} 
              size={24} 
              color={isFullyPaid ? theme.colors.success : theme.colors.textSecondary} 
            />
            <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>Fully Paid</Text>
          </View>
          <View style={[
            styles.toggleIndicator, 
            { backgroundColor: isFullyPaid ? theme.colors.success : theme.colors.surface }
          ]}>
            <View style={[
              styles.toggleDot,
              { backgroundColor: 'white', left: isFullyPaid ? 22 : 2 }
            ]} />
          </View>
        </TouchableOpacity>

        {/* Payments List */}
        {payments.length > 0 && (
          <View style={[styles.paymentsSection, { backgroundColor: theme.colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Payment History</Text>
            {payments.map((payment, index) => (
              <View 
                key={payment.id} 
                style={[
                  styles.paymentItem,
                  index < payments.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.borderColor }
                ]}
              >
                <View>
                  <Text style={[styles.paymentAmount, { color: theme.colors.text }]}>
                    {formatCurrency(payment.amount)}
                  </Text>
                  <Text style={[styles.paymentDate, { color: theme.colors.textSecondary }]}>
                    {format(new Date(payment.date), 'MMM dd, yyyy')}
                  </Text>
                </View>
                <Icon name="checkmark-circle" size={20} color={theme.colors.success} />
              </View>
            ))}
          </View>
        )}

        {/* Add Partial Payment Section */}
        {!isFullyPaid && (
          <View style={[styles.addPaymentSection, { backgroundColor: theme.colors.cardBackground }]}>
            {!showAddPayment ? (
              <TouchableOpacity 
                style={[styles.addPaymentButton, { borderColor: theme.colors.primary }]}
                onPress={() => setShowAddPayment(true)}
                activeOpacity={0.7}
              >
                <Icon name="add-circle-outline" size={24} color={theme.colors.primary} />
                <Text style={[styles.addPaymentText, { color: theme.colors.primary }]}>
                  Add Partial Payment
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.addPaymentForm}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Partial Payment</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.colors.surface, 
                    color: theme.colors.text,
                    borderColor: theme.colors.borderColor 
                  }]}
                  placeholder="Enter amount"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                  value={newPaymentAmount}
                  onChangeText={setNewPaymentAmount}
                />
                
                <Text style={[styles.formLabel, { color: theme.colors.text, marginTop: 16 }]}>Date</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.colors.surface, 
                    color: theme.colors.text,
                    borderColor: theme.colors.borderColor 
                  }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newPaymentDate}
                  onChangeText={setNewPaymentDate}
                />
                
                <TouchableOpacity 
                  style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleAddPayment}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Done Button */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.borderColor }]}>
        <AppButton
          title="Done"
          onPress={handleDone}
          variant="primary"
          size="large"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  summaryCard: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  toggleCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleIndicator: {
    width: 44,
    height: 24,
    borderRadius: 12,
    position: 'relative',
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    top: 2,
  },
  paymentsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 14,
  },
  addPaymentSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  addPaymentText: {
    fontSize: 16,
    fontWeight: '500',
  },
  addPaymentForm: {
    
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  addButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
});
