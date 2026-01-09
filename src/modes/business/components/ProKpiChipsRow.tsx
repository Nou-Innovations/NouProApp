/**
 * ProKpiChipsRow - Business Mode KPI Chips
 * Horizontal scrollable row of KPI chips showing today's metrics
 * Tapping a chip navigates to the relevant filtered list
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

export interface KpiChip {
  id: string;
  label: string;
  value: number | string;
  icon: keyof typeof Icon.glyphMap;
  color: string;
  onPress?: () => void;
}

interface ProKpiChipsRowProps {
  chips: KpiChip[];
  isLoading?: boolean;
  error?: string | null;
}

export function ProKpiChipsRow({ chips, isLoading, error }: ProKpiChipsRowProps) {
  const { theme: appTheme } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {[1, 2, 3, 4, 5].map((_, index) => (
            <View
              key={index}
              style={[
                styles.chip,
                styles.chipSkeleton,
                { backgroundColor: appTheme.colors.surface },
              ]}
            >
              <View style={[styles.skeletonIcon, { backgroundColor: appTheme.colors.borderColor }]} />
              <View style={[styles.skeletonText, { backgroundColor: appTheme.colors.borderColor }]} />
              <View style={[styles.skeletonValue, { backgroundColor: appTheme.colors.borderColor }]} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: appTheme.colors.surface }]}>
        <Icon name="alert-circle-outline" size={20} color={appTheme.colors.error} />
        <Text style={[styles.errorText, { color: appTheme.colors.error }]}>
          Unable to load metrics
        </Text>
      </View>
    );
  }

  if (chips.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: appTheme.colors.surface }]}>
        <Icon name="analytics-outline" size={20} color={appTheme.colors.textMuted} />
        <Text style={[styles.emptyText, { color: appTheme.colors.textMuted }]}>
          No metrics available
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      {chips.map((chip) => (
        <TouchableOpacity
          key={chip.id}
          style={[
            styles.chip,
            { 
              backgroundColor: appTheme.colors.surface,
              borderColor: appTheme.colors.borderColor,
            },
          ]}
          onPress={chip.onPress}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${chip.color}15` }]}>
            <Icon name={chip.icon} size={18} color={chip.color} />
          </View>
          <Text
            style={[styles.chipLabel, { color: appTheme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {chip.label}
          </Text>
          <Text
            style={[styles.chipValue, { color: appTheme.colors.text }]}
            numberOfLines={1}
          >
            {typeof chip.value === 'number' && chip.value > 99 ? '99+' : chip.value}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    gap: 10,
  },
  loadingContainer: {
    marginVertical: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'flex-start',
    gap: 6,
  },
  chipSkeleton: {
    minWidth: 100,
    height: 80,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.medium,
  },
  chipValue: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.bold,
  },
  skeletonIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  skeletonText: {
    width: 60,
    height: 12,
    borderRadius: 4,
  },
  skeletonValue: {
    width: 40,
    height: 20,
    borderRadius: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    borderRadius: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    borderRadius: 12,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
});

export default ProKpiChipsRow;

