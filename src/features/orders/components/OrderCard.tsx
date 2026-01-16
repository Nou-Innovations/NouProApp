/**
 * OrderCard Component
 * Displays a B2B order in a list format
 * Used in OrdersScreen for both incoming and outgoing orders
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { OrderWithItems, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/shared/types/order';
import { formatRelativeTime, formatCurrency } from '@/shared/data/mockOrders';
import { ListItemCard } from '@/shared/components/ui';

interface OrderCardProps {
  order: OrderWithItems;
  type: 'incoming' | 'outgoing';
  onPress: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, type, onPress }) => {
  const { theme: appTheme } = useTheme();

  // Get business name based on order type
  const businessName = type === 'incoming' 
    ? order.from_business_name 
    : order.to_business_name;

  // Get status color
  const statusColor = ORDER_STATUS_COLORS[order.status];
  const statusLabel = ORDER_STATUS_LABELS[order.status];

  // Get item summary
  const itemCount = order.items.length;
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const itemSummary = itemCount === 1 
    ? `${order.items[0].product_name} × ${order.items[0].quantity}`
    : `${itemCount} items (${totalQuantity} units)`;

  // Format time
  const timeAgo = formatRelativeTime(order.created_at);

  // Bottom row with status badge and total price
  const bottomRow = (
    <View style={styles.bottomRow}>
      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>
          {statusLabel}
        </Text>
      </View>
      <Text style={[styles.totalPrice, { color: appTheme.colors.text }]}>
        {formatCurrency(order.total_price)}
      </Text>
    </View>
  );

  return (
    <ListItemCard
      avatar={{
        type: 'initials',
        userId: order.id,
        userName: businessName || 'Unknown',
        borderRadius: 12,
      }}
      title={businessName || 'Unknown'}
      subtitle={order.id}
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.medium,
  },
  totalPrice: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
});

export default OrderCard;
