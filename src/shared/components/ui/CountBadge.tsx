/**
 * CountBadge - the single, app-wide unread/notification count "pill".
 *
 * The small rounded badge showing a number (e.g. `3` or `9+`). Use it everywhere a count
 * needs surfacing — nav-bar icons, tab icons, list rows, message cards — so every badge
 * stays identical. Orange (`colors.badgeBackground`) with white text, capped at `9+` by default.
 *
 * Renders nothing when `count <= 0`.
 *
 * Two layouts:
 * - Inline (default): sits in normal flow, e.g. trailing in a row or next to a label.
 * - Overlay (`overlay`): absolute-positioned at the top-right corner of the parent — the
 *   parent must be `position: 'relative'`. Fine-tune the offset via the `style` prop.
 *
 * For React Navigation's native `tabBarBadge` prop (which takes a string, not a component),
 * use the exported `formatBadgeCount` helper instead so the `9+` cap stays consistent.
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

export interface CountBadgeProps {
  count: number;
  /** Cap before showing `${max}+`. Default 9. */
  max?: number;
  /** Absolute-position at the top-right corner of the parent (parent needs position:relative). */
  overlay?: boolean;
  /** Background override. Default `colors.badgeBackground` (#FF7A00). */
  color?: string;
  /** Text color override. Default white (always legible on the orange badge). */
  textColor?: string;
  style?: ViewStyle;
}

export const formatBadgeCount = (count: number, max = 9): string =>
  count > max ? `${max}+` : String(count);

export default function CountBadge({
  count,
  max = 9,
  overlay,
  color,
  textColor = '#FFFFFF',
  style,
}: CountBadgeProps) {
  const { theme: appTheme } = useTheme();
  if (count <= 0) return null;

  return (
    <View
      style={[
        styles.badge,
        overlay && styles.overlay,
        { backgroundColor: color ?? appTheme.colors.badgeBackground },
        style,
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{formatBadgeCount(count, max)}</Text>
    </View>
  );
}

const SIZE = 20; // fixed badge diameter; lineHeight matches it so the digit centers vertically

const styles = StyleSheet.create({
  badge: {
    minWidth: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  overlay: {
    position: 'absolute',
    top: -4,
    right: -8,
  },
  text: {
    fontSize: 11,
    lineHeight: SIZE,
    fontFamily: theme.fonts.primary.bold,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
