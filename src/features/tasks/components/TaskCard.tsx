/**
 * TaskCard Component
 * Displays personal tasks/activities assigned to the user
 * Following design.json specifications
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { ListItemCard } from '@/shared/components/ui';
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

const TASK_ICONS: Record<TaskType, string> = {
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

  // Build extra info content
  const extraInfoContent = () => {
    const elements: React.ReactNode[] = [];
    
    // Business info
    if (businessName) {
      elements.push(
        <View key="business" style={styles.businessRow}>
          <Avatar
            userId={id}
            userName={businessName}
            imageUri={businessLogo}
            size={20}
          />
          <Text style={[styles.businessName, { color: appTheme.colors.textSecondary }]}>
            {businessName}
          </Text>
        </View>
      );
    }

    // Date info
    if (dueDate) {
      elements.push(
        <View key="date" style={styles.dateRow}>
          <Icon
            name="time-outline"
            size={14}
            color={isOverdue() ? appTheme.colors.error : appTheme.colors.textMuted}
          />
          <Text
            style={[
              styles.dateText,
              { color: isOverdue() ? appTheme.colors.error : appTheme.colors.textMuted },
            ]}
          >
            Due: {formatDate(dueDate)}
          </Text>
        </View>
      );
    } else if (assignedAt) {
      elements.push(
        <View key="date" style={styles.dateRow}>
          <Icon name="calendar-outline" size={14} color={appTheme.colors.textMuted} />
          <Text style={[styles.dateText, { color: appTheme.colors.textMuted }]}>
            Assigned: {formatDate(assignedAt)}
          </Text>
        </View>
      );
    }

    return elements.length > 0 ? <View>{elements}</View> : null;
  };

  // Container style with overdue indicator
  const containerStyle: ViewStyle | undefined = isOverdue() 
    ? { borderLeftWidth: 3, borderLeftColor: '#EF4444' }
    : undefined;

  return (
    <ListItemCard
      avatar={{
        type: 'icon',
        icon: TASK_ICONS[type],
        iconColor: STATUS_COLORS[status],
        backgroundColor: STATUS_COLORS[status] + '20',
        borderRadius: 12,
      }}
      title={title}
      subtitle={description}
      rightRow1={{
        statusPill: {
          text: STATUS_LABELS[status],
          color: STATUS_COLORS[status],
        },
      }}
      showChevron
      bottomElement={extraInfoContent()}
      onPress={onPress}
      showDivider
      style={containerStyle}
    />
  );
}

const styles = StyleSheet.create({
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  businessName: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    marginLeft: 6,
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
});

export default React.memo(TaskCard);
