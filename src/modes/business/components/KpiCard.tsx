/**
 * KpiCard / KpiGrid — the 2×2 grid of headline metrics on Business Home.
 *
 * Each card shows a small icon + label on one row, a big pre-formatted value,
 * and an optional sub-delta line (e.g. "+12% vs yesterday", "4 new", "3
 * overdue"). Borderless with a flat surface fill. Values are formatted by the
 * hook so this stays purely presentational.
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
      style={[styles.card, { backgroundColor: appTheme.colors.surface }]}
      activeOpacity={card.onPress ? 0.7 : 1}
      onPress={card.onPress}
      disabled={!card.onPress}
    >
      <View style={styles.labelRow}>
        <View style={[styles.iconChip, { backgroundColor: `${card.color}1F` }]}>
          <Icon name={card.icon} size={15} color={card.color} />
        </View>
        <Text style={[styles.label, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
          {card.label}
        </Text>
      </View>
      <Text style={[styles.value, { color: appTheme.colors.text }]} numberOfLines={1}>
        {card.value}
      </Text>
      {card.delta ? (
        <Text style={[styles.delta, { color: deltaColor }]} numberOfLines={1}>
          {card.delta.text}
        </Text>
      ) : null}
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
          <View key={i} style={[styles.card, { backgroundColor: appTheme.colors.surface }]}>
            <Skeleton width={70} height={14} />
            <Skeleton width={90} height={22} />
            <Skeleton width={56} height={12} />
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
    paddingHorizontal: theme.spacing.sm,
    gap: 10,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 14,
    gap: 5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  iconChip: {
    width: 24,
    height: 24,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontFamily: theme.fonts.primary.medium,
  },
  value: {
    fontSize: 21,
    fontFamily: theme.fonts.primary.bold,
  },
  delta: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.medium,
  },
});

export default KpiGrid;
