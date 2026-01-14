import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, TextStyle, GestureResponderEvent, ActivityIndicator, View } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { ButtonText } from './Typography';
import { useTheme } from '@/shared/theme/ThemeProvider';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'disabled' | 'alert' | 'confirm';
type ButtonSize = 'default' | 'small';

interface AppButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: keyof typeof Icon.glyphMap;
  iconRight?: keyof typeof Icon.glyphMap;
}

const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'default',
  style,
  textStyle,
  disabled = false,
  loading = false,
  iconLeft,
  iconRight,
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
  const spinnerColor = variant === 'primary' || variant === 'alert' || variant === 'confirm'
    ? appTheme.colors.textInverse 
    : appTheme.colors.primary;

  const sizeStyles = size === 'small' ? styles.smallButton : styles.defaultButton;
  const iconSize = 24;
  const iconColor = variantTextStyle.color as string;

  return (
    <TouchableOpacity
      style={[styles.baseButton, sizeStyles, variantButtonStyle, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <View style={styles.contentContainer}>
          {iconLeft && (
            <Icon 
              name={iconLeft} 
              size={iconSize} 
              color={iconColor} 
              style={styles.iconLeft}
            />
          )}
          <ButtonText style={[variantTextStyle, textStyle]}>{title}</ButtonText>
          {iconRight && (
            <Icon 
              name={iconRight} 
              size={iconSize} 
              color={iconColor} 
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: 8,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultButton: {
    height: 56,
  },
  smallButton: {
    height: 40,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default AppButton; 