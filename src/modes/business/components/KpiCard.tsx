/**
 * KpiCard / KpiGrid — the 2×2 grid of headline metrics on Business Home.
 *
 * Each card shows a big pre-formatted value, a label, an icon, and an optional
 * sub-delta line (e.g. "+12% vs yesterday", "4 new", "3 overdue"). Values are
 * formatted by the hook so this stays purely presentational.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { Skeleton } from '@/shared/components/ui';

export type KpiDeltaTone = 'up' | 'down' | 'neutral';

export interface KpiCardData {
  id: string;
  label: string;
  /** Pre-formatted value, e.g. "Rs 18,400" or "16". */
  value: string;
  /** Optional sub-line under the value. */
  delta?: { text: string; tone: KpiDeltaTone };
  icon: string;
  color: string;
  onPress?: () => void;
}

function KpiCard({ card }: { card: KpiCardData }) {
  const { theme: appTheme } = useTheme();

  const deltaColor =
    card.delta?.tone === 'up'
      ? appTheme.colors.success
      : card.delta?.tone === 'down'
        ? appTheme.colors.error
        : appTheme.colors.textMuted;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: appTheme.colors.surface, borderColor: appTheme.colors.borderColor },
      ]}
      activeOpacity={card.onPress ? 0.7 : 1}
      onPress={card.onPress}
      disabled={!card.onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${card.color}15` }]}>
        <Icon name={card.icon} size={18} color={card.color} />
      </View>
      <Text style={[styles.label, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
        {card.label}
      </Text>
      <Text style={[styles.value, { color: appTheme.colors.text }]} numberOfLines={1}>
        {card.value}
      </Text>
      {card.delta ? (
        <Text style={[styles.delta, { color: deltaColor }]} numberOfLines={1}>
          {card.delta.text}
        </Text>
      ) : (
        <View style={styles.deltaSpacer} />
      )}
    </TouchableOpacity>
  );
}

interface KpiGridProps {
  cards: KpiCardData[];
  isLoading?: boolean;
}

export function KpiGrid({ cards, isLoading }: KpiGridProps) {
  const { theme: appTheme } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.card,
              { backgroundColor: appTheme.colors.surface, borderColor: 'transparent' },
            ]}
          >
            <Skeleton width={32} height={32} borderRadius={8} />
            <Skeleton width={70} height={12} />
            <Skeleton width={90} height={24} />
            <Skeleton width={60} height={12} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {cards.map((card) => (
        <KpiCard key={card.id} card={card} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    gap: 10,
    marginBottom: theme.spacing.sm,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.medium,
  },
  value: {
    fontSize: 22,
    fontFamily: theme.fonts.primary.bold,
  },
  delta: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.medium,
  },
  deltaSpacer: {
    height: 15,
  },
});

export default KpiGrid;
