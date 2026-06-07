import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';

// Design specs from design.json
const SEARCH_BAR_HEIGHT = 44;
const SEARCH_BAR_FONT_SIZE = 16;
const SEARCH_BAR_ICON_SIZE = 20;
const SEARCH_BAR_BORDER_WIDTH = 1;
const SEARCH_BAR_BORDER_RADIUS = 8;
const SEARCH_BAR_PADDING_HORIZONTAL = 12;

interface AppSearchBarProps extends TextInputProps {
  containerStyle?: ViewStyle;
  onClear?: () => void;
  onScrollStart?: () => void;
}

export interface AppSearchBarRef {
  blur: () => void;
  focus: () => void;
  isFocused: () => boolean;
}

const AppSearchBar = forwardRef<AppSearchBarRef, AppSearchBarProps>(({ 
  containerStyle, 
  style, 
  value, 
  onClear, 
  onFocus, 
  onBlur, 
  onScrollStart,
  ...rest 
}, ref) => {
  const { theme: appTheme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    blur: () => {
      inputRef.current?.blur();
    },
    focus: () => {
      inputRef.current?.focus();
    },
    isFocused: () => isFocused,
  }));
  
  // Determine the current state
  const hasText = value && value.length > 0;
  const isInactive = !isFocused;
  const isActive = isFocused && !hasText;
  const isTyping = isFocused && hasText;
  
  // Color and font logic based on states
  // Inactive: iconMuted color, medium font
  // Active (selected): textMuted color, medium font, primary border
  // Typing: primary color, semiBold font, primary border
  const getStyles = () => {
    if (isInactive) {
      return {
        backgroundColor: appTheme.colors.inputBackground,
        borderColor: appTheme.colors.borderColor,
        textColor: appTheme.colors.iconMuted,
        iconColor: appTheme.colors.iconMuted,
        placeholderColor: appTheme.colors.iconMuted,
        caretColor: appTheme.colors.primary,
        fontFamily: theme.fonts.primary.medium,
      };
    } else if (isActive) {
      return {
        backgroundColor: appTheme.colors.inputBackground,
        borderColor: appTheme.colors.primary,
        textColor: appTheme.colors.borderColor,
        iconColor: appTheme.colors.textSecondary,
        placeholderColor: appTheme.colors.textMuted,
        caretColor: appTheme.colors.primary,
        fontFamily: theme.fonts.primary.medium,
      };
    } else if (isTyping) {
      return {
        backgroundColor: appTheme.colors.inputBackground,
        borderColor: appTheme.colors.primary,
        textColor: appTheme.colors.primary,
        iconColor: appTheme.colors.primary,
        placeholderColor: appTheme.colors.textMuted,
        caretColor: appTheme.colors.primary,
        fontFamily: theme.fonts.primary.semiBold,
      };
    }
    
    // Fallback
    return {
      backgroundColor: appTheme.colors.inputBackground,
      borderColor: appTheme.colors.textSecondary,
      textColor: appTheme.colors.textSecondary,
      iconColor: appTheme.colors.textSecondary,
      placeholderColor: appTheme.colors.textSecondary,
      caretColor: appTheme.colors.primary,
      fontFamily: theme.fonts.primary.medium,
    };
  };
  
  const currentStyles = getStyles();
  
  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };
  
  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };
  
  // Listen for scroll events to blur the input
  useEffect(() => {
    if (onScrollStart) {
      onScrollStart();
    }
  }, [onScrollStart]);
  
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[
        styles.inputContainer, 
        { 
          backgroundColor: currentStyles.backgroundColor,
          borderWidth: SEARCH_BAR_BORDER_WIDTH,
          borderColor: currentStyles.borderColor,
        }
      ]}>
        <Search 
          size={SEARCH_BAR_ICON_SIZE} 
          color={currentStyles.iconColor} 
        />
        <TextInput
          ref={inputRef}
          style={[
            styles.input, 
            style,
            // Dynamic styles applied LAST to ensure they're not overridden
            { 
              color: currentStyles.textColor,
              fontFamily: currentStyles.fontFamily,
            }, 
          ]}
          placeholderTextColor={currentStyles.placeholderColor}
          selectionColor={currentStyles.caretColor}
          cursorColor={currentStyles.caretColor}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          blurOnSubmit
          {...rest}
        />
        {value ? (
          <TouchableOpacity 
            onPress={() => {
              onClear?.();
              inputRef.current?.blur();
            }} 
            style={styles.clearButton}
          >
            <X size={SEARCH_BAR_ICON_SIZE} color={currentStyles.iconColor} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
});

AppSearchBar.displayName = 'AppSearchBar';

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: SEARCH_BAR_HEIGHT,
    borderRadius: SEARCH_BAR_BORDER_RADIUS,
    paddingHorizontal: SEARCH_BAR_PADDING_HORIZONTAL,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: SEARCH_BAR_FONT_SIZE,
  },
  clearButton: {
    marginLeft: theme.spacing.sm,
  },
});

export default AppSearchBar; 