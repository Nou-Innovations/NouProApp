/**
 * ProQuickActions - Business Mode Quick Actions Grid
 * Primary conversion actions for business operations
 * Each action opens a focused flow and returns to Home
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { Skeleton } from '@/shared/components/ui';

export interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Icon.glyphMap;
  color: string;
  onPress: () => void;
}

interface ProQuickActionsProps {
  actions: QuickAction[];
  isLoading?: boolean;
}

export function ProQuickActions({ actions, isLoading }: ProQuickActionsProps) {
  const { theme: appTheme } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.grid}>
          {[1, 2, 3, 4].map((_, index) => (
            <View
              key={index}
              style={[
                styles.actionButton,
                styles.actionSkeleton,
                { backgroundColor: appTheme.colors.surface, borderColor: 'transparent' },
              ]}
            >
              <Skeleton width={48} height={48} borderRadius={12} />
              <Skeleton width={60} height={14} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Limit to 4 actions max for the grid
  const displayActions = actions.slice(0, 4);

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {displayActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[
              styles.actionButton,
              { 
                backgroundColor: appTheme.colors.surface,
                borderColor: appTheme.colors.borderColor,
              },
            ]}
            onPress={action.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrapper, { backgroundColor: `${action.color}15` }]}>
              <Icon name={action.icon} size={24} color={action.color} />
            </View>
            <Text
              style={[styles.actionLabel, { color: appTheme.colors.text }]}
              numberOfLines={2}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  actionSkeleton: {
    height: 100,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
    textAlign: 'center',
  },
  skeletonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  skeletonText: {
    width: 60,
    height: 14,
    borderRadius: 4,
  },
});

export default ProQuickActions;

