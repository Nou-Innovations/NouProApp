import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { Text } from '@/shared/components/ui/Typography';
import Pill from '@/shared/components/ui/Pill';
import { Payment, PaymentProcessingStatus } from '@/shared/types/payment';
import { CURRENCY } from '@/shared/types/subscription';

const STATUS_COLORS: Record<PaymentProcessingStatus, string> = {
  PENDING: '#F2A900',
  PROCESSING: '#2A75E6',
  SUCCEEDED: '#34A853',
  FAILED: '#D6453E',
  CANCELED: '#57534E',
  REFUNDED: '#8B5CF6',
};

const TYPE_LABELS = {
  SUBSCRIPTION: 'Subscription',
  INVOICE_PAYMENT: 'Invoice Payment',
};

interface PaymentCardProps {
  payment: Payment;
}

export default function PaymentCard({ payment }: PaymentCardProps) {
  const { theme: appTheme } = useTheme();

  const formattedDate = new Date(payment.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={[styles.card, { backgroundColor: appTheme.colors.background, borderColor: appTheme.colors.borderColor }]}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={[styles.type, { color: appTheme.colors.text }]}>
            {TYPE_LABELS[payment.type]}
          </Text>
          {payment.description && (
            <Text style={[styles.description, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
              {payment.description}
            </Text>
          )}
          <Text style={[styles.date, { color: appTheme.colors.textSecondary }]}>
            {formattedDate}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: appTheme.colors.text }]}>
            {CURRENCY.symbol} {payment.amount.toLocaleString()}
          </Text>
          <Pill text={payment.status} color={STATUS_COLORS[payment.status]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  type: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  description: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  date: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 4,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  amount: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
  },
});
