/**
 * OrderStatusBadge Component
 * 
 * Displays order status as a consistent badge across the app.
 * Uses the centralized order status configuration for colors and labels.
 * 
 * Design: Badge with dot indicator + text, 20% opacity background
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { Text } from './Typography';
import { 
  OrderStatus, 
  ORDER_STATUS_META, 
  ORDER_STATUS_TONE,
  BadgeTone,
  getStatusLabel,
} from '@/shared/constants/orderStatus';

interface OrderStatusBadgeProps {
  /** The order status to display */
  status: OrderStatus;
  /** Use short label if available */
  short?: boolean;
  /** Additional container styles */
  style?: ViewStyle;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Whether to show the dot indicator */
  showDot?: boolean;
}

/**
 * Get the color for a badge tone from theme
 */
function getToneColor(tone: BadgeTone, themeColors: typeof theme.colors): string {
  switch (tone) {
    case 'info':
      return themeColors.statusOngoing; // Blue
    case 'warning':
      return themeColors.statusPending; // Amber/Yellow
    case 'success':
      return themeColors.statusDone; // Green
    case 'neutral':
      return themeColors.neutral; // Gray
    case 'purple':
      return themeColors.statusInReview; // Purple
    case 'danger':
      return themeColors.statusCanceled; // Red/Coral
    case 'error':
      return themeColors.error; // Bright red
    default:
      return themeColors.neutral;
  }
}

/**
 * OrderStatusBadge - Displays order status with consistent styling
 */
export function OrderStatusBadge({ 
  status, 
  short = false, 
  style,
  size = 'md',
  showDot = true,
}: OrderStatusBadgeProps) {
  const { theme: appTheme } = useTheme();
  
  const tone = ORDER_STATUS_TONE[status];
  const color = getToneColor(tone, appTheme.colors);
  const label = getStatusLabel(status, short);
  
  const isSmall = size === 'sm';
  
  return (
    <View 
      style={[
        styles.badge, 
        isSmall && styles.badgeSmall,
        { backgroundColor: `${color}20` }, 
        style
      ]}
    >
      {showDot && (
        <View 
          style={[
            styles.dot, 
            isSmall && styles.dotSmall,
            { backgroundColor: color }
          ]} 
        />
      )}
      <Text 
        style={[
          styles.text, 
          isSmall && styles.textSmall,
          { color }
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * Simplified badge for inline use (no dot, compact)
 */
export function OrderStatusPill({ 
  status, 
  style,
}: { 
  status: OrderStatus; 
  style?: ViewStyle;
}) {
  const { theme: appTheme } = useTheme();
  
  const tone = ORDER_STATUS_TONE[status];
  const color = getToneColor(tone, appTheme.colors);
  const label = getStatusLabel(status, true);
  
  return (
    <View style={[styles.pill, { backgroundColor: `${color}20` }, style]}>
      <Text style={[styles.pillText, { color }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 5,
  },
  text: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
  },
  textSmall: {
    fontSize: 11,
  },
  // Pill styles (compact, no dot)
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 11,
    fontFamily: theme.fonts.primary.medium,
  },
});

export default OrderStatusBadge;
