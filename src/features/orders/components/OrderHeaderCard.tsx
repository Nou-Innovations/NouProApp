/**
 * OrderHeaderCard
 * Hero summary card at the top of the Order Details screen: counterparty
 * avatar + name, a meta line (date · item count), the order status badge,
 * and the prominent order total. Purely presentational.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { Avatar, OrderStatusBadge } from '@/shared/components/ui';
import { Text } from '@/shared/components/ui/Typography';
import { formatCurrency } from '@/shared/utils/format';
import type { OrderStatus } from '@/shared/constants/orderStatus';

interface OrderHeaderCardProps {
  counterpartyName: string;
  /** Seed for the deterministic avatar color/initials */
  avatarSeedId: string;
  /** e.g. "12 Mar 2024 · 2 items (150 units)" */
  metaLine: string;
  status: OrderStatus;
  totalAmount: number;
}

const OrderHeaderCard: React.FC<OrderHeaderCardProps> = ({
  counterpartyName,
  avatarSeedId,
  metaLine,
  status,
  totalAmount,
}) => {
  const { theme: appTheme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor },
      ]}
    >
      <View style={styles.topRow}>
        <Avatar userId={avatarSeedId} userName={counterpartyName} size={52} />
        <View style={styles.identity}>
          <Text style={[styles.name, { color: appTheme.colors.text }]} numberOfLines={1}>
            {counterpartyName}
          </Text>
          {!!metaLine && (
            <Text style={[styles.meta, { color: appTheme.colors.textMuted }]} numberOfLines={1}>
              {metaLine}
            </Text>
          )}
        </View>
        <OrderStatusBadge status={status} size="md" />
      </View>

      <View style={[styles.divider, { backgroundColor: appTheme.colors.surface }]} />

      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, { color: appTheme.colors.textSecondary }]}>Order total</Text>
        <Text style={[styles.totalValue, { color: appTheme.colors.text }]}>
          {formatCurrency(totalAmount)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  identity: { flex: 1, marginLeft: theme.spacing.sm + 4, marginRight: theme.spacing.sm },
  name: { fontSize: 18, fontFamily: theme.fonts.primary.bold },
  meta: { fontSize: 13, fontFamily: theme.fonts.primary.medium, marginTop: 2 },
  divider: { height: 1, marginVertical: theme.spacing.md },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  totalLabel: { fontSize: 14, fontFamily: theme.fonts.primary.medium },
  totalValue: { fontSize: 24, fontFamily: theme.fonts.primary.bold },
});

export default React.memo(OrderHeaderCard);
