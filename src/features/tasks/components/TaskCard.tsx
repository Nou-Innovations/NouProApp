/**
 * TaskCard Component
 * Displays personal tasks/activities assigned to the user
 * Following design.json specifications
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import Pill from '@/shared/components/ui/Pill';
import Avatar from '@/shared/components/ui/Avatar';

export type TaskType = 'delivery' | 'order' | 'invoice' | 'general';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

interface TaskCardProps {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  businessName?: string;
  businessLogo?: string;
  dueDate?: string;
  assignedAt?: string;
  onPress?: () => void;
}

const TASK_ICONS: Record<TaskType, keyof typeof Icon.glyphMap> = {
  delivery: 'car-outline',
  order: 'receipt-outline',
  invoice: 'document-text-outline',
  general: 'checkbox-outline',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: '#F59E0B',
  in_progress: '#0EA5E9',
  completed: '#22C55E',
  cancelled: '#6B7280',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function TaskCard({
  id,
  title,
  description,
  type,
  status,
  businessName,
  businessLogo,
  dueDate,
  assignedAt,
  onPress,
}: TaskCardProps) {
  const { theme: appTheme } = useTheme();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isOverdue = () => {
    if (!dueDate || status === 'completed' || status === 'cancelled') return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { 
          backgroundColor: appTheme.colors.cardBackground,
          borderBottomColor: appTheme.colors.borderColor,
        },
        isOverdue() && styles.overdueContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: STATUS_COLORS[status] + '20' },
        ]}
      >
        <Icon
          name={TASK_ICONS[type]}
          size={24}
          color={STATUS_COLORS[status]}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: appTheme.colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Pill
            text={STATUS_LABELS[status]}
            color={STATUS_COLORS[status]}
          />
        </View>

        {description && (
          <Text
            style={[styles.description, { color: appTheme.colors.textLight }]}
            numberOfLines={2}
          >
            {description}
          </Text>
        )}

        {/* Business Info */}
        {businessName && (
          <View style={styles.businessRow}>
            <Avatar
              userId={id}
              userName={businessName}
              imageUri={businessLogo}
              size={20}
            />
            <Text style={[styles.businessName, { color: appTheme.colors.textLight }]}>
              {businessName}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {dueDate && (
            <View style={styles.dateRow}>
              <Icon
                name="time-outline"
                size={14}
                color={isOverdue() ? appTheme.colors.error : appTheme.colors.textLight}
              />
              <Text
                style={[
                  styles.dateText,
                  { color: isOverdue() ? appTheme.colors.error : appTheme.colors.textLight },
                ]}
              >
                Due: {formatDate(dueDate)}
              </Text>
            </View>
          )}
          {assignedAt && !dueDate && (
            <View style={styles.dateRow}>
              <Icon name="calendar-outline" size={14} color={appTheme.colors.textLight} />
              <Text style={[styles.dateText, { color: appTheme.colors.textLight }]}>
                Assigned: {formatDate(assignedAt)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Arrow */}
      <Icon
        name="chevron-forward"
        size={20}
        color={appTheme.colors.textLight}
        style={styles.arrow}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
  },
  overdueContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
    marginRight: theme.spacing.sm,
  },
  description: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 18,
    marginBottom: 8,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  businessName: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.primary.regular,
    marginLeft: 4,
  },
  arrow: {
    alignSelf: 'center',
  },
});

export default TaskCard;

