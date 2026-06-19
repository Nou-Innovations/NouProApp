/**
 * SectionTitle - the single, app-wide section heading.
 *
 * Every section heading (the label above a content block or list section) should
 * use this component so titles stay identical everywhere. Inter Bold, 18px,
 * `colors.text` by default. Pass spacing (margins/padding) via the `style` prop;
 * override the color with `color`. Forwards all TextProps (e.g. numberOfLines).
 *
 * Underlying preset: `theme.typography.sectionTitle`.
 */
import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

interface SectionTitleProps extends TextProps {
  color?: string;
}

export default function SectionTitle({ style, color, children, ...props }: SectionTitleProps) {
  const { theme: appTheme } = useTheme();
  return (
    <RNText style={[styles.title, { color: color ?? appTheme.colors.text }, style]} {...props}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.sectionTitle },
});
