/**
 * PurchaseOrderCard Component
 * Displays a purchase order in a list format with PO number,
 * supplier, items count, total amount, status pill, payment status pill,
 * and expected delivery date.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import Pill from '@/shared/components/ui/Pill';
import { Icon } from '@/shared/utils/icons';
import {
  type PurchaseOrder,
  PO_STATUS_COLORS,
  PO_STATUS_LABELS,
} from '@/shared/types/procurement';
import {
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  type PaymentStatus,
} from '@/shared/types/order';

interface PurchaseOrderCardProps {
  order: PurchaseOrder;
  currencySymbol?: string;
  onPress?: () => void;
}

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const PurchaseOrderCard: React.FC<PurchaseOrderCardProps> = ({
  order,
  currencySymbol = '$',
  onPress,
}) => {
  const { theme: appTheme } = useTheme();

  const itemCount = order.items.length;
  const displayId = order.poNumber || order.id;
  const paymentStatus = order.paymentStatus as PaymentStatus | undefined;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: appTheme.colors.cardBackground,
          borderBottomColor: appTheme.colors.borderColor,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header: PO Number/ID */}
      <View style={styles.header}>
        <Text
          style={[styles.poId, { color: appTheme.colors.text }]}
          numberOfLines={1}
        >
          {displayId}
        </Text>
      </View>

      {/* Supplier name */}
      {order.supplier?.name ? (
        <View style={styles.detailRow}>
          <Icon
            name="business-outline"
            size={16}
            color={appTheme.colors.textSecondary}
            style={styles.detailIcon}
          />
          <Text
            style={[styles.detailText, { color: appTheme.colors.text }]}
            numberOfLines={1}
          >
            {order.supplier.name}
          </Text>
        </View>
      ) : null}

      {/* Items count */}
      <View style={styles.detailRow}>
        <Icon
          name="cube-outline"
          size={16}
          color={appTheme.colors.textSecondary}
          style={styles.detailIcon}
        />
        <Text style={[styles.detailText, { color: appTheme.colors.text }]}>
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </Text>
      </View>

      {/* Total amount */}
      {order.totalAmount != null ? (
        <View style={styles.detailRow}>
          <Icon
            name="cash-outline"
            size={16}
            color={appTheme.colors.textSecondary}
            style={styles.detailIcon}
          />
          <Text style={[styles.detailText, styles.totalAmount, { color: appTheme.colors.text }]}>
            {currencySymbol}{order.totalAmount.toFixed(2)}
          </Text>
        </View>
      ) : null}

      {/* Expected delivery date */}
      {order.expectedDeliveryDate ? (
        <View style={styles.detailRow}>
          <Icon
            name="calendar-outline"
            size={16}
            color={appTheme.colors.textSecondary}
            style={styles.detailIcon}
          />
          <Text style={[styles.detailText, { color: appTheme.colors.text }]}>
            Expected: {formatDate(order.expectedDeliveryDate)}
          </Text>
        </View>
      ) : null}

      {/* Footer: Status pill + Payment status pill */}
      <View style={styles.footer}>
        <View style={styles.pillRow}>
          <Pill
            text={PO_STATUS_LABELS[order.status] || order.status}
            color={PO_STATUS_COLORS[order.status] || appTheme.colors.neutral}
          />
          {paymentStatus ? (
            <Pill
              text={PAYMENT_STATUS_LABELS[paymentStatus] || paymentStatus}
              color={PAYMENT_STATUS_COLORS[paymentStatus] || appTheme.colors.neutral}
            />
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  poId: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.bold,
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  detailIcon: {
    marginRight: theme.spacing.sm,
  },
  detailText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    flex: 1,
  },
  totalAmount: {
    fontFamily: theme.fonts.primary.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs + 2,
  },
});

export default React.memo(PurchaseOrderCard);
