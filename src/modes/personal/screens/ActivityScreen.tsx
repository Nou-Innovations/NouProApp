/**
 * ActivityScreen - Personal Mode
 * List of personal tasks/deliveries assigned to the user
 * Shows limited delivery details for staff members
 * Based on app-logic.json navigation.personalProfileTabs.Activity
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { get } from '@/shared/services/api';
import PrimaryHeader from '@/shared/components/layout/headers/PrimaryHeader';
import FilterBar from '@/features/search/components/FilterBar';
import TaskCard, { TaskType, TaskStatus } from '@/features/tasks/components/TaskCard';
import { EmptyState } from '@/shared/components/ui';

// Filter options
const FILTER_OPTIONS = ['All', 'New', 'Assigned', 'Ongoing', 'Delivered'];

// Activity type from backend
interface DeliveryActivity {
  id: string;
  type: 'delivery';
  createdAt: string;
  delivery: {
    id: string;
    companyId: string;
    locationId: string | null;
    clientName: string | null;
    clientAddress: string | null;
    itemCount: number;
    totalAmount: number;
    deliveryStatus: string;
    expectedDeliveryDateTime: string | null;
    transportMode: string | null;
  };
}

export default function ActivityScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const currentUser = useProfileStore((state) => state.currentUser);
  const userBusinesses = useProfileStore((state) => state.userBusinesses);

  const [activities, setActivities] = useState<DeliveryActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch activities from backend
  const loadActivities = useCallback(async () => {
    if (!currentUser?.id) {
      setActivities([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await get<{ activities: DeliveryActivity[] }>(`/users/${currentUser.id}/activities`);
      setActivities(response.activities || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  // Load on mount
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Map filter labels to delivery status values
  const getStatusFromFilter = (filterValue: string): string | null => {
    const statusMap: Record<string, string | null> = {
      'All': null,
      'New': 'new',
      'Assigned': 'assigned',
      'Ongoing': 'ongoing',
      'Delivered': 'delivered',
    };
    return statusMap[filterValue] ?? null;
  };

  // Filter activities
  const filteredActivities = useMemo(() => {
    const status = getStatusFromFilter(filter);
    if (!status) return activities;
    return activities.filter((a) => a.delivery.deliveryStatus === status);
  }, [filter, activities]);

  // Calculate stats from real data
  const stats = useMemo(() => {
    return {
      new: activities.filter((a) => a.delivery.deliveryStatus === 'new' || a.delivery.deliveryStatus === 'assigned').length,
      ongoing: activities.filter((a) => a.delivery.deliveryStatus === 'ongoing').length,
      delivered: activities.filter((a) => a.delivery.deliveryStatus === 'delivered').length,
    };
  }, [activities]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  }, [loadActivities]);

  const handleActivityPress = (activity: DeliveryActivity) => {
    // Navigate to Personal Delivery Detail screen
    // Uses taskId format to match existing navigation type
    // @ts-ignore - Navigation type will be updated separately
    navigation.navigate('PersonalDeliveryDetail', { 
      taskId: activity.delivery.id,
      businessId: activity.delivery.companyId,
      hasFullAccess: false, // Staff always has limited access
    });
  };


  // Map delivery status to TaskCard status
  const mapDeliveryStatusToTaskStatus = (deliveryStatus: string): TaskStatus => {
    const statusMap: Record<string, TaskStatus> = {
      'new': 'pending',
      'assigned': 'pending',
      'ongoing': 'in_progress',
      'delivered': 'completed',
      'pending': 'pending',
    };
    return statusMap[deliveryStatus] || 'pending';
  };

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
        <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.new}</Text>
        <Text style={[styles.statLabel, { color: '#92400E' }]}>Pending</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
        <Text style={[styles.statNumber, { color: '#0EA5E9' }]}>{stats.ongoing}</Text>
        <Text style={[styles.statLabel, { color: '#1E40AF' }]}>Ongoing</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#DCFCE7' }]}>
        <Text style={[styles.statNumber, { color: '#22C55E' }]}>{stats.delivered}</Text>
        <Text style={[styles.statLabel, { color: '#166534' }]}>Delivered</Text>
      </View>
    </View>
  );

  const renderActivityItem = ({ item }: { item: DeliveryActivity }) => (
    <TaskCard
      id={item.id}
      title={`Delivery to ${item.delivery.clientName || 'Customer'}`}
      description={item.delivery.clientAddress || 'Address pending'}
      type="delivery"
      status={mapDeliveryStatusToTaskStatus(item.delivery.deliveryStatus)}
      businessName={item.delivery.companyId}
      dueDate={item.delivery.expectedDeliveryDateTime || undefined}
      assignedAt={item.createdAt}
      onPress={() => handleActivityPress(item)}
    />
  );

  const renderEmptyState = () => (
    <EmptyState
      iconName="list"
      title={filter === 'All' ? 'No recent activity' : `No ${filter.toLowerCase()} deliveries`}
      subtitle={
        userBusinesses.length > 0
          ? 'Your interactions and actions will appear here once you get started.'
          : 'Join a business to receive deliveries and see your activity.'
      }
      ctaLabel={userBusinesses.length === 0 ? 'Explore Businesses' : undefined}
      onCtaPress={userBusinesses.length === 0 ? () => navigation.navigate('Explore' as never) : undefined}
      testID="empty-activity"
    />
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={appTheme.colors.primary} />
      <Text style={[styles.loadingText, { color: appTheme.colors.textLight }]}>
        Loading activities...
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: appTheme.colors.background }]}
        edges={['top']}
      >
        <PrimaryHeader title="Activities" />
        {renderLoading()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <PrimaryHeader title="Activities" />
      {renderStatsCards()}
      <FilterBar
        statuses={FILTER_OPTIONS}
        selectedStatus={filter}
        onSelectStatus={setFilter}
      />
      <FlatList
        data={filteredActivities}
        keyExtractor={(item) => item.id}
        renderItem={renderActivityItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={appTheme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  screenTitle: {
    fontSize: 32,
    fontFamily: theme.fonts.primary.bold,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.primary.medium,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontFamily: theme.fonts.primary.bold,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  joinButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
});
