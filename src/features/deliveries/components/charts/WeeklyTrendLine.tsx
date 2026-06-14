/**
 * WeeklyTrendLine — created vs delivered per week, as two line series with a
 * filled area under "delivered". Built on react-native-svg.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import theme from '@/shared/theme';
import { DeliveryWeeklyTrendPoint } from '@/shared/types/delivery';

interface WeeklyTrendLineProps {
  points: DeliveryWeeklyTrendPoint[];
  width: number;
  height?: number;
}

const PAD = { top: 12, right: 12, bottom: 22, left: 12 };

const buildPath = (
  values: number[],
  width: number,
  height: number,
  maxVal: number
): string => {
  const n = values.length;
  if (n === 0) return '';
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const stepX = n > 1 ? innerW / (n - 1) : 0;
  return values
    .map((v, i) => {
      const x = PAD.left + i * stepX;
      const y = PAD.top + innerH - (maxVal > 0 ? (v / maxVal) * innerH : 0);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
};

export function WeeklyTrendLine({ points, width, height = 160 }: WeeklyTrendLineProps) {
  const created = points.map((p) => p.created);
  const delivered = points.map((p) => p.delivered);
  const maxVal = Math.max(1, ...created, ...delivered);

  const innerH = height - PAD.top - PAD.bottom;
  const deliveredPath = buildPath(delivered, width, height, maxVal);
  const createdPath = buildPath(created, width, height, maxVal);
  const areaPath =
    deliveredPath && points.length
      ? `${deliveredPath} L ${(width - PAD.right).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L ${PAD.left.toFixed(
          1
        )} ${(PAD.top + innerH).toFixed(1)} Z`
      : '';

  const formatWeek = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <View>
      <Svg width={width} height={height}>
        {/* baseline */}
        <Line
          x1={PAD.left}
          y1={PAD.top + innerH}
          x2={width - PAD.right}
          y2={PAD.top + innerH}
          stroke={theme.colors.borderColor}
          strokeWidth={1}
        />
        {!!areaPath && <Path d={areaPath} fill={theme.colors.accent} opacity={0.12} />}
        {!!createdPath && (
          <Path d={createdPath} stroke={theme.colors.info} strokeWidth={2} fill="none" />
        )}
        {!!deliveredPath && (
          <Path d={deliveredPath} stroke={theme.colors.accent} strokeWidth={2.5} fill="none" />
        )}
        {points.map((p, i) => {
          const n = points.length;
          const innerW = width - PAD.left - PAD.right;
          const stepX = n > 1 ? innerW / (n - 1) : 0;
          const x = PAD.left + i * stepX;
          const y = PAD.top + innerH - (maxVal > 0 ? (p.delivered / maxVal) * innerH : 0);
          return <Circle key={i} cx={x} cy={y} r={2.5} fill={theme.colors.accent} />;
        })}
      </Svg>

      {/* x labels (first / middle / last to avoid crowding) */}
      <View style={styles.xLabels}>
        <Text style={styles.xLabel}>{points[0] ? formatWeek(points[0].weekStart) : ''}</Text>
        <Text style={styles.xLabel}>
          {points.length > 2 ? formatWeek(points[Math.floor(points.length / 2)].weekStart) : ''}
        </Text>
        <Text style={styles.xLabel}>
          {points.length > 1 ? formatWeek(points[points.length - 1].weekStart) : ''}
        </Text>
      </View>

      {/* legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.accent }]} />
          <Text style={styles.legendText}>Delivered</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.info }]} />
          <Text style={styles.legendText}>Created</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: PAD.left,
    marginTop: -16,
  },
  xLabel: {
    fontSize: 11,
    fontFamily: 'InterCustom-Regular',
    color: theme.colors.textMuted,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 13,
    fontFamily: 'InterCustom-Medium',
    color: theme.colors.textSecondary,
  },
});

export default WeeklyTrendLine;
