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
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Icon, iconMap } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import AppButton from '@/shared/components/ui/AppButton';

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
    <View style={styles.itemContainer}>
      <View style={[styles.skeletonDot, { backgroundColor: appTheme.colors.borderColor, marginRight: 12 }]} />
      <View style={styles.itemContent}>
        <View style={[styles.skeletonTitle, { backgroundColor: appTheme.colors.borderColor }]} />
        <View style={[styles.skeletonTime, { backgroundColor: appTheme.colors.borderColor }]} />
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
            Recent Activity
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
            Recent Activity
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
            Recent Activity
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
              title="View all activity"
              onPress={onSeeAll}
              variant="outline"
              size="small"
              disabled={true}
            />
          </View>
        )}
      </View>
    );
  }

  const renderItem = ({ item }: { item: ActivityItem }) => {
    const config = TYPE_CONFIG[item.type];

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={item.onPress}
        activeOpacity={item.onPress ? 0.7 : 1}
        disabled={!item.onPress}
      >
        {/* Icon box - same color logic as notifications */}
        <View style={[styles.iconBox, { backgroundColor: config.color + '20' }]}>
          <Icon name={config.icon} size={20} color={config.color} />
        </View>
        
        {/* Content */}
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: appTheme.colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description && (
            <Text style={[styles.itemDescription, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          <Text style={[styles.timestamp, { color: appTheme.colors.textMuted }]}>
            {item.timestamp}
          </Text>
        </View>
        
        {/* Arrow if pressable */}
        {item.onPress && (
          <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
          Recent Activity
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
            title="View all activity"
            onPress={onSeeAll || (() => {})}
            variant="outline"
            size="small"
          />
        </View>
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
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
  },
  timelineContainer: {
    marginHorizontal: theme.spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  listContent: {
    paddingVertical: 4,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    lineHeight: 20,
  },
  itemDescription: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  timestamp: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  seeAllButtonContainer: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
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
    paddingVertical: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
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
  skeletonDot: {
    width: 36,
    height: 36,
    borderRadius: 8,
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
    marginTop: 4,
  },
});

export default ProActivityTimeline;

