/**
 * ActivityScreen - Personal Mode
 * List of personal tasks/deliveries assigned to the user
 * Shows limited delivery details for staff members
 * Based on app-logic.json navigation.personalProfileTabs.Activity
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
import FilterBar from '@/features/search/components/FilterBar';
import TaskCard, { TaskType, TaskStatus } from '@/features/tasks/components/TaskCard';

// Filter options
const FILTER_OPTIONS = ['All', 'Pending', 'In Progress', 'Completed'];

// Mock tasks data
const mockTasks: Array<{
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  businessName: string;
  businessLogo: string;
  businessId: string;
  dueDate?: string;
  assignedAt: string;
  hasFullAccess: boolean;
}> = [
  {
    id: 'task-1',
    title: 'Delivery to Port Louis',
    description: 'Deliver order #ORD-2025-001 to ABC Corporation',
    type: 'delivery',
    status: 'pending',
    businessName: 'NouPro Distribution',
    businessLogo: 'https://picsum.photos/seed/noupro/100/100',
    businessId: 'biz-001',
    dueDate: new Date(Date.now() + 7200000).toISOString(),
    assignedAt: new Date(Date.now() - 3600000).toISOString(),
    hasFullAccess: false,
  },
  {
    id: 'task-2',
    title: 'Process Order #ORD-2025-002',
    description: 'Review and confirm order from Fresh Farms',
    type: 'order',
    status: 'in_progress',
    businessName: 'NouPro Distribution',
    businessLogo: 'https://picsum.photos/seed/noupro/100/100',
    businessId: 'biz-001',
    assignedAt: new Date(Date.now() - 7200000).toISOString(),
    hasFullAccess: false,
  },
  {
    id: 'task-3',
    title: 'Invoice Review',
    description: 'Review invoice #INV-2025-003 before sending',
    type: 'invoice',
    status: 'pending',
    businessName: 'Global Supply Co.',
    businessLogo: 'https://picsum.photos/seed/global/100/100',
    businessId: 'biz-002',
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    assignedAt: new Date(Date.now() - 14400000).toISOString(),
    hasFullAccess: true,
  },
  {
    id: 'task-4',
    title: 'Delivery to Curepipe',
    description: 'Urgent delivery for Premium Foods Ltd',
    type: 'delivery',
    status: 'in_progress',
    businessName: 'NouPro Distribution',
    businessLogo: 'https://picsum.photos/seed/noupro/100/100',
    businessId: 'biz-001',
    dueDate: new Date(Date.now() - 3600000).toISOString(), // Overdue
    assignedAt: new Date(Date.now() - 28800000).toISOString(),
    hasFullAccess: false,
  },
  {
    id: 'task-5',
    title: 'Completed Delivery',
    description: 'Order delivered to Tech Solutions',
    type: 'delivery',
    status: 'completed',
    businessName: 'NouPro Distribution',
    businessLogo: 'https://picsum.photos/seed/noupro/100/100',
    businessId: 'biz-001',
    assignedAt: new Date(Date.now() - 86400000).toISOString(),
    hasFullAccess: false,
  },
  {
    id: 'task-6',
    title: 'Stock Check',
    description: 'Verify inventory levels at Warehouse A',
    type: 'general',
    status: 'completed',
    businessName: 'Global Supply Co.',
    businessLogo: 'https://picsum.photos/seed/global/100/100',
    businessId: 'biz-002',
    assignedAt: new Date(Date.now() - 172800000).toISOString(),
    hasFullAccess: true,
  },
];

export default function ActivityScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const currentUser = useProfileStore((state) => state.currentUser);
  const userBusinesses = useProfileStore((state) => state.userBusinesses);
  const switchToBusiness = useProfileStore((state) => state.switchToBusiness);

  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  // Map filter labels to status values
  const getStatusFromFilter = (filterValue: string): string | null => {
    const statusMap: Record<string, string | null> = {
      'All': null,
      'Pending': 'pending',
      'In Progress': 'in_progress',
      'Completed': 'completed',
    };
    return statusMap[filterValue] ?? null;
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const status = getStatusFromFilter(filter);
    if (!status) return mockTasks;
    return mockTasks.filter((task) => task.status === status);
  }, [filter]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      pending: mockTasks.filter((t) => t.status === 'pending').length,
      inProgress: mockTasks.filter((t) => t.status === 'in_progress').length,
      completed: mockTasks.filter((t) => t.status === 'completed').length,
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  const handleTaskPress = async (task: typeof mockTasks[0]) => {
    // Navigate to Personal Delivery Detail screen with limited info
    // @ts-ignore
    navigation.navigate('PersonalDeliveryDetail', { 
      taskId: task.id,
      businessId: task.businessId,
      hasFullAccess: task.hasFullAccess,
    });
  };


  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
        <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.pending}</Text>
        <Text style={[styles.statLabel, { color: '#92400E' }]}>Pending</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
        <Text style={[styles.statNumber, { color: '#0EA5E9' }]}>{stats.inProgress}</Text>
        <Text style={[styles.statLabel, { color: '#1E40AF' }]}>In Progress</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#DCFCE7' }]}>
        <Text style={[styles.statNumber, { color: '#22C55E' }]}>{stats.completed}</Text>
        <Text style={[styles.statLabel, { color: '#166534' }]}>Completed</Text>
      </View>
    </View>
  );

  const renderTaskItem = ({ item }: { item: typeof mockTasks[0] }) => (
    <TaskCard
      id={item.id}
      title={item.title}
      description={item.description}
      type={item.type}
      status={item.status}
      businessName={item.businessName}
      businessLogo={item.businessLogo}
      dueDate={item.dueDate}
      assignedAt={item.assignedAt}
      onPress={() => handleTaskPress(item)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="checkbox-outline" size={60} color={appTheme.colors.textLight} />
      <Text style={[styles.emptyTitle, { color: appTheme.colors.text }]}>
        {filter === 'All' ? 'No tasks yet' : `No ${filter.toLowerCase()} tasks`}
      </Text>
      <Text style={[styles.emptySubtitle, { color: appTheme.colors.textLight }]}>
        {userBusinesses.length > 0
          ? 'Tasks assigned to you will appear here'
          : 'Join a business to receive tasks'}
      </Text>
      {userBusinesses.length === 0 && (
        <TouchableOpacity
          style={[styles.joinButton, { backgroundColor: appTheme.colors.primary }]}
          onPress={() => navigation.navigate('Explore' as never)}
        >
          <Text style={styles.joinButtonText}>Explore Businesses</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <PrimaryHeader title="Activity" />
      {renderStatsCards()}
      <FilterBar
        statuses={FILTER_OPTIONS}
        selectedStatus={filter}
        onSelectStatus={setFilter}
      />
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTaskItem}
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
});
