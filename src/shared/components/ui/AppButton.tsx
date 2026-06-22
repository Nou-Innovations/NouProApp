import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, TextStyle, GestureResponderEvent, ActivityIndicator, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { ButtonText } from './Typography';
import { useTheme } from '@/shared/theme/ThemeProvider';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'disabled'
  | 'alert'
  | 'confirm'
  | 'accent'
  | 'destructive';
type ButtonSize = 'default' | 'small';

/**
 * Icon prop accepts EITHER a Lucide icon component (preferred, e.g. `iconLeft={MessageCircle}`)
 * OR a legacy string name routed through the shared `Icon` wrapper (e.g. `iconLeft="message-circle"`).
 * Both are supported so existing call sites keep working.
 */
type ButtonIcon = LucideIcon | string;

interface AppButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch the button to fill its container's width (replaces ad-hoc `style={{ width: '100%' }}`). */
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: ButtonIcon;
  iconRight?: ButtonIcon;
  /** Defaults to `title`. Set when the visible label isn't descriptive enough for screen readers. */
  accessibilityLabel?: string;
}

const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'default',
  fullWidth = false,
  style,
  textStyle,
  disabled = false,
  loading = false,
  iconLeft,
  iconRight,
  accessibilityLabel,
}) => {
  const { theme: appTheme } = useTheme();

  const getButtonStyles = () => {
    let specificButtonStyle: ViewStyle = {};
    let specificTextStyle: TextStyle = {};

    const actualVariant = disabled && variant !== 'disabled' ? 'disabled' : variant;

    switch (actualVariant) {
      case 'primary':
        specificButtonStyle = {
          backgroundColor: appTheme.colors.primary,
        };
        specificTextStyle = {
          color: appTheme.colors.background,
        };
        break;
      case 'secondary':
        specificButtonStyle = {
          backgroundColor: appTheme.colors.background,
        };
        specificTextStyle = {
          color: appTheme.colors.primary,
        };
        break;
      case 'outline':
        specificButtonStyle = {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: appTheme.colors.primary,
        };
        specificTextStyle = {
          color: appTheme.colors.primary,
        };
        break;
      case 'disabled':
        specificButtonStyle = {
          backgroundColor: appTheme.colors.buttonBackgroundDisabled,
        };
        specificTextStyle = {
          color: appTheme.colors.textMuted,
        };
        break;
      case 'alert':
        specificButtonStyle = {
          backgroundColor: appTheme.colors.error,
        };
        specificTextStyle = {
          color: appTheme.colors.textInverse,
        };
        break;
      case 'confirm':
        specificButtonStyle = {
          backgroundColor: appTheme.colors.success,
        };
        specificTextStyle = {
          color: appTheme.colors.textInverse,
        };
        break;
      case 'accent':
        specificButtonStyle = {
          backgroundColor: appTheme.colors.accent,
        };
        specificTextStyle = {
          color: appTheme.colors.textInverse,
        };
        break;
      case 'destructive':
        // Outline styling in the error color — for destructive secondary actions
        // (e.g. Reject) sitting next to a solid confirm button.
        specificButtonStyle = {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: appTheme.colors.error,
        };
        specificTextStyle = {
          color: appTheme.colors.error,
        };
        break;
      default:
        specificButtonStyle = {
          backgroundColor: appTheme.colors.primary,
        };
        specificTextStyle = {
          color: appTheme.colors.background,
        };
    }
    return { button: specificButtonStyle, text: specificTextStyle };
  };

  const { button: variantButtonStyle, text: variantTextStyle } = getButtonStyles();
  const isDisabled = disabled || loading || variant === 'disabled';

  // Determine spinner color based on variant
  // Primary buttons: white spinner (since they have colored background)
  // Outline/Secondary buttons: primary color spinner (since they have light/transparent background)
  const getSpinnerColor = () => {
    const actualVariant = disabled && variant !== 'disabled' ? 'disabled' : variant;

    switch (actualVariant) {
      case 'primary':
        return appTheme.colors.background; // White on primary background
      case 'secondary':
      case 'outline':
        return appTheme.colors.primary; // Primary color on light/transparent background
      case 'alert':
        return appTheme.colors.textInverse; // White on alert background
      case 'confirm':
        return appTheme.colors.textInverse; // White on confirm background
      case 'accent':
        return appTheme.colors.textInverse; // White on accent (highlight) background
      case 'destructive':
        return appTheme.colors.error; // Error color on transparent background
      case 'disabled':
        return appTheme.colors.textMuted; // Muted color for disabled state
      default:
        return appTheme.colors.background; // Default to white
    }
  };

  const spinnerColor = getSpinnerColor();

  const sizeStyles = size === 'small' ? styles.smallButton : styles.defaultButton;
  const iconColor = variantTextStyle.color as string;

  // Renders either a Lucide component or a legacy string-name icon, keeping the API backward compatible.
  const renderIcon = (icon: ButtonIcon | undefined, marginStyle: ViewStyle) => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return <Icon name={icon} size={theme.iconSizes.md} color={iconColor} style={marginStyle} />;
    }
    const IconComponent = icon;
    return <IconComponent size={theme.iconSizes.md} color={iconColor} strokeWidth={2} style={marginStyle} />;
  };

  return (
    <TouchableOpacity
      style={[styles.baseButton, sizeStyles, variantButtonStyle, fullWidth && styles.fullWidth, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <View style={styles.contentContainer}>
          {renderIcon(iconLeft, styles.iconLeft)}
          <ButtonText style={[variantTextStyle, textStyle]}>{title}</ButtonText>
          {renderIcon(iconRight, styles.iconRight)}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: 12,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  defaultButton: {
    height: theme.heights.button,
  },
  smallButton: {
    height: theme.heights.buttonSmall,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: theme.spacing.sm,
  },
  iconRight: {
    marginLeft: theme.spacing.sm,
  },
});

export default AppButton;
