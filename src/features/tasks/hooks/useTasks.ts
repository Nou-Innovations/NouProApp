/**
 * useTasks Hook
 *
 * React hook that connects TasksScreen to task data.
 *
 * Features:
 * - Fetches tasks for the active business
 * - Client-side filtering by status and search
 * - Count helpers (todoCount, inProgressCount, completedCount)
 * - Pull-to-refresh
 * - Error handling
 *
 * Follows the useDeliveries / useInvoices pattern.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';
import type { Task, TaskStatus, TaskFilters } from '@/shared/types/task';
import { getTasks, updateTaskStatus as updateStatus, deleteTask } from '../services/tasks.service';

// ============================================================================
// Types
// ============================================================================

export type TaskFilterTab = 'all' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'overdue';

interface UseTasksOptions {
  /** Auto-fetch on mount (default true) */
  autoFetch?: boolean;
  /** Server-side filters to apply when fetching */
  serverFilters?: TaskFilters;
}

interface UseTasksResult {
  /** All tasks from API */
  tasks: Task[];
  /** Filtered tasks based on current client-side filters */
  filteredTasks: Task[];
  /** Loading state */
  loading: boolean;
  /** Refreshing state (pull-to-refresh) */
  refreshing: boolean;
  /** Error message if any */
  error: string | null;
  /** Current filter tab */
  filterTab: TaskFilterTab;
  /** Current search query */
  search: string;
  /** Count of TODO tasks */
  todoCount: number;
  /** Count of IN_PROGRESS tasks */
  inProgressCount: number;
  /** Count of COMPLETED tasks */
  completedCount: number;
  /** Count of overdue tasks */
  overdueCount: number;
  /** Set the filter tab */
  setFilterTab: (tab: TaskFilterTab) => void;
  /** Set the search query */
  setSearch: (search: string) => void;
  /** Refresh tasks */
  refresh: () => Promise<void>;
  /** Change a task's status (validates transition on backend) */
  changeStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  /** Delete a task */
  removeTask: (taskId: string) => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useTasks(options: UseTasksOptions = {}): UseTasksResult {
  const { autoFetch = true, serverFilters } = options;

  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const businessId = activeBusiness?.id || '';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client-side filters
  const [filterTab, setFilterTab] = useState<TaskFilterTab>('all');
  const [search, setSearch] = useState('');

  // Fetch
  const fetchTasks = useCallback(
    async (isRefresh = false) => {
      if (!businessId) return;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await getTasks(businessId, serverFilters);
        setTasks(result);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to load tasks';
        setError(message);
        setTasks([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [businessId, serverFilters],
  );

  // Client-side filtering
  const filteredTasks = useMemo(() => {
    let result = tasks;
    const now = new Date();

    // Filter by tab
    if (filterTab === 'overdue') {
      result = result.filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) < now &&
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED',
      );
    } else if (filterTab !== 'all') {
      result = result.filter((t) => t.status === filterTab);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q),
      );
    }

    return result;
  }, [tasks, filterTab, search]);

  // Counts (from full unfiltered list for badges)
  const todoCount = useMemo(() => tasks.filter((t) => t.status === 'TODO').length, [tasks]);
  const inProgressCount = useMemo(() => tasks.filter((t) => t.status === 'IN_PROGRESS').length, [tasks]);
  const completedCount = useMemo(() => tasks.filter((t) => t.status === 'COMPLETED').length, [tasks]);
  const overdueCount = useMemo(() => {
    const now = new Date();
    return tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED',
    ).length;
  }, [tasks]);

  // Status change (optimistic update + backend call)
  const changeStatus = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      try {
        const updated = await updateStatus(businessId, taskId, newStatus);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
      } catch (err) {
        if (__DEV__) {
          console.error('[useTasks] Failed to update status:', err);
        }
        throw err;
      }
    },
    [businessId],
  );

  // Delete
  const removeTask = useCallback(
    async (taskId: string) => {
      try {
        await deleteTask(businessId, taskId);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      } catch (err) {
        if (__DEV__) {
          console.error('[useTasks] Failed to delete task:', err);
        }
        throw err;
      }
    },
    [businessId],
  );

  const refresh = useCallback(() => fetchTasks(true), [fetchTasks]);

  useEffect(() => {
    if (autoFetch) {
      fetchTasks();
    }
  }, [autoFetch, fetchTasks]);

  return {
    tasks,
    filteredTasks,
    loading,
    refreshing,
    error,
    filterTab,
    search,
    todoCount,
    inProgressCount,
    completedCount,
    overdueCount,
    setFilterTab,
    setSearch,
    refresh,
    changeStatus,
    removeTask,
  };
}

export default useTasks;
