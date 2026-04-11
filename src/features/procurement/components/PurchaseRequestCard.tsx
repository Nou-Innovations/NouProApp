/**
 * PurchaseRequestCard Component
 * Displays a purchase request in a list format with priority pill,
 * status pill, supplier, items count, total amount, and date.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import Pill from '@/shared/components/ui/Pill';
import { Icon } from '@/shared/utils/icons';
import {
  type PurchaseRequest,
  PR_STATUS_COLORS,
  PR_STATUS_LABELS,
  PR_PRIORITY_COLORS,
  PR_PRIORITY_LABELS,
} from '@/shared/types/procurement';

interface PurchaseRequestCardProps {
  request: PurchaseRequest;
  onPress?: () => void;
}

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const PurchaseRequestCard: React.FC<PurchaseRequestCardProps> = ({ request, onPress }) => {
  const { theme: appTheme } = useTheme();

  const itemCount = request.items.length;
  const totalAmount = request.totalAmount;

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
      {/* Header: PR ID + Date */}
      <View style={styles.header}>
        <Text
          style={[styles.prId, { color: appTheme.colors.text }]}
          numberOfLines={1}
        >
          {request.id}
        </Text>
        <Text style={[styles.date, { color: appTheme.colors.textSecondary }]}>
          {formatDate(request.createdAt)}
        </Text>
      </View>

      {/* Supplier name */}
      {request.supplier?.name ? (
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
            {request.supplier.name}
          </Text>
        </View>
      ) : null}

      {/* Items count + Total amount */}
      <View style={styles.detailRow}>
        <Icon
          name="cube-outline"
          size={16}
          color={appTheme.colors.textSecondary}
          style={styles.detailIcon}
        />
        <Text style={[styles.detailText, { color: appTheme.colors.text }]}>
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
          {totalAmount != null ? ` - $${totalAmount.toFixed(2)}` : ''}
        </Text>
      </View>

      {/* Footer: Priority pill + Status pill */}
      <View style={styles.footer}>
        <View style={styles.pillRow}>
          <Pill
            text={PR_PRIORITY_LABELS[request.priority] || request.priority}
            color={PR_PRIORITY_COLORS[request.priority] || appTheme.colors.neutral}
          />
          <Pill
            text={PR_STATUS_LABELS[request.status] || request.status}
            color={PR_STATUS_COLORS[request.status] || appTheme.colors.neutral}
          />
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
  prId: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.bold,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  date: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.primary.regular,
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

export default React.memo(PurchaseRequestCard);
