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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { get } from '@/shared/services/api';
import PrimaryHeader from '@/shared/components/layout/headers/PrimaryHeader';
import FilterBar from '@/features/search/components/FilterBar';
import TaskCard, { TaskStatus } from '@/features/tasks/components/TaskCard';
import { EmptyState, Skeleton, SkeletonRow, SkeletonListItem } from '@/shared/components/ui';
import type { RootStackParamList } from '@/shared/types/navigation';
import { DELIVERY_FILTER_TAB_STATUSES, type DeliveryStatus } from '@/shared/types/delivery';

// Filter options matching delivery filter tab pattern
const FILTER_OPTIONS = ['All', 'New', 'Pending', 'In Transit', 'Done', 'Canceled'];

const FILTER_TAB_MAP: Record<string, keyof typeof DELIVERY_FILTER_TAB_STATUSES | null> = {
  'All': null,
  'New': 'new',
  'Pending': 'pending',
  'In Transit': 'in_transit',
  'Done': 'done',
  'Canceled': 'canceled',
};

// Activity type from backend
interface DeliveryActivity {
  id: string;
  type: 'delivery';
  createdAt: string;
  delivery: {
    id: string;
    businessId: string;
    businessName: string | null;
    businessLogo: string | null;
    locationId: string | null;
    clientName: string | null;
    clientAddress: string | null;
    itemCount: number;
    totalAmount: number;
    deliveryStatus: DeliveryStatus;
    expectedDeliveryDateTime: string | null;
    transportMode: string | null;
  };
}

export default function ActivityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme: appTheme } = useTheme();
  const currentUser = useProfileStore((state) => state.currentUser);
  const userBusinesses = useProfileStore((state) => state.userBusinesses);

  const [activities, setActivities] = useState<DeliveryActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Unable to load activities');
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  // Load on mount
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Filter activities using shared delivery filter tab statuses
  const filteredActivities = useMemo(() => {
    const tabKey = FILTER_TAB_MAP[filter];
    if (!tabKey) return activities;
    const validStatuses = DELIVERY_FILTER_TAB_STATUSES[tabKey];
    return activities.filter((a) => validStatuses.includes(a.delivery.deliveryStatus));
  }, [filter, activities]);

  // Calculate stats from real data using correct enum values
  const stats = useMemo(() => ({
    pending: activities.filter((a) =>
      ['NOT_ASSIGNED', 'ASSIGNED', 'PACKED'].includes(a.delivery.deliveryStatus)
    ).length,
    ongoing: activities.filter((a) =>
      a.delivery.deliveryStatus === 'OUT_FOR_DELIVERY'
    ).length,
    delivered: activities.filter((a) =>
      a.delivery.deliveryStatus === 'DELIVERED'
    ).length,
  }), [activities]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  }, [loadActivities]);

  const handleActivityPress = (activity: DeliveryActivity) => {
    navigation.navigate('PersonalDeliveryDetail', {
      taskId: activity.delivery.id,
      businessId: activity.delivery.businessId,
      hasFullAccess: false,
    });
  };

  // Map delivery status to TaskCard status
  const mapDeliveryStatusToTaskStatus = (deliveryStatus: DeliveryStatus): TaskStatus => {
    const statusMap: Record<DeliveryStatus, TaskStatus> = {
      NOT_ASSIGNED: 'pending',
      ASSIGNED: 'pending',
      PACKED: 'in_progress',
      OUT_FOR_DELIVERY: 'in_progress',
      DELIVERED: 'completed',
      FAILED: 'cancelled',
      CANCELED: 'cancelled',
    };
    return statusMap[deliveryStatus] || 'pending';
  };

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <View style={[styles.statCard, { backgroundColor: appTheme.colors.statusPending + '20' }]}>
        <Text style={[styles.statNumber, { color: appTheme.colors.statusPending }]}>{stats.pending}</Text>
        <Text style={[styles.statLabel, { color: appTheme.colors.statusPending }]}>Pending</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: appTheme.colors.statusOngoing + '20' }]}>
        <Text style={[styles.statNumber, { color: appTheme.colors.statusOngoing }]}>{stats.ongoing}</Text>
        <Text style={[styles.statLabel, { color: appTheme.colors.statusOngoing }]}>Ongoing</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: appTheme.colors.statusDone + '20' }]}>
        <Text style={[styles.statNumber, { color: appTheme.colors.statusDone }]}>{stats.delivered}</Text>
        <Text style={[styles.statLabel, { color: appTheme.colors.statusDone }]}>Delivered</Text>
      </View>
    </View>
  );

  const renderActivityItem = ({ item }: { item: DeliveryActivity }) => {
    const resolvedBusinessName = item.delivery.businessName
      || userBusinesses.find(ub => ub.business.id === item.delivery.businessId)?.business.name
      || undefined;
    const resolvedBusinessLogo = item.delivery.businessLogo
      || userBusinesses.find(ub => ub.business.id === item.delivery.businessId)?.business.logo_url
      || undefined;

    return (
      <TaskCard
        id={item.id}
        title={`Delivery to ${item.delivery.clientName || 'Customer'}`}
        description={item.delivery.clientAddress || 'Address pending'}
        type="delivery"
        status={mapDeliveryStatusToTaskStatus(item.delivery.deliveryStatus)}
        businessName={resolvedBusinessName}
        businessLogo={resolvedBusinessLogo}
        dueDate={item.delivery.expectedDeliveryDateTime || undefined}
        assignedAt={item.createdAt}
        onPress={() => handleActivityPress(item)}
      />
    );
  };

  const renderEmptyState = () => (
    <EmptyState
      iconName="list"
      title={filter === 'All' ? 'No recent activity' : `No ${filter.toLowerCase()} deliveries`}
      subtitle={
        userBusinesses.length > 0
          ? 'Your interactions and actions will appear here once you get started.'
          : 'Join a business to receive deliveries and see your activity.'
      }
      testID="empty-activity"
    />
  );

  const renderLoadingSkeleton = () => (
    <View style={{ flex: 1 }}>
      {/* Stats cards skeleton */}
      <View style={styles.statsContainer}>
        {[1, 2, 3].map((_, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: appTheme.colors.surface }]}>
            <Skeleton width={40} height={24} borderRadius={6} />
            <Skeleton width={60} height={12} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
      {/* Filter bar skeleton */}
      <SkeletonRow gap={8} style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        {[60, 50, 70, 65, 75, 70].map((w, i) => (
          <Skeleton key={i} width={w} height={32} borderRadius={16} />
        ))}
      </SkeletonRow>
      {/* Task card skeletons */}
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonListItem key={i} avatarSize={48} avatarRadius={10} lines={2} showTimestamp />
      ))}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: appTheme.colors.background }]}
        edges={['top']}
      >
        <PrimaryHeader title="Activities" />
        {renderLoadingSkeleton()}
      </SafeAreaView>
    );
  }

  if (error && activities.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: appTheme.colors.background }]}
        edges={['top']}
      >
        <PrimaryHeader title="Activities" />
        <View style={[styles.errorContainer, { backgroundColor: appTheme.colors.surface }]}>
          <Icon name="alert-circle-outline" size={32} color={appTheme.colors.error} />
          <Text style={[styles.errorTitle, { color: appTheme.colors.error }]}>
            Unable to load activities
          </Text>
          <Text style={[styles.errorSubtitle, { color: appTheme.colors.textSecondary }]}>
            Please check your connection and try again
          </Text>
        </View>
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
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    marginHorizontal: theme.spacing.md,
    borderRadius: 12,
    gap: 4,
    marginTop: theme.spacing.lg,
  },
  errorTitle: {
    fontSize: theme.fontSize.lg,
    fontFamily: theme.fonts.primary.medium,
    marginTop: theme.spacing.sm,
  },
  errorSubtitle: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
});
