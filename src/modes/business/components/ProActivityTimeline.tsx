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
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

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

const TYPE_CONFIG: Record<ActivityType, { icon: keyof typeof Icon.glyphMap; color: string }> = {
  order_created: { icon: 'cart-outline', color: '#0075FF' },
  order_confirmed: { icon: 'checkmark-circle-outline', color: '#2ACF01' },
  delivery_completed: { icon: 'checkmark-done-outline', color: '#2ACF01' },
  delivery_started: { icon: 'car-outline', color: '#0075FF' },
  invoice_sent: { icon: 'send-outline', color: '#A76AF0' },
  invoice_paid: { icon: 'cash-outline', color: '#2ACF01' },
  product_added: { icon: 'add-circle-outline', color: '#0075FF' },
  stock_updated: { icon: 'cube-outline', color: '#FFB600' },
  message_received: { icon: 'mail-outline', color: '#0075FF' },
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
      <View style={[styles.skeletonDot, { backgroundColor: appTheme.colors.borderColor }]} />
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
          <Text style={[styles.emptyText, { color: appTheme.colors.textMuted }]}>
            No recent activity
          </Text>
        </View>
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: ActivityItem; index: number }) => {
    const config = TYPE_CONFIG[item.type];
    const isLast = index === displayItems.length - 1;

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={item.onPress}
        activeOpacity={item.onPress ? 0.7 : 1}
        disabled={!item.onPress}
      >
        {/* Timeline dot and line */}
        <View style={styles.timelineLeft}>
          <View style={[styles.dot, { backgroundColor: config.color }]}>
            <Icon name={config.icon} size={12} color="#FFFFFF" />
          </View>
          {!isLast && (
            <View style={[styles.line, { backgroundColor: appTheme.colors.borderColor }]} />
          )}
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
          <Icon name="chevron-forward" size={16} color={appTheme.colors.textMuted} />
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
        <TouchableOpacity
          style={[styles.seeAllButton, { borderColor: appTheme.colors.borderColor }]}
          onPress={onSeeAll}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeAllText, { color: appTheme.colors.primary }]}>
            View all activity
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
    paddingVertical: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 12,
    width: 24,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginTop: 4,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    lineHeight: 18,
  },
  itemDescription: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
  },
  timestamp: {
    fontSize: 11,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
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
    paddingVertical: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    borderRadius: 12,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  skeletonDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  skeletonTitle: {
    width: '70%',
    height: 14,
    borderRadius: 4,
  },
  skeletonTime: {
    width: '30%',
    height: 10,
    borderRadius: 4,
    marginTop: 4,
  },
});

export default ProActivityTimeline;

