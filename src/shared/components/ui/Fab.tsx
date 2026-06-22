/**
 * Fab — floating action button. An absolutely-positioned round icon button for a
 * screen's primary create action (e.g. the + on the Tasks screen). Positions itself
 * within the nearest positioned ancestor; override placement via `style` if needed.
 */
import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';

type FabPosition = 'bottom-right' | 'bottom-left' | 'bottom-center';

interface FabProps {
  icon: LucideIcon;
  onPress: () => void;
  position?: FabPosition;
  /** Required — there's no visible label, so screen readers need one. */
  accessibilityLabel: string;
  style?: ViewStyle;
}

const SIZE = 56;

export default function Fab({ icon: IconCmp, onPress, position = 'bottom-right', accessibilityLabel, style }: FabProps) {
  const { theme: appTheme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.fab, positionStyles[position], { backgroundColor: appTheme.colors.primary }, style]}
    >
      <IconCmp size={theme.iconSizes.lg} color={appTheme.colors.textInverse} strokeWidth={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
});

const positionStyles = StyleSheet.create({
  'bottom-right': { right: 20 },
  'bottom-left': { left: 20 },
  'bottom-center': { left: '50%', marginLeft: -SIZE / 2 },
});
