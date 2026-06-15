/**
 * RevenueBars — a compact vertical bar chart of daily revenue, built on
 * react-native-svg (matches the deliveries chart conventions: static theme,
 * no chart-library dependency).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import theme from '@/shared/theme';
import type { RevenuePoint } from '@/features/business';

interface RevenueBarsProps {
  points: RevenuePoint[];
  width: number;
  height?: number;
}

const PAD = { top: 10, right: 8, bottom: 20, left: 8 };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const labelFor = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return WEEKDAYS[d.getDay()];
};

export function RevenueBars({ points, width, height = 150 }: RevenueBarsProps) {
  const n = points.length;
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const maxVal = Math.max(1, ...points.map((p) => p.amount));
  const slot = n > 0 ? innerW / n : innerW;
  const barW = Math.max(3, Math.min(28, slot * 0.6));
  const baseline = PAD.top + innerH;

  // For many days (30d) only label a few x ticks to avoid crowding.
  const labelEvery = n > 10 ? Math.ceil(n / 5) : 1;

  return (
    <View>
      <Svg width={width} height={height}>
        <Line
          x1={PAD.left}
          y1={baseline}
          x2={width - PAD.right}
          y2={baseline}
          stroke={theme.colors.borderColor}
          strokeWidth={1}
        />
        {points.map((p, i) => {
          const h = maxVal > 0 ? (p.amount / maxVal) * innerH : 0;
          const x = PAD.left + i * slot + (slot - barW) / 2;
          const y = baseline - h;
          return (
            <Rect
              key={p.date}
              x={x}
              y={y}
              width={barW}
              height={Math.max(0, h)}
              rx={3}
              fill={theme.colors.accent}
              opacity={i === n - 1 ? 1 : 0.55}
            />
          );
        })}
      </Svg>

      <View style={styles.xLabels}>
        {points.map((p, i) => (
          <Text key={p.date} style={[styles.xLabel, { width: slot }]} numberOfLines={1}>
            {i % labelEvery === 0 ? labelFor(p.date) : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  xLabels: {
    flexDirection: 'row',
    paddingHorizontal: PAD.left,
    marginTop: -16,
  },
  xLabel: {
    fontSize: 10,
    fontFamily: 'InterCustom-Regular',
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});

export default RevenueBars;
