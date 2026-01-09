import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

interface AppTextFieldProps extends Omit<TextInputProps, 'style' | 'multiline'> {
  /** The label text displayed above the field */
  label: string;
  /** Current value of the input */
  value: string;
  /** Callback when text changes */
  onChangeText: (text: string) => void;
  /** Optional placeholder shown in the field */
  placeholder?: string;
  /** Optional left icon name from Icon */
  leftIcon?: keyof typeof Icon.glyphMap;
  /** Whether the field is in error state */
  error?: boolean;
  /** Custom container style (wraps label + field) */
  containerStyle?: ViewStyle;
  /** Whether the field is disabled */
  disabled?: boolean;
  
  // Multiline text area props
  /** Enable multiline text area mode */
  isMultiline?: boolean;
  /** Number of visible lines for multiline (default: 4) */
  numberOfLines?: number;
  /** Minimum height for multiline field */
  minHeight?: number;
  
  // Multi-select/Dropdown props
  /** Enable dropdown/selection mode (non-editable, opens modal) */
  isDropdown?: boolean;
  /** Enable multi-select count display mode (e.g., "4 items") */
  multiSelect?: boolean;
  /** Number of selected items (only used when multiSelect is true) */
  selectedCount?: number;
  /** Label for the count - singular form (e.g., "item", "staff", "product") */
  countLabelSingular?: string;
  /** Label for the count - plural form. If not provided, adds 's' to singular */
  countLabelPlural?: string;
  /** Callback when the dropdown/multi-select field is pressed */
  onPress?: () => void;
}

/**
 * AppTextField - Unified text field component
 * 
 * Design: Label positioned ABOVE the field (not floating inside)
 * 
 * Dimensions:
 * - Field height: 40px
 * - Border: 1px, radius: 8px
 * - Label: 14px, 8px above field, 8px margin from left
 * 
 * States:
 * - Inactive: border grey, placeholder 16px grey, vertically centered
 * - Selected: border black, placeholder light grey, caret 2px x 24px
 * - Typing: placeholder hidden, text 16px black
 * - Filled: border grey, text stays black
 * 
 * Variants: password, numeric, phone, email, dropdown, multiSelect, multiline
 */
const AppTextField: React.FC<AppTextFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  leftIcon,
  error = false,
  containerStyle,
  disabled = false,
  // Multiline props
  isMultiline = false,
  numberOfLines = 4,
  minHeight,
  // Dropdown/Multi-select props
  isDropdown = false,
  multiSelect = false,
  selectedCount = 0,
  countLabelSingular = 'item',
  countLabelPlural,
  onPress,
  ...textInputProps
}) => {
  const { theme: appTheme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  
  // Get text field config from theme
  const tfConfig = theme.textField;
  
  // Determine if field has content
  const hasValue = value.length > 0;
  const hasMultiSelectValue = multiSelect && selectedCount > 0;
  
  // Calculate border color based on state
  const getBorderColor = () => {
    if (error) return appTheme.colors.error;
    if (isFocused) return appTheme.colors.textFieldBorderSelected;
    return appTheme.colors.textFieldBorderDefault;
  };
  
  // Calculate label color based on state
  const getLabelColor = () => {
    if (error) return appTheme.colors.error;
    return appTheme.colors.textFieldLabelDefault;
  };
  
  // Calculate placeholder color based on state
  const getPlaceholderColor = () => {
    if (isFocused) return appTheme.colors.textFieldPlaceholder; // light grey when selected
    return appTheme.colors.textFieldLabelDefault; // grey when inactive
  };
  
  // Calculate icon color based on state
  const getIconColor = () => {
    if (error) return appTheme.colors.error;
    if (isFocused) return appTheme.colors.textFieldBorderSelected;
    return appTheme.colors.textFieldLabelDefault;
  };
  
  // Calculate field height
  const getFieldHeight = () => {
    if (isMultiline) {
      return minHeight || tfConfig.multiline.minHeight;
    }
    return tfConfig.height;
  };
  
  // Calculate left padding based on icon presence
  const getLeftPadding = () => {
    return leftIcon ? tfConfig.iconContainerWidth : tfConfig.paddingHorizontal;
  };
  
  // Generate the count display text for multi-select
  const getCountDisplayText = () => {
    if (selectedCount === 0) return '';
    const pluralLabel = countLabelPlural || `${countLabelSingular}s`;
    const labelToUse = selectedCount === 1 ? countLabelSingular : pluralLabel;
    return `${selectedCount} ${labelToUse}`;
  };
  
  const handleFocus = () => {
    if (!isDropdown && !multiSelect) {
      setIsFocused(true);
    }
  };
  
  const handleBlur = () => {
    setIsFocused(false);
  };
  
  const handlePress = () => {
    if (disabled) return;
    
    if ((isDropdown || multiSelect) && onPress) {
      onPress();
    } else if (!isDropdown && !multiSelect) {
      inputRef.current?.focus();
    }
  };
  
  // Render dropdown/selection variant
  if (isDropdown || multiSelect) {
    const displayValue = multiSelect ? getCountDisplayText() : value;
    const showPlaceholder = !displayValue && placeholder;
    
    return (
      <View style={[styles.wrapper, containerStyle]}>
        {/* Label above field */}
        <Text style={[
          styles.label,
          {
            fontSize: tfConfig.label.fontSize,
            marginBottom: tfConfig.label.marginBottom,
            marginLeft: tfConfig.label.marginLeft,
            color: getLabelColor(),
            fontFamily: theme.fonts.primary.medium,
          }
        ]}>
          {label}
        </Text>
        
        {/* Field Container */}
        <TouchableOpacity
          onPress={handlePress}
          disabled={disabled}
          activeOpacity={0.7}
          style={[
            styles.fieldContainer,
            {
              height: tfConfig.height,
              borderRadius: tfConfig.borderRadius,
              borderWidth: tfConfig.borderWidth,
              borderColor: getBorderColor(),
              backgroundColor: appTheme.colors.inputBackground,
              paddingLeft: getLeftPadding(),
              paddingRight: tfConfig.paddingHorizontal,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          {/* Left Icon */}
          {leftIcon && (
            <View style={[styles.iconContainer, { width: tfConfig.iconContainerWidth }]}>
              <Icon
                name={leftIcon}
                size={tfConfig.iconSize}
                color={getIconColor()}
              />
            </View>
          )}
          
          {/* Display Value or Placeholder */}
          <Text
            style={[
              styles.displayText,
              {
                fontSize: tfConfig.input.fontSize,
                color: showPlaceholder 
                  ? getPlaceholderColor() 
                  : appTheme.colors.textFieldText,
                fontFamily: theme.fonts.primary.semiBold,
              },
            ]}
            numberOfLines={1}
          >
            {displayValue || placeholder}
          </Text>
          
          {/* Right Chevron Icon */}
          <Icon
            name={multiSelect ? 'chevron-forward' : 'chevron-down'}
            size={tfConfig.dropdown.rightIconSize}
            color={appTheme.colors.textFieldLabelDefault}
          />
        </TouchableOpacity>
      </View>
    );
  }
  
  // Render standard text input variant (single-line or multiline)
  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* Label above field */}
      <Text style={[
        styles.label,
        {
          fontSize: tfConfig.label.fontSize,
          marginBottom: tfConfig.label.marginBottom,
          marginLeft: tfConfig.label.marginLeft,
          color: getLabelColor(),
          fontFamily: theme.fonts.primary.medium,
        }
      ]}>
        {label}
      </Text>
      
      {/* Field Container */}
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={1}
        style={[
          styles.fieldContainer,
          {
            height: isMultiline ? undefined : tfConfig.height,
            minHeight: isMultiline ? getFieldHeight() : undefined,
            borderRadius: tfConfig.borderRadius,
            borderWidth: tfConfig.borderWidth,
            borderColor: getBorderColor(),
            backgroundColor: appTheme.colors.inputBackground,
            paddingLeft: getLeftPadding(),
            paddingRight: tfConfig.paddingHorizontal,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {/* Left Icon */}
        {leftIcon && (
          <View style={[
            styles.iconContainer, 
            { 
              width: tfConfig.iconContainerWidth,
              justifyContent: isMultiline ? 'flex-start' : 'center',
              paddingTop: isMultiline ? tfConfig.multiline.paddingVertical : 0,
            }
          ]}>
            <Icon
              name={leftIcon}
              size={tfConfig.iconSize}
              color={getIconColor()}
            />
          </View>
        )}
        
        {/* TextInput */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={getPlaceholderColor()}
          editable={!disabled}
          selectionColor={appTheme.colors.textFieldBorderSelected}
          multiline={isMultiline}
          numberOfLines={isMultiline ? numberOfLines : 1}
          textAlignVertical={isMultiline ? 'top' : 'center'}
          style={[
            styles.input,
            {
              fontSize: tfConfig.input.fontSize,
              color: appTheme.colors.textFieldText,
              fontFamily: theme.fonts.primary.semiBold,
              paddingVertical: isMultiline ? tfConfig.multiline.paddingVertical : 0,
              lineHeight: isMultiline ? tfConfig.multiline.lineHeight : undefined,
            },
          ]}
          {...textInputProps}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    // Wrapper contains label + field
  },
  label: {
    // Label above field - styles applied inline
  },
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayText: {
    flex: 1,
  },
  input: {
    flex: 1,
    padding: 0,
    margin: 0,
  },
});

export default AppTextField;
