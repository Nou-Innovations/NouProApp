/**
 * StatusDonut — a donut chart of delivery counts by status, built on
 * react-native-svg (no chart-library dependency).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import theme from '@/shared/theme';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface StatusDonutProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  /** Big number shown in the center */
  centerValue?: number | string;
  centerLabel?: string;
}

export function StatusDonut({
  segments,
  size = 168,
  strokeWidth = 22,
  centerValue,
  centerLabel = 'Total',
}: StatusDonutProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);

  let offsetAcc = 0;

  return (
    <View style={styles.row}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {/* track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.borderColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {total > 0 &&
            visible.map((seg, i) => {
              const fraction = seg.value / total;
              const dash = fraction * circumference;
              const circle = (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="butt"
                  fill="none"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offsetAcc}
                />
              );
              offsetAcc += dash;
              return circle;
            })}
        </G>
      </Svg>

      <View style={styles.centerOverlay} pointerEvents="none">
        <Text style={styles.centerValue}>{centerValue ?? total}</Text>
        <Text style={styles.centerLabel}>{centerLabel}</Text>
      </View>

      {/* legend */}
      <View style={styles.legend}>
        {segments.map((seg) => (
          <View key={seg.label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {seg.label}
            </Text>
            <Text style={styles.legendValue}>{seg.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerOverlay: {
    position: 'absolute',
    left: 0,
    width: 168,
    height: 168,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    fontSize: 30,
    fontFamily: 'InterCustom-Bold',
    color: theme.colors.text,
  },
  centerLabel: {
    fontSize: 13,
    fontFamily: 'InterCustom-Medium',
    color: theme.colors.textSecondary,
  },
  legend: {
    flex: 1,
    marginLeft: 16,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'InterCustom-Medium',
    color: theme.colors.textSecondary,
  },
  legendValue: {
    fontSize: 14,
    fontFamily: 'InterCustom-SemiBold',
    color: theme.colors.text,
  },
});

export default StatusDonut;
