/**
 * AllActivityScreen - View all business activity
 * Full screen list of all activity items with search functionality
 * Accessed from "View all activity" button on Pro Home
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import SecondaryHeader from '@/shared/components/layout/headers/SecondaryHeader';
import { ListItemCard } from '@/shared/components/ui';
import theme from '@/shared/theme';

// Types
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

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: string;
  relatedId?: string;
}

// Type configuration for icons and colors
const TYPE_CONFIG: Record<ActivityType, { icon: string; color: string; label: string }> = {
  order_created: { icon: 'cart', color: '#007AFF', label: 'Order' },
  order_confirmed: { icon: 'checkmark-circle', color: '#34C759', label: 'Order' },
  delivery_completed: { icon: 'checkmark-done', color: '#34C759', label: 'Delivery' },
  delivery_started: { icon: 'car', color: '#FF9500', label: 'Delivery' },
  invoice_sent: { icon: 'send', color: '#9C27B0', label: 'Invoice' },
  invoice_paid: { icon: 'cash', color: '#34C759', label: 'Invoice' },
  product_added: { icon: 'add-circle', color: '#007AFF', label: 'Product' },
  stock_updated: { icon: 'cube', color: '#FF9500', label: 'Stock' },
  message_received: { icon: 'mail', color: '#007AFF', label: 'Message' },
};

// Mock data - comprehensive activity list
const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'order_created',
    title: 'Order #1235 created',
    description: 'Global Distributors - Rs 8,500',
    timestamp: '5 min ago',
    relatedId: '1235',
  },
  {
    id: 'act-2',
    type: 'delivery_completed',
    title: 'Delivery #455 completed',
    description: 'Premium Foods Ltd',
    timestamp: '25 min ago',
    relatedId: '455',
  },
  {
    id: 'act-3',
    type: 'invoice_sent',
    title: 'Invoice #INV-790 sent',
    description: 'ABC Corporation - Rs 12,000',
    timestamp: '1 hour ago',
    relatedId: '790',
  },
  {
    id: 'act-4',
    type: 'product_added',
    title: 'New product added',
    description: 'Coconut Water 500ml',
    timestamp: '2 hours ago',
    relatedId: 'cw-500',
  },
  {
    id: 'act-5',
    type: 'delivery_started',
    title: 'Delivery #457 started',
    description: 'Fresh Farms - Route A',
    timestamp: '3 hours ago',
    relatedId: '457',
  },
  {
    id: 'act-6',
    type: 'order_confirmed',
    title: 'Order #1234 confirmed',
    description: 'Island Grocers - Rs 15,200',
    timestamp: '4 hours ago',
    relatedId: '1234',
  },
  {
    id: 'act-7',
    type: 'invoice_paid',
    title: 'Invoice #INV-785 paid',
    description: 'Metro Mart - Rs 45,000',
    timestamp: '5 hours ago',
    relatedId: '785',
  },
  {
    id: 'act-8',
    type: 'stock_updated',
    title: 'Stock updated',
    description: 'Orange Juice 1L - 500 units added',
    timestamp: '6 hours ago',
    relatedId: 'oj-1l',
  },
  {
    id: 'act-9',
    type: 'delivery_completed',
    title: 'Delivery #453 completed',
    description: 'SuperValue Stores',
    timestamp: 'Yesterday',
    relatedId: '453',
  },
  {
    id: 'act-10',
    type: 'order_created',
    title: 'Order #1233 created',
    description: 'QuickStop - Rs 3,200',
    timestamp: 'Yesterday',
    relatedId: '1233',
  },
  {
    id: 'act-11',
    type: 'message_received',
    title: 'New message from supplier',
    description: 'Regarding bulk order discount',
    timestamp: 'Yesterday',
    relatedId: 'msg-001',
  },
  {
    id: 'act-12',
    type: 'product_added',
    title: 'New product added',
    description: 'Mango Smoothie 330ml',
    timestamp: '2 days ago',
    relatedId: 'ms-330',
  },
  {
    id: 'act-13',
    type: 'invoice_sent',
    title: 'Invoice #INV-784 sent',
    description: 'Fresh Mart - Rs 8,750',
    timestamp: '2 days ago',
    relatedId: '784',
  },
  {
    id: 'act-14',
    type: 'delivery_started',
    title: 'Delivery #450 started',
    description: 'City Center Mall - Route B',
    timestamp: '3 days ago',
    relatedId: '450',
  },
  {
    id: 'act-15',
    type: 'stock_updated',
    title: 'Low stock alert resolved',
    description: 'Apple Juice 500ml - restocked',
    timestamp: '3 days ago',
    relatedId: 'aj-500',
  },
];

export default function AllActivityScreen() {
  const navigation = useNavigation<any>();
  const { theme: appTheme } = useTheme();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Filter activity based on search
  const filteredActivity = useMemo(() => {
    if (!search.trim()) return MOCK_ACTIVITY;
    
    const searchLower = search.toLowerCase();
    return MOCK_ACTIVITY.filter(item => 
      item.title.toLowerCase().includes(searchLower) ||
      (item.description?.toLowerCase().includes(searchLower)) ||
      TYPE_CONFIG[item.type].label.toLowerCase().includes(searchLower)
    );
  }, [search]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  // Handle activity item press
  const handleItemPress = (item: ActivityItem) => {
    switch (item.type) {
      case 'order_created':
      case 'order_confirmed':
      case 'delivery_completed':
      case 'delivery_started':
        navigation.navigate('DeliveryDetail', { deliveryId: item.relatedId });
        break;
      case 'invoice_sent':
      case 'invoice_paid':
        navigation.navigate('InvoiceDetails', { invoiceId: item.relatedId });
        break;
      case 'product_added':
      case 'stock_updated':
        navigation.navigate('ProductDetail', { productId: item.relatedId });
        break;
      case 'message_received':
        navigation.navigate('InboxOverlay');
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
        rightRow1={{ timestamp: item.timestamp }}
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
