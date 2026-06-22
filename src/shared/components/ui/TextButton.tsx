/**
 * TextButton — a text-only (link-style) button with no background. For inline
 * actions like "Retry", "Close", "See all". Tones map to theme colors. Includes
 * hitSlop + accessibilityRole so the tap target stays large and screen-reader friendly.
 */
import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from './Typography';

type TextButtonTone = 'primary' | 'danger' | 'muted';

interface TextButtonProps {
  title: string;
  onPress: () => void;
  tone?: TextButtonTone;
  iconLeft?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

export default function TextButton({
  title,
  onPress,
  tone = 'primary',
  iconLeft: IconLeft,
  loading = false,
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
}: TextButtonProps) {
  const { theme: appTheme } = useTheme();

  const toneColor =
    tone === 'danger'
      ? appTheme.colors.error
      : tone === 'muted'
        ? appTheme.colors.textMuted
        : appTheme.colors.primary;
  const color = disabled ? appTheme.colors.textMuted : toneColor;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.6}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? title}
      style={[styles.button, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <View style={styles.content}>
          {IconLeft ? <IconLeft size={theme.iconSizes.sm} color={color} strokeWidth={2} style={styles.icon} /> : null}
          <Text style={[styles.label, { color }, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
});
