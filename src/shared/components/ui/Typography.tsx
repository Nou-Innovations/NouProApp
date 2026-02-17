import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import theme from '@/shared/theme';

interface TypographyProps extends TextProps {
  variant?: keyof typeof theme.typography;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export const Text: React.FC<TypographyProps> = ({
  variant = 'body',
  style,
  color,
  align,
  children,
  ...props
}) => {
  const textStyle = [
    styles[variant],
    color && { color },
    align && { textAlign: align },
    style,
  ];

  return (
    <RNText style={textStyle} {...props}>
      {children}
    </RNText>
  );
};

// Create title components for convenience
export const H1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => <Text variant="h1" {...props} />;
export const H2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => <Text variant="h2" {...props} />;
export const H3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => <Text variant="h3" {...props} />;
export const H4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => <Text variant="h4" {...props} />;
export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => <Text variant="caption" {...props} />;
export const ButtonText: React.FC<Omit<TypographyProps, 'variant'>> = (props) => <Text variant="button" {...props} />;
export const Label: React.FC<Omit<TypographyProps, 'variant'>> = (props) => <Text variant="label" {...props} />;
export const BodyBold: React.FC<Omit<TypographyProps, 'variant'>> = (props) => <Text variant="bodyBold" {...props} />;
export const BodyMedium: React.FC<Omit<TypographyProps, 'variant'>> = (props) => <Text variant="bodyMedium" {...props} />;

// Create styles based on our theme typography
const styles = StyleSheet.create({
  h1: { ...theme.typography.h1 },
  h2: { ...theme.typography.h2 },
  h3: { ...theme.typography.h3 },
  h4: { ...theme.typography.h4 },
  body: { ...theme.typography.body },
  bodyBold: { ...theme.typography.bodyBold },
  bodyMedium: { ...theme.typography.bodyMedium },
  caption: { ...theme.typography.caption },
  button: { ...theme.typography.button },
  label: { ...theme.typography.label },
  logo: { ...theme.typography.logo },
}); 