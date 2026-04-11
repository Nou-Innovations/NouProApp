/**
 * TasksScreen - Business Mode
 * Lists all tasks for the current business with filtering, search, and status counts.
 * Follows the DeliveryScreen pattern.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import themeConstants from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import FilterBar from '@/shared/components/ui/FilterBar';
import { EmptyState } from '@/shared/components/ui';
import { TaskCard } from '../components/TaskCard';
import { useTasks, TaskFilterTab } from '../hooks/useTasks';
import type { Task } from '@/shared/types/task';

const FILTER_TABS: TaskFilterTab[] = ['all', 'TODO', 'IN_PROGRESS', 'COMPLETED', 'overdue'];

const FILTER_LABELS: Record<string, string> = {
  all: 'All',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  overdue: 'Overdue',
};

export default function TasksScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();

  const {
    filteredTasks,
    loading,
    refreshing,
    error,
    filterTab,
    todoCount,
    inProgressCount,
    completedCount,
    overdueCount,
    setFilterTab,
    refresh,
  } = useTasks();

  const handleCreateTask = () => {
    // @ts-ignore
    navigation.navigate('CreateTask', { businessId: '' }); // businessId resolved by hook
  };

  const handleTaskPress = (task: Task) => {
    // @ts-ignore
    navigation.navigate('TaskDetail', { taskId: task.id, businessId: task.businessId });
  };

  const mapTaskType = (type: string): 'delivery' | 'order' | 'invoice' | 'general' | 'inventory' => {
    const lower = type.toLowerCase();
    if (lower === 'delivery') return 'delivery';
    if (lower === 'order') return 'order';
    if (lower === 'invoice') return 'invoice';
    if (lower === 'inventory') return 'inventory';
    return 'general';
  };

  const mapTaskStatus = (status: string): 'pending' | 'in_progress' | 'completed' | 'cancelled' => {
    if (status === 'TODO') return 'pending';
    if (status === 'IN_PROGRESS') return 'in_progress';
    if (status === 'COMPLETED') return 'completed';
    if (status === 'CANCELLED') return 'cancelled';
    return 'pending';
  };

  const renderTask = ({ item }: { item: Task }) => (
    <TaskCard
      id={item.id}
      title={item.title}
      description={item.description}
      type={mapTaskType(item.type)}
      status={mapTaskStatus(item.status)}
      priority={item.priority}
      dueDate={item.dueDate}
      assignedAt={item.createdAt}
      onPress={() => handleTaskPress(item)}
    />
  );

  const renderStatsRow = () => (
    <View style={styles.statsRow}>
      <View style={[styles.statBox, { backgroundColor: '#FEF3C7' }]}>
        <Text style={styles.statCount}>{todoCount}</Text>
        <Text style={styles.statLabel}>To Do</Text>
      </View>
      <View style={[styles.statBox, { backgroundColor: '#DBEAFE' }]}>
        <Text style={styles.statCount}>{inProgressCount}</Text>
        <Text style={styles.statLabel}>In Progress</Text>
      </View>
      <View style={[styles.statBox, { backgroundColor: '#DCFCE7' }]}>
        <Text style={styles.statCount}>{completedCount}</Text>
        <Text style={styles.statLabel}>Done</Text>
      </View>
      {overdueCount > 0 && (
        <View style={[styles.statBox, { backgroundColor: '#FEE2E2' }]}>
          <Text style={[styles.statCount, { color: '#EF4444' }]}>{overdueCount}</Text>
          <Text style={[styles.statLabel, { color: '#EF4444' }]}>Overdue</Text>
        </View>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Tasks" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.text} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Tasks"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />

      {renderStatsRow()}

      <FilterBar
        statuses={FILTER_TABS.map((t) => FILTER_LABELS[t])}
        selectedStatus={FILTER_LABELS[filterTab]}
        onSelectStatus={(label) => {
          const tab = FILTER_TABS.find((t) => FILTER_LABELS[t] === label) || 'all';
          setFilterTab(tab);
        }}
      />

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: appTheme.colors.error }]}>{error}</Text>
          <TouchableOpacity onPress={refresh}>
            <Text style={[styles.retryText, { color: appTheme.colors.text }]}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          subtitle="Create your first task to get started"
          iconName="checkbox-outline"
          ctaLabel="New Task"
          onCtaPress={handleCreateTask}
        />
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateTask} activeOpacity={0.8}>
        <Icon name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statCount: {
    fontSize: 20,
    fontFamily: themeConstants.fonts.primary.bold,
    color: '#333333',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: themeConstants.fonts.primary.medium,
    color: '#666666',
    marginTop: 2,
  },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, fontFamily: themeConstants.fonts.primary.medium, textAlign: 'center' },
  retryText: { fontSize: 14, fontFamily: themeConstants.fonts.primary.regular, marginTop: 8 },
  listContent: { paddingBottom: 100 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
});
