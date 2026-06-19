/**
 * BusinessHealthCard — the at-a-glance status banner at the top of Business Home.
 *
 * Shows an overall status (Good / Needs attention / Critical) and a one-line,
 * plain-language reason on a soft status-tinted, borderless banner. The status +
 * reason are computed server-side by the /dashboard endpoint, so this component
 * is purely presentational.
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
  { label: string; color: string; textColor: string; icon: string }
> = {
  good: { label: 'Good', color: theme.colors.success, textColor: '#2E7D46', icon: 'checkmark-circle' },
  attention: { label: 'Needs attention', color: theme.colors.warning, textColor: '#9A6700', icon: 'alert-circle' },
  critical: { label: 'Critical', color: theme.colors.error, textColor: '#B23A33', icon: 'warning' },
};

export function BusinessHealthCard({ health, isLoading }: BusinessHealthCardProps) {
  const { theme: appTheme } = useTheme();

  if (isLoading || !health) {
    return (
      <View style={[styles.card, { backgroundColor: appTheme.colors.surface }]}>
        <Skeleton width={140} height={20} />
        <Skeleton width="75%" height={13} />
      </View>
    );
  }

  const meta = STATUS_META[health.status];

  return (
    <View style={[styles.card, { backgroundColor: `${meta.color}14` }]}>
      <View style={[styles.iconChip, { backgroundColor: `${meta.color}26` }]}>
        <Icon name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.status, { color: meta.textColor }]}>{meta.label}</Text>
        <Text style={[styles.reason, { color: appTheme.colors.textSecondary }]}>{health.reason}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    marginHorizontal: theme.spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
  },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    gap: 1,
  },
  status: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.semiBold,
  },
  reason: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 18,
  },
});

export default BusinessHealthCard;
