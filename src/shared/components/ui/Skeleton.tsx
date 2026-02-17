/**
 * Skeleton - Animated loading placeholder
 * 
 * Shared primitive for skeleton loading states across the app.
 * Uses react-native-reanimated for a smooth pulse animation.
 * Theme-aware: works in both light and dark mode.
 * 
 * Usage:
 *   <Skeleton width={120} height={16} />
 *   <Skeleton width={48} height={48} borderRadius={24} />  // circle
 *   <Skeleton width="70%" height={14} />                    // percentage width
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/shared/theme/ThemeProvider';

// ─── Skeleton Primitive ─────────────────────────────────────────────────────

interface SkeletonProps {
  /** Width in pixels or percentage string (e.g. '70%') */
  width: number | `${number}%`;
  /** Height in pixels */
  height: number;
  /** Border radius - defaults to 4 */
  borderRadius?: number;
  /** Additional style overrides */
  style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius = 4, style }: SkeletonProps) {
  const { theme: appTheme } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // infinite
      true // reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [appTheme.colors.borderColor, appTheme.colors.surface]
    );
    return { backgroundColor };
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// ─── Convenience Variants ───────────────────────────────────────────────────

/** Circle skeleton (avatar placeholder) */
export function SkeletonCircle({ size, style }: { size: number; style?: ViewStyle }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
}

// ─── Row / Group Helpers ────────────────────────────────────────────────────

interface SkeletonRowProps {
  children: React.ReactNode;
  gap?: number;
  style?: ViewStyle;
}

/** Horizontal row of skeleton elements */
export function SkeletonRow({ children, gap = 12, style }: SkeletonRowProps) {
  return (
    <View style={[skeletonStyles.row, { gap }, style]}>
      {children}
    </View>
  );
}

/** Vertical column of skeleton elements */
export function SkeletonColumn({ children, gap = 6, style }: SkeletonRowProps) {
  return (
    <View style={[skeletonStyles.column, { gap }, style]}>
      {children}
    </View>
  );
}

// ─── Pre-built Skeleton Patterns ────────────────────────────────────────────

/** 
 * ListItemCard skeleton - matches the common avatar + text + right content pattern
 * Used across inbox, notifications, activity, etc.
 */
export function SkeletonListItem({ 
  avatarSize = 48, 
  avatarRadius,
  lines = 2,
  showTimestamp = true,
  showDivider = true,
  style,
}: {
  avatarSize?: number;
  avatarRadius?: number;
  lines?: number;
  showTimestamp?: boolean;
  showDivider?: boolean;
  style?: ViewStyle;
}) {
  const { theme: appTheme } = useTheme();
  const radius = avatarRadius ?? avatarSize * 0.17; // default matching Avatar component

  return (
    <View style={[skeletonStyles.listItem, style]}>
      <View style={skeletonStyles.listItemContent}>
        <Skeleton width={avatarSize} height={avatarSize} borderRadius={radius} />
        <View style={skeletonStyles.listItemText}>
          <Skeleton width="60%" height={16} />
          {lines >= 2 && <Skeleton width="80%" height={14} />}
          {lines >= 3 && <Skeleton width="40%" height={12} />}
        </View>
        {showTimestamp && (
          <Skeleton width={40} height={12} />
        )}
      </View>
      {showDivider && (
        <View style={[skeletonStyles.divider, { backgroundColor: appTheme.colors.divider }]} />
      )}
    </View>
  );
}

/**
 * Card skeleton - full-width card with content inside
 */
export function SkeletonCard({
  height = 80,
  borderRadius = 12,
  children,
  style,
}: {
  height?: number;
  borderRadius?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  if (children) {
    return (
      <View style={[skeletonStyles.card, { borderRadius }, style]}>
        {children}
      </View>
    );
  }
  return <Skeleton width="100%" height={height} borderRadius={borderRadius} style={style} />;
}

const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  column: {
    flexDirection: 'column',
  },
  listItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listItemText: {
    flex: 1,
    gap: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 12,
    marginLeft: 76, // avatar + gap offset
  },
  card: {
    padding: 16,
    overflow: 'hidden',
  },
});

export default Skeleton;
