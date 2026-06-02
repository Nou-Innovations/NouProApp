/**
 * OrderCard Component
 * Displays a B2B order in a list format
 * Used in OrdersScreen for both incoming and outgoing orders
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { OrderWithItems } from '@/shared/types/order';
import type { OrderStatus } from '@/shared/constants/orderStatus';
import { formatRelativeTime, formatCurrency } from '@/shared/utils/format';
import { ListItemCard, OrderStatusBadge } from '@/shared/components/ui';
import { Text } from '@/shared/components/ui/Typography';

interface OrderCardProps {
  order: OrderWithItems;
  type: 'incoming' | 'outgoing';
  onPress: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, type, onPress }) => {
  const { theme: appTheme } = useTheme();

  // Counterparty name.
  // - incoming (we are the seller): show the buyer (business or walk-in customer)
  // - outgoing (we are the buyer): show the seller, surfaced by the placed-orders
  //   endpoint as sellerBusinessName.
  const businessName =
    type === 'incoming'
      ? order.buyerBusinessName || order.customerName || 'Customer'
      : order.sellerBusinessName || 'Supplier order';

  // Item summary (defensive against empty items)
  const items = order.items || [];
  const itemCount = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemSummary =
    itemCount === 0
      ? 'No items'
      : itemCount === 1
      ? `${items[0].productName || 'Item'} × ${items[0].quantity}`
      : `${itemCount} items (${totalQuantity} units)`;

  // Format time
  const timeAgo = formatRelativeTime(order.createdAt);

  // Bottom row with status badge and total price
  const bottomRow = (
    <View style={styles.bottomRow}>
      <OrderStatusBadge status={order.status as OrderStatus} size="sm" />
      <Text style={[styles.totalPrice, { color: appTheme.colors.text }]}>
        {formatCurrency(order.totalAmount ?? 0)}
      </Text>
    </View>
  );

  return (
    <ListItemCard
      avatar={{
        type: 'initials',
        userId: order.id,
        userName: businessName,
        borderRadius: 12,
      }}
      title={businessName}
      subtitle={`#${order.id.slice(-6)}`}
      extraInfo={itemSummary}
      rightRow1={{ timestamp: timeAgo }}
      showChevron
      bottomElement={bottomRow}
      onPress={onPress}
      showDivider
    />
  );
};

const styles = StyleSheet.create({
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalPrice: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
});

export default React.memo(OrderCard);
