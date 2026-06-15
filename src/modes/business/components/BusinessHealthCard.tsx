/**
 * BusinessHealthCard — the at-a-glance status banner at the top of Business Home.
 *
 * Shows an overall status (Good / Needs attention / Critical) and a one-line,
 * plain-language reason. The status + reason are computed server-side by the
 * /dashboard endpoint, so this component is purely presentational.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { Skeleton } from '@/shared/components/ui';
import type { BusinessHealth, HealthStatus } from '@/features/business';

interface BusinessHealthCardProps {
  health: BusinessHealth | null;
  isLoading?: boolean;
}

const STATUS_META: Record<
  HealthStatus,
  { label: string; colorKey: 'success' | 'warning' | 'error'; icon: string }
> = {
  good: { label: 'Good', colorKey: 'success', icon: 'checkmark-circle' },
  attention: { label: 'Needs attention', colorKey: 'warning', icon: 'alert-circle' },
  critical: { label: 'Critical', colorKey: 'error', icon: 'warning' },
};

export function BusinessHealthCard({ health, isLoading }: BusinessHealthCardProps) {
  const { theme: appTheme } = useTheme();

  if (isLoading || !health) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: appTheme.colors.surface, borderColor: appTheme.colors.borderColor },
        ]}
      >
        <Skeleton width={120} height={14} />
        <Skeleton width={160} height={24} />
        <Skeleton width="80%" height={14} />
      </View>
    );
  }

  const meta = STATUS_META[health.status];
  const color = appTheme.colors[meta.colorKey];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: `${color}10`,
          borderColor: `${color}33`,
        },
      ]}
    >
      <Text style={[styles.eyebrow, { color: appTheme.colors.textSecondary }]}>Business Health</Text>
      <View style={styles.statusRow}>
        <Icon name={meta.icon} size={22} color={color} />
        <Text style={[styles.status, { color }]}>{meta.label}</Text>
      </View>
      <Text style={[styles.reason, { color: appTheme.colors.text }]}>{health.reason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  eyebrow: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  status: {
    fontSize: 22,
    fontFamily: theme.fonts.primary.bold,
  },
  reason: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 20,
  },
});

export default BusinessHealthCard;
