/**
 * ProPriorityQueue - Business Mode Priority Items
 * A "needs attention" list: orders awaiting confirmation, pending deliveries,
 * stock alerts, overdue invoices. Rendered as a borderless divided list — each
 * row is tappable (opens the related entity), with the timestamp above a type
 * pill on the right and a chevron to signal it's clickable.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { Skeleton, SkeletonColumn } from '@/shared/components/ui';

export type PriorityItemType =
  | 'order_pending'
  | 'delivery_pending'
  | 'stock_alert'
  | 'invoice_overdue'
  | 'message_urgent';

export interface PriorityItem {
  id: string;
  type: PriorityItemType;
  title: string;
  subtitle: string;
  timestamp: string;
  urgency: 'high' | 'medium' | 'low';
  actionLabel: string;
  onAction: () => void;
  onPress: () => void;
}

interface ProPriorityQueueProps {
  items: PriorityItem[];
  isLoading?: boolean;
  error?: string | null;
  maxItems?: number;
  onSeeAll?: () => void;
}

const TYPE_CONFIG: Record<PriorityItemType, { icon: string; color: string; label: string }> = {
  order_pending: { icon: 'cart-outline', color: theme.colors.info, label: 'Order' },
  delivery_pending: { icon: 'car-outline', color: theme.colors.warning, label: 'Delivery' },
  stock_alert: { icon: 'cube-outline', color: theme.colors.accent, label: 'Stock' },
  invoice_overdue: { icon: 'receipt-text-outline', color: theme.colors.error, label: 'Invoice' },
  message_urgent: { icon: 'mail-outline', color: theme.colors.statusInReview, label: 'Message' },
};

export function ProPriorityQueue({
  items,
  isLoading,
  error,
  maxItems = 5,
  onSeeAll,
}: ProPriorityQueueProps) {
  const { theme: appTheme } = useTheme();

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>Priority Queue</Text>
      {items.length > 0 && (
        <View style={[styles.countBadge, { backgroundColor: appTheme.colors.accent }]}>
          <Text style={styles.countText}>{items.length}</Text>
        </View>
      )}
    </View>
  );

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: appTheme.colors.borderColor }]} />
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.listContent}>
          {[0, 1, 2].map((i) => (
            <React.Fragment key={i}>
              {i > 0 && renderSeparator()}
              <View style={styles.row}>
                <Skeleton width={40} height={40} borderRadius={10} />
                <SkeletonColumn gap={6} style={{ flex: 1 }}>
                  <Skeleton width="55%" height={14} />
                  <Skeleton width="75%" height={12} />
                </SkeletonColumn>
                <SkeletonColumn gap={6} style={{ alignItems: 'flex-end' }}>
                  <Skeleton width={38} height={11} />
                  <Skeleton width={52} height={20} borderRadius={6} />
                </SkeletonColumn>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={[styles.stateCard, { backgroundColor: appTheme.colors.surface }]}>
          <Icon name="alert-circle-outline" size={24} color={appTheme.colors.error} />
          <Text style={[styles.errorText, { color: appTheme.colors.error }]}>
            Unable to load priority items
          </Text>
        </View>
      </View>
    );
  }

  const displayItems = items.slice(0, maxItems);
  const hasMore = items.length > maxItems;

  if (displayItems.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={[styles.stateCard, { backgroundColor: appTheme.colors.surface }]}>
          <Icon name="checkmark-circle-outline" size={40} color={appTheme.colors.success} />
          <Text style={[styles.emptyTitle, { color: appTheme.colors.text }]}>All caught up!</Text>
          <Text style={[styles.emptySubtitle, { color: appTheme.colors.textSecondary }]}>
            No urgent items need your attention
          </Text>
        </View>
      </View>
    );
  }

  const renderItem = ({ item }: { item: PriorityItem }) => {
    const config = TYPE_CONFIG[item.type];
    return (
      <TouchableOpacity style={styles.row} onPress={item.onPress} activeOpacity={0.6}>
        <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
          <Icon name={config.icon} size={20} color={config.color} />
        </View>

        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: appTheme.colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text
            style={[styles.itemSubtitle, { color: appTheme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>
        </View>

        <View style={styles.rightCol}>
          <Text style={[styles.timestamp, { color: appTheme.colors.textMuted }]}>
            {item.timestamp}
          </Text>
          <View style={[styles.typePill, { backgroundColor: `${config.color}15` }]}>
            <Text style={[styles.typeText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        <Icon name="chevron-forward" size={18} color={appTheme.colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={displayItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        ItemSeparatorComponent={renderSeparator}
        contentContainerStyle={styles.listContent}
      />
      {(hasMore || onSeeAll) && (
        <TouchableOpacity style={styles.seeAllButton} onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={[styles.seeAllText, { color: appTheme.colors.primary }]}>
            See all ({items.length})
          </Text>
          <Icon name="chevron-forward" size={16} color={appTheme.colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: theme.fonts.primary.bold,
  },
  listContent: {
    paddingHorizontal: theme.spacing.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.semiBold,
  },
  itemSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 5,
  },
  timestamp: {
    fontSize: 11,
    fontFamily: theme.fonts.primary.regular,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontFamily: theme.fonts.primary.medium,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    marginHorizontal: theme.spacing.sm,
    borderRadius: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
  },
});

export default ProPriorityQueue;
