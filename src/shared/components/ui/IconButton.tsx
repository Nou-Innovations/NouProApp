import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'disable' | 'alert' | 'confirm';
type ButtonSize = 'default' | 'small';

interface IconButtonProps {
  iconName: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: ViewStyle;
  disabled?: boolean;
  iconColor?: string;
  /** Screen-reader label — recommended for icon-only buttons since there's no visible text. */
  accessibilityLabel?: string;
}

const IconButton: React.FC<IconButtonProps> = ({
  iconName,
  onPress,
  variant = 'primary',
  size = 'default',
  style,
  disabled = false,
  iconColor,
  accessibilityLabel,
}) => {
  const { theme: appTheme } = useTheme();
  
  const getButtonStyles = () => {
    let specificButtonStyle: ViewStyle = {};
    let specificIconColor: string = appTheme.colors.primary;

    const actualVariant = disabled && variant !== 'disable' ? 'disable' : variant;

    switch (actualVariant) {
      case 'primary':
        specificButtonStyle = {
          backgroundColor: appTheme.colors.primary,
        };
        specificIconColor = iconColor || appTheme.colors.background;
        break;
      case 'secondary':
        specificButtonStyle = {
          backgroundColor: appTheme.colors.background,
        };
        specificIconColor = iconColor || appTheme.colors.primary;
        break;
      case 'outline':
        specificButtonStyle = {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: appTheme.colors.primary,
        };
        specificIconColor = iconColor || appTheme.colors.primary;
        break;
      case 'disable':
        specificButtonStyle = {
          backgroundColor: appTheme.colors.buttonBackground,
        };
        specificIconColor = iconColor || appTheme.colors.textMuted;
        break;
      case 'alert':
        specificButtonStyle = {
          backgroundColor: appTheme.colors.error,
        };
        specificIconColor = iconColor || appTheme.colors.textInverse;
        break;
      case 'confirm':
        specificButtonStyle = {
          backgroundColor: appTheme.colors.success,
        };
        specificIconColor = iconColor || appTheme.colors.textInverse;
        break;
      default:
        specificButtonStyle = {
          backgroundColor: appTheme.colors.primary,
        };
        specificIconColor = iconColor || appTheme.colors.background;
    }
    return { button: specificButtonStyle, iconCol: specificIconColor };
  };

  const { button: variantButtonStyle, iconCol: variantIconColor } = getButtonStyles();
  const sizeStyles = size === 'small' ? styles.smallButton : styles.defaultButton;
  const iconSize = size === 'small' ? 20 : 24;

  return (
    <TouchableOpacity
      style={[styles.baseButton, sizeStyles, variantButtonStyle, style]}
      onPress={onPress}
      disabled={disabled || variant === 'disable'}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || variant === 'disable' }}
      accessibilityLabel={accessibilityLabel}
    >
      <Icon name={iconName} size={iconSize} color={variantIconColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultButton: {
    width: theme.heights.iconButton,
    height: theme.heights.iconButton,
  },
  smallButton: {
    width: theme.heights.iconButtonSmall,
    height: theme.heights.iconButtonSmall,
  },
});

export default IconButton; 