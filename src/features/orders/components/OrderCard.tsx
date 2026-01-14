/**
 * OrderCard Component
 * Displays a B2B order in a list format
 * Used in OrdersScreen for both incoming and outgoing orders
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { OrderWithItems, OrderStatus, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/shared/types/order';
import { formatRelativeTime, formatCurrency } from '@/shared/data/mockOrders';

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

  // Get first letter for avatar placeholder
  const avatarLetter = businessName?.charAt(0).toUpperCase() || '?';

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

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { 
          backgroundColor: appTheme.colors.cardBackground,
          borderBottomColor: appTheme.colors.borderColor,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left Section - Avatar */}
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(businessName || '') }]}>
        <Text style={styles.avatarText}>{avatarLetter}</Text>
      </View>

      {/* Middle Section - Order Info */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.businessName, { color: appTheme.colors.text }]} numberOfLines={1}>
            {businessName}
          </Text>
          <Text style={[styles.time, { color: appTheme.colors.textSecondary }]}>
            {timeAgo}
          </Text>
        </View>

        <Text style={[styles.orderId, { color: appTheme.colors.textSecondary }]}>
          {order.id}
        </Text>

        <Text style={[styles.itemSummary, { color: appTheme.colors.text }]} numberOfLines={1}>
          {itemSummary}
        </Text>

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
      </View>

      {/* Right Section - Arrow */}
      <View style={styles.arrowContainer}>
        <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
      </View>
    </TouchableOpacity>
  );
};

/**
 * Generate a consistent color based on business name using theme.avatarColors
 */
const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return theme.avatarColors[Math.abs(hash) % theme.avatarColors.length];
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
    color: theme.colors.textInverse,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  businessName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
  },
  orderId: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 4,
  },
  itemSummary: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 8,
  },
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
  arrowContainer: {
    paddingLeft: 4,
  },
});

export default OrderCard;




