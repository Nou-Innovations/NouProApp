/**
 * DashboardScreen - Personal Mode Dashboard
 * Replaces Inbox tab in Personal mode
 * Shows user's activity overview, orders, and personal analytics
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import PrimaryHeader from '@/shared/components/layout/headers/PrimaryHeader';

// Activity item types
interface ActivityItem {
  id: string;
  type: 'order' | 'delivery' | 'connection' | 'favorite';
  title: string;
  subtitle: string;
  timestamp: string;
  status?: 'pending' | 'completed' | 'cancelled';
  onPress?: () => void;
}

// Mock activity data
const mockActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'order',
    title: 'Order from NouPro Distribution',
    subtitle: '3 items - Rs 850',
    timestamp: '2 hours ago',
    status: 'pending',
  },
  {
    id: '2',
    type: 'delivery',
    title: 'Delivery scheduled',
    subtitle: 'From Fresh Farms - Today 4:00 PM',
    timestamp: '5 hours ago',
    status: 'pending',
  },
  {
    id: '3',
    type: 'connection',
    title: 'Connected with Global Supply Co.',
    subtitle: 'You can now order from them',
    timestamp: '1 day ago',
    status: 'completed',
  },
  {
    id: '4',
    type: 'order',
    title: 'Order from Island Fresh',
    subtitle: '5 items - Rs 1,250',
    timestamp: '3 days ago',
    status: 'completed',
  },
];

// Stats for the dashboard
interface DashboardStats {
  activeOrders: number;
  pendingDeliveries: number;
  totalConnections: number;
  favoriteProducts: number;
}

const mockStats: DashboardStats = {
  activeOrders: 2,
  pendingDeliveries: 1,
  totalConnections: 45,
  favoriteProducts: 12,
};

const TYPE_CONFIG = {
  order: { icon: 'cart-outline' as const, color: '#0075FF' },
  delivery: { icon: 'car-outline' as const, color: '#2ACF01' },
  connection: { icon: 'people-outline' as const, color: '#A76AF0' },
  favorite: { icon: 'heart-outline' as const, color: '#FF6B6B' },
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#FFB600' },
  completed: { label: 'Completed', color: '#2ACF01' },
  cancelled: { label: 'Cancelled', color: '#FF2400' },
};

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const currentUser = useProfileStore((state) => state.currentUser);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);


  const renderStatsGrid = () => (
    <View style={styles.statsGrid}>
      <TouchableOpacity
        style={[styles.statCard, { backgroundColor: appTheme.colors.surface }]}
        activeOpacity={0.7}
      >
        <View style={[styles.statIcon, { backgroundColor: '#0075FF15' }]}>
          <Icon name="cart-outline" size={20} color="#0075FF" />
        </View>
        <Text style={[styles.statValue, { color: appTheme.colors.text }]}>
          {mockStats.activeOrders}
        </Text>
        <Text style={[styles.statLabel, { color: appTheme.colors.textSecondary }]}>
          Active Orders
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.statCard, { backgroundColor: appTheme.colors.surface }]}
        activeOpacity={0.7}
      >
        <View style={[styles.statIcon, { backgroundColor: '#2ACF0115' }]}>
          <Icon name="car-outline" size={20} color="#2ACF01" />
        </View>
        <Text style={[styles.statValue, { color: appTheme.colors.text }]}>
          {mockStats.pendingDeliveries}
        </Text>
        <Text style={[styles.statLabel, { color: appTheme.colors.textSecondary }]}>
          Deliveries
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.statCard, { backgroundColor: appTheme.colors.surface }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Connections' as never, { userId: currentUser?.id } as never)}
      >
        <View style={[styles.statIcon, { backgroundColor: '#A76AF015' }]}>
          <Icon name="people-outline" size={20} color="#A76AF0" />
        </View>
        <Text style={[styles.statValue, { color: appTheme.colors.text }]}>
          {mockStats.totalConnections}
        </Text>
        <Text style={[styles.statLabel, { color: appTheme.colors.textSecondary }]}>
          Connections
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.statCard, { backgroundColor: appTheme.colors.surface }]}
        activeOpacity={0.7}
      >
        <View style={[styles.statIcon, { backgroundColor: '#FF6B6B15' }]}>
          <Icon name="heart-outline" size={20} color="#FF6B6B" />
        </View>
        <Text style={[styles.statValue, { color: appTheme.colors.text }]}>
          {mockStats.favoriteProducts}
        </Text>
        <Text style={[styles.statLabel, { color: appTheme.colors.textSecondary }]}>
          Favorites
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderActivityItem = (item: ActivityItem) => {
    const config = TYPE_CONFIG[item.type];
    const statusConfig = item.status ? STATUS_CONFIG[item.status] : null;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.activityItem,
          { 
            backgroundColor: appTheme.colors.surface,
            borderColor: appTheme.colors.borderColor,
          },
        ]}
        activeOpacity={0.7}
        onPress={item.onPress}
      >
        <View style={[styles.activityIcon, { backgroundColor: `${config.color}15` }]}>
          <Icon name={config.icon} size={20} color={config.color} />
        </View>
        
        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <Text 
              style={[styles.activityTitle, { color: appTheme.colors.text }]} 
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {statusConfig && (
              <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}15` }]}>
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
            )}
          </View>
          <Text 
            style={[styles.activitySubtitle, { color: appTheme.colors.textSecondary }]} 
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>
          <Text style={[styles.activityTime, { color: appTheme.colors.textMuted }]}>
            {item.timestamp}
          </Text>
        </View>
        
        <Icon name="chevron-forward" size={16} color={appTheme.colors.iconMuted} />
      </TouchableOpacity>
    );
  };

  const renderActivitySection = () => (
    <View style={styles.activitySection}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
          Recent Activity
        </Text>
        <TouchableOpacity>
          <Text style={[styles.seeAllText, { color: appTheme.colors.primary }]}>
            See all
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.activityList}>
        {mockActivity.map(renderActivityItem)}
      </View>
    </View>
  );

  const renderEmptyActivity = () => (
    <View style={[styles.emptyContainer, { backgroundColor: appTheme.colors.surface }]}>
      <Icon name="clipboard-outline" size={48} color={appTheme.colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: appTheme.colors.text }]}>
        No recent activity
      </Text>
      <Text style={[styles.emptySubtitle, { color: appTheme.colors.textSecondary }]}>
        Your orders, deliveries, and connections will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={appTheme.colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <PrimaryHeader title="Dashboard" />
        {renderStatsGrid()}
        {mockActivity.length > 0 ? renderActivitySection() : renderEmptyActivity()}
        
        {/* Bottom spacing for tab bar */}
        <View style={{ height: theme.spacing.xl + 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.md,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.primary.bold,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    gap: 12,
    marginTop: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
  },
  activitySection: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  activityList: {
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    gap: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.semiBold,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: theme.fonts.primary.medium,
  },
  activitySubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
  },
  activityTime: {
    fontSize: 11,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.xxl,
    borderRadius: 12,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
});

