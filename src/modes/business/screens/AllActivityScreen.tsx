/**
 * AllActivityScreen - View all business activity
 * Full screen list of all activity items with search functionality
 * Accessed from "View all activity" button on Pro Home
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import SecondaryHeader from '@/shared/components/layout/headers/SecondaryHeader';
import { ListItemCard } from '@/shared/components/ui';
import theme from '@/shared/theme';
import { getActivityFeed, ActivityItem as APIActivityItem, formatActivityTime } from '@/features/business/activity.service';
import { useProfileStore } from '@/shared/store/profileStore';

// Types - use API types with added UI properties
export type ActivityType = APIActivityItem['type'];

interface ActivityItem extends APIActivityItem {
  relatedId?: string;
}

// Type configuration for icons and colors
const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  order_created: { icon: 'cart', color: '#007AFF', label: 'Order' },
  order_confirmed: { icon: 'checkmark-circle', color: '#34C759', label: 'Order' },
  delivery_completed: { icon: 'checkmark-done', color: '#34C759', label: 'Delivery' },
  delivery_started: { icon: 'car', color: '#FF9500', label: 'Delivery' },
  delivery_pending: { icon: 'time', color: '#FFB600', label: 'Delivery' },
  delivery_canceled: { icon: 'close-circle', color: '#FF3B30', label: 'Delivery' },
  invoice_sent: { icon: 'send', color: '#9C27B0', label: 'Invoice' },
  invoice_paid: { icon: 'cash', color: '#34C759', label: 'Invoice' },
  product_added: { icon: 'add-circle', color: '#007AFF', label: 'Product' },
  stock_updated: { icon: 'cube', color: '#FF9500', label: 'Stock' },
  message_received: { icon: 'mail', color: '#007AFF', label: 'Message' },
};

export default function AllActivityScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Profile store
  const activeBusiness = useProfileStore((state) => state.activeBusiness);

  // Fetch activities from API
  const fetchActivities = useCallback(async () => {
    if (!activeBusiness?.id) return;
    
    try {
      setLoading(true);
      const data = await getActivityFeed(activeBusiness.id, { limit: 50 });
      setActivities(data);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id]);

  // Load on mount
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Filter activity based on search
  const filteredActivity = useMemo(() => {
    if (!search.trim()) return activities;
    
    const searchLower = search.toLowerCase();
    return activities.filter(item => 
      item.title.toLowerCase().includes(searchLower) ||
      (item.description?.toLowerCase().includes(searchLower)) ||
      (TYPE_CONFIG[item.type]?.label.toLowerCase().includes(searchLower))
    );
  }, [search, activities]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  }, [fetchActivities]);

  // Handle activity item press - use entityType and entityId from API
  const handleItemPress = (item: ActivityItem) => {
    switch (item.entityType) {
      case 'invoice':
        navigation.navigate('InvoiceDetails', { invoiceId: item.entityId });
        break;
      case 'delivery':
        navigation.navigate('DeliveryDetail', { deliveryId: item.entityId });
        break;
      case 'order':
        navigation.navigate('DeliveryDetail', { deliveryId: item.entityId });
        break;
      case 'product':
        navigation.navigate('ProductDetail', { productId: item.entityId });
        break;
      default:
        console.log('Activity pressed:', item.id);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigation.goBack();
  };

  // Handle search
  const handleSearchChange = (text: string) => {
    setSearch(text);
  };

  const handleClearSearch = () => {
    setSearch('');
  };

  // Render activity item
  const renderItem = ({ item }: { item: ActivityItem }) => {
    const config = TYPE_CONFIG[item.type] || { icon: 'information-circle', color: '#6B7280', label: 'Activity' };

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
        showChevron
        onPress={() => handleItemPress(item)}
        showDivider
      />
    );
  };

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="search" size={48} color={appTheme.colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: appTheme.colors.text }]}>
        No results found
      </Text>
      <Text style={[styles.emptySubtitle, { color: appTheme.colors.textSecondary }]}>
        Try adjusting your search terms
      </Text>
    </View>
  );

  return (
    <SafeAreaView 
      style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} 
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <SecondaryHeader
        title="All Activity"
        leftAction={{
          icon: 'chevron-back',
          onPress: handleBack,
          accessibilityLabel: 'Go back',
        }}
      />

      {/* Search Bar */}
      <AppSearchBar 
        placeholder="Search activity"
        value={search}
        onChangeText={handleSearchChange}
        onClear={handleClearSearch}
      />

      {/* Activity List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: appTheme.colors.textSecondary }]}>
            Loading activities...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredActivity}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={appTheme.colors.primary}
            />
          }
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            filteredActivity.length === 0 && styles.listContentEmpty
          ]}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing.lg,
  },
  listContentEmpty: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    marginTop: theme.spacing.md,
  },
  // Empty state (unchanged)
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
});
