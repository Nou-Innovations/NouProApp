/**
 * BreakdownBars — simple horizontal bars for per-driver / per-location
 * breakdowns. Pure RN views (no SVG needed for plain bars).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '@/shared/theme';

export interface BreakdownBarItem {
  label: string;
  value: number;
  /** Optional secondary text shown on the right (e.g. "92% on time") */
  sublabel?: string;
  color?: string;
}

interface BreakdownBarsProps {
  items: BreakdownBarItem[];
  /** Fallback bar color when an item has none */
  color?: string;
}

export function BreakdownBars({ items, color = theme.colors.accent }: BreakdownBarsProps) {
  const max = Math.max(1, ...items.map((i) => i.value));

  if (items.length === 0) {
    return <Text style={styles.empty}>No data yet</Text>;
  }

  return (
    <View style={styles.container}>
      {items.map((item, idx) => {
        const pct = Math.max(0.02, item.value / max);
        const barColor =
          item.color || theme.avatarColors[idx % theme.avatarColors.length] || color;
        return (
          <View key={`${item.label}-${idx}`} style={styles.row}>
            <View style={styles.labelRow}>
              <Text style={styles.label} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.value}>
                {item.value}
                {item.sublabel ? <Text style={styles.sublabel}>{`  ·  ${item.sublabel}`}</Text> : null}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  row: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'InterCustom-Medium',
    color: theme.colors.text,
    marginRight: 8,
  },
  value: {
    fontSize: 14,
    fontFamily: 'InterCustom-SemiBold',
    color: theme.colors.text,
  },
  sublabel: {
    fontSize: 12,
    fontFamily: 'InterCustom-Regular',
    color: theme.colors.textSecondary,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.borderColor,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  empty: {
    fontSize: 14,
    fontFamily: 'InterCustom-Regular',
    color: theme.colors.textMuted,
  },
});

export default BreakdownBars;
