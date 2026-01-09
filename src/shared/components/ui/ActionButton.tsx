import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';

type ActionVariant = 'add' | 'remove' | 'check' | 'uncheck';
type ActionSize = 'default' | 'small';

interface ActionButtonProps {
  variant: ActionVariant;
  size?: ActionSize;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

/**
 * ActionButton Component
 * 
 * Used for checkboxes, add/remove operations
 * 
 * Sizes:
 * - default: 32x32px with 20px icon
 * - small: 24x24px with 16px icon
 * 
 * Variants:
 * - add: Primary background, white "+" icon
 * - remove: White background, primary "-" icon
 * - check: Primary background, white checkmark icon
 * - uncheck: White background, grey border (empty)
 */
const ActionButton: React.FC<ActionButtonProps> = ({
  variant,
  size = 'default',
  onPress,
  style,
  disabled = false,
}) => {
  const { theme: appTheme } = useTheme();

  const getStyles = () => {
    let buttonStyle: ViewStyle = {};
    let iconColor: string = appTheme.colors.primary;
    let iconName: keyof typeof Icon.glyphMap = 'add';
    let showIcon = true;

    switch (variant) {
      case 'add':
        buttonStyle = {
          backgroundColor: appTheme.colors.primary,
        };
        iconColor = appTheme.colors.textInverse;
        iconName = 'add';
        break;
      case 'remove':
        buttonStyle = {
          backgroundColor: appTheme.colors.background,
        };
        iconColor = appTheme.colors.primary;
        iconName = 'remove';
        break;
      case 'check':
        buttonStyle = {
          backgroundColor: appTheme.colors.primary,
        };
        iconColor = appTheme.colors.textInverse;
        iconName = 'checkmark';
        break;
      case 'uncheck':
        buttonStyle = {
          backgroundColor: appTheme.colors.background,
          borderWidth: 1,
          borderColor: appTheme.colors.textMuted,
        };
        showIcon = false;
        break;
    }

    if (disabled) {
      buttonStyle = {
        ...buttonStyle,
        backgroundColor: appTheme.colors.buttonBackgroundDisabled,
        borderWidth: 0,
      };
      iconColor = appTheme.colors.textMuted;
    }

    return { buttonStyle, iconColor, iconName, showIcon };
  };

  const { buttonStyle, iconColor, iconName, showIcon } = getStyles();
  const sizeStyles = size === 'small' ? styles.smallButton : styles.defaultButton;
  const iconSize = size === 'small' ? 16 : 20;

  return (
    <TouchableOpacity
      style={[styles.baseButton, sizeStyles, buttonStyle, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {showIcon && (
        <Icon name={iconName} size={iconSize} color={iconColor} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultButton: {
    width: 32,
    height: 32,
  },
  smallButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
});

export default ActionButton;

