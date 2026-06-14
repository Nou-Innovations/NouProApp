/**
 * OrderOptionsList
 * The "More actions" section on the Order Details screen. Renders the
 * secondary navigational options as themed ListItemCard rows grouped in a
 * single card. Payment & Delivery are NOT here — they are promoted to inline
 * status cards on the screen. The set is filtered by role: buyers only get
 * Notes + History (Assign/Invoice are seller-only; Chat is the buyer's
 * primary action).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { ListItemCard } from '@/shared/components/ui';
import { Text } from '@/shared/components/ui/Typography';
import type { Order } from '@/shared/types/order';

type OrderOptionType = 'assign' | 'invoice' | 'chat' | 'notes' | 'history';

type OrderOptionsListProps = {
  order: Order;
  onOptionPress: (type: string) => void;
  isSeller: boolean;
  unreadMessages?: number;
};

export default function OrderOptionsList({
  order,
  onOptionPress,
  isSeller,
  unreadMessages = 0,
}: OrderOptionsListProps) {
  const { theme: appTheme } = useTheme();

  const sellerOptions: {
    type: OrderOptionType;
    title: string;
    description: string;
    icon: string;
    iconColor: string;
    badge?: number;
  }[] = [
    {
      type: 'assign',
      title: 'Assign order',
      description: order.fulfillmentLocationId ? 'Reassign to a staff member' : 'Assign to a staff member',
      icon: 'user-plus',
      iconColor: appTheme.colors.info,
    },
    {
      type: 'invoice',
      title: 'View invoice',
      description: 'View and manage the order invoice',
      icon: 'file-text',
      iconColor: appTheme.colors.warning,
    },
    {
      type: 'chat',
      title: 'Chat',
      description: 'Communicate with the client',
      icon: 'message-circle',
      iconColor: appTheme.colors.info,
      badge: unreadMessages,
    },
    {
      type: 'notes',
      title: 'Order notes',
      description: order.notes ? 'View order notes' : 'No notes on this order',
      icon: 'clipboard',
      iconColor: appTheme.colors.textSecondary,
    },
    {
      type: 'history',
      title: 'Order history',
      description: 'View order status history',
      icon: 'clock',
      iconColor: appTheme.colors.textSecondary,
    },
  ];

  const buyerOptions = sellerOptions.filter((o) => o.type === 'notes' || o.type === 'history');
  const options = isSeller ? sellerOptions : buyerOptions;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.sectionLabel, { color: appTheme.colors.textSecondary }]}>MORE</Text>
      <View style={[styles.card, { borderColor: appTheme.colors.borderColor }]}>
        {options.map((option, index) => (
          <ListItemCard
            key={option.type}
            avatar={{
              type: 'icon',
              icon: option.icon,
              iconColor: option.iconColor,
              backgroundColor: `${option.iconColor}1A`,
            }}
            title={option.title}
            subtitle={option.description}
            showChevron
            rightRow1={
              option.badge && option.badge > 0
                ? { statusPill: { text: String(option.badge), color: appTheme.colors.accent } }
                : undefined
            }
            onPress={() => onOptionPress(option.type)}
            showDivider={index < options.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: theme.spacing.lg },
  sectionLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.semiBold,
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
    marginLeft: 4,
  },
  card: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
