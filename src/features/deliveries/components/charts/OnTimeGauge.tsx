/**
 * OnTimeGauge — a single-arc progress gauge (0–100%) for the on-time rate.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import theme from '@/shared/theme';

interface OnTimeGaugeProps {
  /** 0–100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
}

export function OnTimeGauge({
  value,
  size = 140,
  strokeWidth = 14,
  label = 'On time',
  color = theme.colors.success,
}: OnTimeGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;

  return (
    <View style={[styles.container, { width: size }]}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.colors.borderColor}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${dash} ${circumference - dash}`}
            />
          </G>
        </Svg>
        <View style={[styles.overlay, { width: size, height: size }]} pointerEvents="none">
          <Text style={styles.value}>{Math.round(clamped)}%</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 26,
    fontFamily: 'InterCustom-Bold',
    color: theme.colors.text,
  },
  label: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: 'InterCustom-Medium',
    color: theme.colors.textSecondary,
  },
});

export default OnTimeGauge;
