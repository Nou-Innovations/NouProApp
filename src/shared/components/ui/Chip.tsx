/**
 * Chip — a single selectable pill. Filled in the primary color when selected,
 * surface + border when not. Optional left icon and a lock badge for gated options.
 * Usually rendered via ChipGroup, but can be used standalone.
 */
import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Lock, type LucideIcon } from 'lucide-react-native';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from './Typography';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  iconLeft?: LucideIcon;
  disabled?: boolean;
  /** Shows a small lock icon — for options gated behind a plan/permission. */
  locked?: boolean;
  style?: ViewStyle;
}

export default function Chip({
  label,
  selected = false,
  onPress,
  iconLeft: IconLeft,
  disabled = false,
  locked = false,
  style,
}: ChipProps) {
  const { theme: appTheme } = useTheme();

  const bg = selected ? appTheme.colors.primary : appTheme.colors.surface;
  const border = selected ? appTheme.colors.primary : appTheme.colors.borderColor;
  const contentColor = selected ? appTheme.colors.textInverse : appTheme.colors.text;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {IconLeft ? <IconLeft size={16} color={contentColor} strokeWidth={2} style={styles.icon} /> : null}
      <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
      {locked ? <Lock size={13} color={contentColor} strokeWidth={2} style={styles.lock} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 6,
  },
  lock: {
    marginLeft: 6,
  },
  label: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
});
