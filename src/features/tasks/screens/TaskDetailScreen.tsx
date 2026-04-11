/**
 * TaskDetailScreen - Business Mode
 * Displays full task details with status transition actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import themeConstants from '@/shared/theme';
import { AppModal } from '@/shared/components/ui';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { getTask, updateTaskStatus, deleteTask } from '../services/tasks.service';
import { TASK_STATUS_TRANSITIONS, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_TYPE_LABELS } from '@/shared/types/task';
import type { Task, TaskStatus } from '@/shared/types/task';

type RouteParams = { TaskDetail: { taskId: string; businessId: string } };

const STATUS_COLORS: Record<string, string> = {
  TODO: '#F59E0B',
  IN_PROGRESS: '#0EA5E9',
  COMPLETED: '#22C55E',
  CANCELLED: '#6B7280',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#6B7280',
  NORMAL: '#0EA5E9',
  URGENT: '#EF4444',
};

const ACTION_LABELS: Record<string, string> = {
  IN_PROGRESS: 'Start Working',
  COMPLETED: 'Mark Complete',
  TODO: 'Reopen',
  CANCELLED: 'Cancel Task',
};

export default function TaskDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'TaskDetail'>>();
  const { taskId, businessId } = route.params;
  const { theme: appTheme } = useTheme();

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTask = useCallback(async () => {
    try {
      const data = await getTask(businessId, taskId);
      setTask(data);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load task');
    } finally {
      setIsLoading(false);
    }
  }, [businessId, taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    setIsUpdating(true);
    try {
      const updated = await updateTaskStatus(businessId, taskId, newStatus);
      setTask(updated);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTask(businessId, taskId);
      setShowDeleteDialog(false);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to delete task');
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const isOverdue = task?.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Task" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={appTheme.colors.text} /></View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Task" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
        <View style={styles.loadingContainer}><Text style={[styles.errorText, { color: appTheme.colors.textMuted }]}>Task not found</Text></View>
      </SafeAreaView>
    );
  }

  const validTransitions = TASK_STATUS_TRANSITIONS[task.status] || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Task Details"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={[{ icon: 'trash-outline', onPress: () => setShowDeleteDialog(true) }]}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Title and badges */}
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: appTheme.colors.text }]}>{task.title}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[task.status] + '20' }]}>
              <View style={[styles.badgeDot, { backgroundColor: STATUS_COLORS[task.status] }]} />
              <Text style={[styles.badgeText, { color: STATUS_COLORS[task.status] }]}>{TASK_STATUS_LABELS[task.status]}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: PRIORITY_COLORS[task.priority] + '20' }]}>
              <Text style={[styles.badgeText, { color: PRIORITY_COLORS[task.priority] }]}>{TASK_PRIORITY_LABELS[task.priority]}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#F3F4F6' }]}>
              <Text style={[styles.badgeText, { color: '#666666' }]}>{TASK_TYPE_LABELS[task.type]}</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {task.description ? (
          <View style={styles.detailSection}>
            <Text style={[styles.sectionLabel, { color: '#777777' }]}>Description</Text>
            <Text style={[styles.descriptionText, { color: appTheme.colors.text }]}>{task.description}</Text>
          </View>
        ) : null}

        {/* Details */}
        <View style={styles.detailSection}>
          <Text style={[styles.sectionLabel, { color: '#777777' }]}>Details</Text>

          <View style={styles.detailRow}>
            <Icon name="calendar-outline" size={18} color="#777777" />
            <Text style={[styles.detailLabel, { color: '#777777' }]}>Due Date</Text>
            <Text style={[styles.detailValue, { color: isOverdue ? '#EF4444' : appTheme.colors.text }]}>
              {formatDate(task.dueDate)}{isOverdue ? ' (Overdue)' : ''}
            </Text>
          </View>

          {task.completedAt && (
            <View style={styles.detailRow}>
              <Icon name="checkmark-circle-outline" size={18} color="#22C55E" />
              <Text style={[styles.detailLabel, { color: '#777777' }]}>Completed</Text>
              <Text style={[styles.detailValue, { color: appTheme.colors.text }]}>{formatDate(task.completedAt)}</Text>
            </View>
          )}

          {task.assignedToUser && (
            <View style={styles.detailRow}>
              <Icon name="person-outline" size={18} color="#777777" />
              <Text style={[styles.detailLabel, { color: '#777777' }]}>Assigned To</Text>
              <Text style={[styles.detailValue, { color: appTheme.colors.text }]}>{task.assignedToUser.name}</Text>
            </View>
          )}

          {task.createdByUser && (
            <View style={styles.detailRow}>
              <Icon name="person-add-outline" size={18} color="#777777" />
              <Text style={[styles.detailLabel, { color: '#777777' }]}>Created By</Text>
              <Text style={[styles.detailValue, { color: appTheme.colors.text }]}>{task.createdByUser.name}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Icon name="time-outline" size={18} color="#777777" />
            <Text style={[styles.detailLabel, { color: '#777777' }]}>Created</Text>
            <Text style={[styles.detailValue, { color: appTheme.colors.text }]}>{formatDate(task.createdAt)}</Text>
          </View>
        </View>

        {/* Status Actions */}
        {validTransitions.length > 0 && (
          <View style={styles.actionsSection}>
            <Text style={[styles.sectionLabel, { color: '#777777' }]}>Actions</Text>
            {validTransitions.map((newStatus) => {
              const isPrimary = newStatus === 'COMPLETED' || newStatus === 'IN_PROGRESS';
              return (
                <TouchableOpacity
                  key={newStatus}
                  style={[
                    styles.actionButton,
                    isPrimary
                      ? { backgroundColor: STATUS_COLORS[newStatus] }
                      : { backgroundColor: 'transparent', borderWidth: 1, borderColor: STATUS_COLORS[newStatus] },
                  ]}
                  onPress={() => handleStatusChange(newStatus)}
                  disabled={isUpdating}
                >
                  <Text style={[styles.actionButtonText, { color: isPrimary ? '#FFFFFF' : STATUS_COLORS[newStatus] }]}>
                    {isUpdating ? 'Updating...' : ACTION_LABELS[newStatus] || TASK_STATUS_LABELS[newStatus]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <AppModal visible={showDeleteDialog} onClose={() => !isDeleting && setShowDeleteDialog(false)} variant="delete" title="Delete Task" message="Are you sure you want to delete this task? This cannot be undone." primaryButtonText="Delete" onPrimaryAction={confirmDelete} primaryButtonLoading={isDeleting} secondaryButtonText="Cancel" onSecondaryAction={() => setShowDeleteDialog(false)} secondaryButtonDisabled={isDeleting} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, fontFamily: themeConstants.fonts.primary.regular },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  headerSection: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 24, fontFamily: themeConstants.fonts.primary.bold, marginBottom: 12 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  badgeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  badgeText: { fontSize: 13, fontFamily: themeConstants.fonts.primary.medium },
  detailSection: { paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  sectionLabel: { fontSize: 13, fontFamily: themeConstants.fonts.primary.medium, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  descriptionText: { fontSize: 15, fontFamily: themeConstants.fonts.primary.regular, lineHeight: 22 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  detailLabel: { fontSize: 14, fontFamily: themeConstants.fonts.primary.regular, marginLeft: 10, width: 90 },
  detailValue: { fontSize: 14, fontFamily: themeConstants.fonts.primary.medium, flex: 1 },
  actionsSection: { paddingHorizontal: 16, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  actionButton: { borderRadius: 8, height: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionButtonText: { fontSize: 16, fontFamily: themeConstants.fonts.primary.semiBold },
});
