import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { Icon } from '@/shared/utils/icons';
import { format } from 'date-fns';
import AppButton from '@/shared/components/ui/AppButton';
import { DateSelector, SectionTitle } from '@/shared/components/ui';
import { getInvoice, addInvoicePayment, deleteInvoicePayment } from '../invoices.service';
import { useProfileStore } from '@/shared/store/profileStore';
import { formatInvoiceCurrency, Invoice, InvoicePayment } from '@/shared/types/invoice';

type Props = NativeStackScreenProps<RootStackParamList, 'ReceivedPayments'>;

export default function ReceivedPaymentsScreen({ route, navigation }: Props) {
  const { invoiceId, totalAmount: totalParam, paidAmount: paidParam, currency: currencyParam } = route.params;
  const { theme } = useTheme();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);

  // The invoice (with its persisted payments) is the source of truth.
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Add-payment form
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const currency = invoice?.currency ?? currencyParam;
  const totalAmount = invoice?.totalAmount ?? totalParam ?? 0;
  const totalPaid = invoice?.paidAmount ?? paidParam ?? 0;
  const toPay = Math.max(0, totalAmount - totalPaid);
  const payments: InvoicePayment[] = invoice?.payments ?? [];
  const isFullyPaid = totalAmount > 0 && toPay <= 0.001;

  const formatCurrency = (amount: number) => formatInvoiceCurrency(amount, currency);

  const loadInvoice = useCallback(async () => {
    if (!activeBusiness?.id) return;
    try {
      const data = await getInvoice(activeBusiness.id, invoiceId);
      setInvoice(data);
    } catch (error) {
      console.error('Error loading invoice payments:', error);
      AppAlert.alert('Error', 'Failed to load payments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id, invoiceId]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const recordPayment = async (amount: number, date: Date) => {
    if (!activeBusiness?.id) return;
    setBusy(true);
    try {
      const updated = await addInvoicePayment(activeBusiness.id, invoiceId, {
        amount,
        date: format(date, 'yyyy-MM-dd'),
      });
      setInvoice(updated);
    } catch (error) {
      console.error('Error recording payment:', error);
      AppAlert.alert('Error', 'Failed to record payment. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(newPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      AppAlert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }
    if (amount > toPay + 0.001) {
      AppAlert.alert('Amount Too High', `The payment amount exceeds the remaining balance of ${formatCurrency(toPay)}.`);
      return;
    }
    await recordPayment(amount, newPaymentDate);
    setNewPaymentAmount('');
    setNewPaymentDate(new Date());
    setShowAddPayment(false);
  };

  const handleMarkFullyPaid = async () => {
    if (toPay <= 0.001) return;
    await recordPayment(toPay, new Date());
  };

  const handleDeletePayment = (payment: InvoicePayment) => {
    if (!activeBusiness?.id) return;
    AppAlert.alert(
      'Remove Payment',
      `Remove the ${formatCurrency(payment.amount)} payment from ${format(new Date(payment.date), 'MMM dd, yyyy')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const updated = await deleteInvoicePayment(activeBusiness.id, invoiceId, payment.id);
              setInvoice(updated);
            } catch (error) {
              console.error('Error removing payment:', error);
              AppAlert.alert('Error', 'Failed to remove payment. Please try again.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const goBack = () => navigation.goBack();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Received Payments" leftAction={{ icon: 'chevron-left', onPress: goBack }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <SecondaryHeader title="Received Payments" leftAction={{ icon: 'chevron-left', onPress: goBack }} />

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

        {/* Fully Paid action / status */}
        <TouchableOpacity
          style={[styles.toggleCard, { backgroundColor: theme.colors.cardBackground }]}
          onPress={handleMarkFullyPaid}
          activeOpacity={isFullyPaid ? 1 : 0.7}
          disabled={isFullyPaid || busy}
        >
          <View style={styles.toggleContent}>
            <Icon
              name={isFullyPaid ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={isFullyPaid ? theme.colors.success : theme.colors.textSecondary}
            />
            <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
              {isFullyPaid ? 'Fully Paid' : 'Mark fully paid'}
            </Text>
          </View>
          {!isFullyPaid && <Icon name="chevron-forward" size={20} color={theme.colors.textSecondary} />}
        </TouchableOpacity>

        {/* Persisted Payment History */}
        {payments.length > 0 && (
          <View style={[styles.paymentsSection, { backgroundColor: theme.colors.cardBackground }]}>
            <SectionTitle style={{ marginBottom: 12 }}>Payment History</SectionTitle>
            {payments.map((payment, index) => (
              <View
                key={payment.id}
                style={[
                  styles.paymentItem,
                  index < payments.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.borderColor },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paymentAmount, { color: theme.colors.text }]}>
                    {formatCurrency(payment.amount)}
                  </Text>
                  <Text style={[styles.paymentDate, { color: theme.colors.textSecondary }]}>
                    {format(new Date(payment.date), 'MMM dd, yyyy')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeletePayment(payment)}
                  disabled={busy}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.deleteBtn}
                >
                  <Icon name="trash-outline" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Add Partial Payment Section */}
        {!isFullyPaid && (
          <View style={[styles.addPaymentSection, { backgroundColor: theme.colors.cardBackground }]}>
            {!showAddPayment ? (
              <AppButton
                title="Add Partial Payment"
                onPress={() => setShowAddPayment(true)}
                variant="outline"
                fullWidth
                iconLeft="add-circle-outline"
                disabled={busy}
              />
            ) : (
              <View style={styles.addPaymentForm}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Partial Payment</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    borderColor: theme.colors.borderColor,
                  }]}
                  placeholder="Enter amount"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                  value={newPaymentAmount}
                  onChangeText={setNewPaymentAmount}
                />

                <Text style={[styles.formLabel, { color: theme.colors.text, marginTop: 16 }]}>Date</Text>
                <TouchableOpacity
                  style={[styles.input, styles.datePickerButton, {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderColor,
                  }]}
                  onPress={() => setShowDatePicker(!showDatePicker)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 15 }}>
                    {format(newPaymentDate, 'dd MMM yyyy')}
                  </Text>
                  <Icon name="calendar-outline" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                {showDatePicker && (
                  <View style={{ marginTop: 8, marginBottom: 8 }}>
                    <DateSelector
                      value={newPaymentDate}
                      onChange={(date) => {
                        setNewPaymentDate(date);
                        setShowDatePicker(false);
                      }}
                      maxDate={new Date()}
                    />
                  </View>
                )}

                <AppButton
                  title="Add"
                  onPress={handleAddPayment}
                  variant="primary"
                  fullWidth
                  loading={busy}
                  disabled={busy}
                  style={styles.addButton}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Done Button */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.borderColor }]}>
        <AppButton title="Done" onPress={goBack} variant="primary" fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderBottomColor: '#ECE6DF',
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
  paymentsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
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
  deleteBtn: {
    padding: 4,
  },
  addPaymentSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  addPaymentForm: {},
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
  datePickerButton: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    marginTop: 16,
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
