/**
 * ProActivityTimeline - Business Mode Activity Feed
 * Lightweight timeline showing recent business activity
 * Keep it concise - operational updates, not social feed
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Icon, iconMap } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import AppButton from '@/shared/components/ui/AppButton';
import { ListItemCard, Skeleton, SkeletonRow, SkeletonColumn } from '@/shared/components/ui';
import { formatActivityTime } from '@/features/business/activity.service';

type IconName = keyof typeof iconMap;

export type ActivityType = 
  | 'order_created' 
  | 'order_confirmed'
  | 'delivery_completed' 
  | 'delivery_started'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'product_added'
  | 'stock_updated'
  | 'message_received';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: string;
  relatedId?: string;
  onPress?: () => void;
}

interface ProActivityTimelineProps {
  items: ActivityItem[];
  isLoading?: boolean;
  error?: string | null;
  maxItems?: number;
  onSeeAll?: () => void;
}

const TYPE_CONFIG: Record<ActivityType, { icon: IconName; color: string }> = {
  order_created: { icon: 'cart', color: '#007AFF' },
  order_confirmed: { icon: 'checkmark-circle', color: '#34C759' },
  delivery_completed: { icon: 'checkmark-done', color: '#34C759' },
  delivery_started: { icon: 'car', color: '#FF9500' },
  invoice_sent: { icon: 'send', color: '#9C27B0' },
  invoice_paid: { icon: 'cash', color: '#34C759' },
  product_added: { icon: 'add-circle', color: '#007AFF' },
  stock_updated: { icon: 'cube', color: '#FF9500' },
  message_received: { icon: 'mail', color: '#007AFF' },
};

export function ProActivityTimeline({ 
  items, 
  isLoading, 
  error, 
  maxItems = 10,
  onSeeAll,
}: ProActivityTimelineProps) {
  const { theme: appTheme } = useTheme();

  const renderSkeletonItem = () => (
    <SkeletonRow gap={12} style={{ paddingVertical: 12, paddingHorizontal: 8 }}>
      <Skeleton width={48} height={48} borderRadius={8} />
      <SkeletonColumn gap={4} style={{ flex: 1 }}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="30%" height={14} />
      </SkeletonColumn>
    </SkeletonRow>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
            Recent Activities
          </Text>
        </View>
        <View style={styles.timelineContainer}>
          {[1, 2, 3, 4, 5].map((_, index) => (
            <React.Fragment key={index}>{renderSkeletonItem()}</React.Fragment>
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
            Recent Activities
          </Text>
        </View>
        <View style={[styles.errorContainer, { backgroundColor: appTheme.colors.surface }]}>
          <Icon name="alert-circle-outline" size={24} color={appTheme.colors.error} />
          <Text style={[styles.errorText, { color: appTheme.colors.error }]}>
            Unable to load activity
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
            Recent Activities
          </Text>
        </View>
        <View style={[styles.emptyContainer, { backgroundColor: appTheme.colors.surface }]}>
          <Icon name="time-outline" size={32} color={appTheme.colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: appTheme.colors.textMuted }]}>
            No activity yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: appTheme.colors.textMuted }]}>
            Your recent business activity will appear here
          </Text>
        </View>
        {onSeeAll && (
          <View style={styles.seeAllButtonContainer}>
            <AppButton
              title="View all activities"
              onPress={onSeeAll}
              variant="outline"
              disabled
            />
          </View>
        )}
      </View>
    );
  }

  const renderItem = ({ item }: { item: ActivityItem }) => {
    const config = TYPE_CONFIG[item.type];

    return (
      <ListItemCard
        avatar={{
          type: 'icon',
          icon: config.icon,
          iconColor: config.color,
          backgroundColor: config.color + '20',
        }}
        title={item.title}
        subtitle={item.description}
        rightRow1={{ timestamp: formatActivityTime(item.timestamp) }}
        showChevron={!!item.onPress}
        onPress={item.onPress}
        showDivider={false}
        style={{ backgroundColor: 'transparent' }}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
          Recent Activities
        </Text>
      </View>
      
      <View style={[styles.timelineContainer, { backgroundColor: appTheme.colors.surface }]}>
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      </View>
      
      {(hasMore || onSeeAll) && (
        <View style={styles.seeAllButtonContainer}>
          <AppButton
            title="View all activities"
            onPress={onSeeAll || (() => {})}
            variant="outline"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
  },
  timelineContainer: {
    marginHorizontal: 0,
    borderRadius: 0,
    overflow: 'hidden',
  },
  listContent: {
    paddingVertical: 4,
  },
  seeAllButtonContainer: {
    paddingHorizontal: 12,
    marginTop: theme.spacing.sm,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    marginHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  errorText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    marginHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  skeletonDot: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
    gap: 4,
  },
  skeletonTitle: {
    width: '70%',
    height: 16,
    borderRadius: 4,
  },
  skeletonTime: {
    width: '30%',
    height: 14,
    borderRadius: 4,
  },
});

export default ProActivityTimeline;

