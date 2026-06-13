/**
 * ProRecentActivity - Business Mode Recent Activity preview
 * A compact list of the latest business activity (invoices, deliveries, orders,
 * purchase orders/requests). "See all" opens the full Activities log.
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
import { Skeleton, SkeletonColumn } from '@/shared/components/ui';
import { formatActivityTime, type ActivityItem } from '@/features/business';

interface ProRecentActivityProps {
  items: ActivityItem[];
  isLoading?: boolean;
  maxItems?: number;
  onSeeAll?: () => void;
}

const ENTITY_CONFIG: Record<string, { icon: string; color: string }> = {
  invoice: { icon: 'receipt-text-outline', color: '#FF2400' },
  delivery: { icon: 'car-outline', color: '#FFB600' },
  order: { icon: 'cart-outline', color: '#0075FF' },
  product: { icon: 'cube-outline', color: '#2ACF01' },
  purchase_order: { icon: 'cart-outline', color: '#A76AF0' },
  purchase_request: { icon: 'clipboard-outline', color: '#A76AF0' },
};

const DEFAULT_CONFIG: { icon: string; color: string } = {
  icon: 'document-outline',
  color: '#575B66',
};

export function ProRecentActivity({
  items,
  isLoading,
  maxItems = 5,
  onSeeAll,
}: ProRecentActivityProps) {
  const { theme: appTheme } = useTheme();

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
        Recent Activity
      </Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7} style={styles.seeAllRow}>
          <Text style={[styles.seeAllText, { color: appTheme.colors.primary }]}>See all</Text>
          <Icon name="chevron-forward" size={16} color={appTheme.colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        {[1, 2, 3].map((_, index) => (
          <View
            key={index}
            style={[styles.itemContainer, { backgroundColor: appTheme.colors.surface, borderColor: 'transparent' }]}
          >
            <Skeleton width={40} height={40} borderRadius={10} />
            <SkeletonColumn gap={4} style={{ flex: 1 }}>
              <Skeleton width="60%" height={14} />
              <Skeleton width="80%" height={12} />
            </SkeletonColumn>
          </View>
        ))}
      </View>
    );
  }

  const displayItems = items.slice(0, maxItems);

  if (displayItems.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={[styles.emptyContainer, { backgroundColor: appTheme.colors.surface }]}>
          <Icon name="time-outline" size={28} color={appTheme.colors.textMuted} />
          <Text style={[styles.emptyText, { color: appTheme.colors.textSecondary }]}>
            No recent activity yet
          </Text>
        </View>
      </View>
    );
  }

  const renderItem = ({ item }: { item: ActivityItem }) => {
    const config = ENTITY_CONFIG[item.entityType] || DEFAULT_CONFIG;
    return (
      <View style={[styles.itemContainer, { backgroundColor: appTheme.colors.surface, borderColor: appTheme.colors.borderColor }]}>
        <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
          <Icon name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: appTheme.colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.itemSubtitle, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
            {item.description}
          </Text>
        </View>
        <Text style={[styles.timestamp, { color: appTheme.colors.textMuted }]}>
          {formatActivityTime(item.timestamp)}
        </Text>
      </View>
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
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        contentContainerStyle={styles.listContent}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
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
  timestamp: {
    fontSize: 11,
    fontFamily: theme.fonts.primary.regular,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    marginHorizontal: theme.spacing.md,
    borderRadius: 12,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
});

export default ProRecentActivity;
