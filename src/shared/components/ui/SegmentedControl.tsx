/**
 * SegmentedControl — 2–4 equal segments in a pill track; the active segment is
 * filled. For mutually-exclusive toggles (e.g. 7d / 30d / 90d ranges). Distinct
 * from FilterBar, which is an underline tab bar. Optional per-segment lock icon.
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Lock, type LucideIcon } from 'lucide-react-native';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from './Typography';

export interface SegmentOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  locked?: boolean;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  style?: ViewStyle;
}

export default function SegmentedControl({ options, value, onChange, style }: SegmentedControlProps) {
  const { theme: appTheme } = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: appTheme.colors.buttonBackground }, style]}>
      {options.map((option) => {
        const active = option.value === value;
        const IconCmp = option.icon;
        const fg = active ? appTheme.colors.text : appTheme.colors.textMuted;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            style={[styles.segment, active && { backgroundColor: appTheme.colors.background }]}
          >
            {IconCmp ? <IconCmp size={15} color={fg} strokeWidth={2} style={styles.icon} /> : null}
            <Text
              style={[
                styles.label,
                { color: fg, fontFamily: active ? theme.fonts.primary.bold : theme.fonts.primary.medium },
              ]}
            >
              {option.label}
            </Text>
            {option.locked ? <Lock size={12} color={fg} strokeWidth={2} style={styles.lock} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: theme.borderRadius.md,
    padding: 3,
  },
  segment: {
    flex: 1,
    height: 36,
    borderRadius: theme.borderRadius.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 5,
  },
  lock: {
    marginLeft: 5,
  },
  label: {
    fontSize: 13,
  },
});
