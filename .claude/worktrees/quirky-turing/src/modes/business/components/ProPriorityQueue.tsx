/**
 * ProPriorityQueue - Business Mode Priority Items
 * A stacked list showing "needs attention" items with status pills
 * Orders awaiting confirmation, pending deliveries, stock alerts, overdue invoices
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { Skeleton, SkeletonRow, SkeletonColumn } from '@/shared/components/ui';

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

const TYPE_CONFIG: Record<PriorityItemType, { icon: keyof typeof Icon.glyphMap; color: string; label: string }> = {
  order_pending: { icon: 'cart-outline', color: '#0075FF', label: 'Order' },
  delivery_pending: { icon: 'car-outline', color: '#FFB600', label: 'Delivery' },
  stock_alert: { icon: 'cube-outline', color: '#FF7A00', label: 'Stock' },
  invoice_overdue: { icon: 'receipt-text-outline', color: '#FF2400', label: 'Invoice' },
  message_urgent: { icon: 'mail-outline', color: '#A76AF0', label: 'Message' },
};

const URGENCY_COLORS = {
  high: '#FF2400',
  medium: '#FFB600',
  low: '#0075FF',
};

export function ProPriorityQueue({ 
  items, 
  isLoading, 
  error, 
  maxItems = 5,
  onSeeAll,
}: ProPriorityQueueProps) {
  const { theme: appTheme } = useTheme();

  const renderSkeletonItem = () => (
    <View style={[styles.itemContainer, { backgroundColor: appTheme.colors.surface }]}>
      <Skeleton width={40} height={40} borderRadius={10} style={{ marginLeft: 12 }} />
      <SkeletonColumn gap={4} style={{ flex: 1 }}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="80%" height={12} />
      </SkeletonColumn>
      <Skeleton width={60} height={28} borderRadius={6} />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
            Priority Queue
          </Text>
        </View>
        {[1, 2, 3].map((_, index) => (
          <React.Fragment key={index}>{renderSkeletonItem()}</React.Fragment>
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
            Priority Queue
          </Text>
        </View>
        <View style={[styles.errorContainer, { backgroundColor: appTheme.colors.surface }]}>
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
        <View style={styles.header}>
          <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
            Priority Queue
          </Text>
        </View>
        <View style={[styles.emptyContainer, { backgroundColor: appTheme.colors.surface }]}>
          <Icon name="checkmark-circle-outline" size={40} color={appTheme.colors.success} />
          <Text style={[styles.emptyTitle, { color: appTheme.colors.text }]}>
            All caught up!
          </Text>
          <Text style={[styles.emptySubtitle, { color: appTheme.colors.textSecondary }]}>
            No urgent items need your attention
          </Text>
        </View>
      </View>
    );
  }

  const renderItem = ({ item }: { item: PriorityItem }) => {
    const config = TYPE_CONFIG[item.type];
    const urgencyColor = URGENCY_COLORS[item.urgency];

    return (
      <TouchableOpacity
        style={[
          styles.itemContainer,
          { 
            backgroundColor: appTheme.colors.surface,
            borderColor: appTheme.colors.borderColor,
          },
        ]}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
        {/* Left urgency indicator */}
        <View style={[styles.urgencyBar, { backgroundColor: urgencyColor }]} />
        
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
          <Icon name={config.icon} size={20} color={config.color} />
        </View>
        
        {/* Content */}
        <View style={styles.itemContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.itemTitle, { color: appTheme.colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={[styles.typePill, { backgroundColor: `${config.color}15` }]}>
              <Text style={[styles.typeText, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
          </View>
          <Text style={[styles.itemSubtitle, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
            {item.subtitle}
          </Text>
          <Text style={[styles.timestamp, { color: appTheme.colors.textMuted }]}>
            {item.timestamp}
          </Text>
        </View>
        
        {/* Action button */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: appTheme.colors.primary }]}
          onPress={(e) => {
            e.stopPropagation();
            item.onAction();
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionText, { color: appTheme.colors.textInverse }]}>
            {item.actionLabel}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
          Priority Queue
        </Text>
        <View style={[styles.countBadge, { backgroundColor: appTheme.colors.accent }]}>
          <Text style={styles.countText}>{items.length}</Text>
        </View>
      </View>
      
      <FlatList
        data={displayItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        contentContainerStyle={styles.listContent}
      />
      
      {(hasMore || onSeeAll) && (
        <TouchableOpacity
          style={[styles.seeAllButton, { borderColor: appTheme.colors.borderColor }]}
          onPress={onSeeAll}
          activeOpacity={0.7}
        >
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
  container: {
    marginVertical: theme.spacing.sm,
  },
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
    paddingHorizontal: theme.spacing.md,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 0,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    overflow: 'hidden',
  },
  urgencyBar: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.semiBold,
    flex: 1,
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
  itemSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
  },
  timestamp: {
    fontSize: 11,
    fontFamily: theme.fonts.primary.regular,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.semiBold,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    borderRadius: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    marginHorizontal: theme.spacing.md,
    borderRadius: 12,
    gap: 8,
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
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginLeft: 12,
  },
  skeletonTitle: {
    width: '60%',
    height: 14,
    borderRadius: 4,
  },
  skeletonSubtitle: {
    width: '80%',
    height: 12,
    borderRadius: 4,
    marginTop: 4,
  },
  skeletonButton: {
    width: 60,
    height: 28,
    borderRadius: 6,
  },
});

export default ProPriorityQueue;

