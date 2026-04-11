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
import { formatRelativeTime, formatCurrency } from '@/shared/data/mockOrders';
import { ListItemCard, OrderStatusBadge } from '@/shared/components/ui';
import { Text } from '@/shared/components/ui/Typography';

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
      <OrderStatusBadge status={order.status as OrderStatus} size="sm" />
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
  totalPrice: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
});

export default OrderCard;
