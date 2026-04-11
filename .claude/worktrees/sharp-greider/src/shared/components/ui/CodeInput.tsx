/**
 * CodeInput Component
 * 6-digit OTP verification input with individual boxes
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

interface CodeInputProps {
  /** Number of digits (default: 6) */
  length?: number;
  /** Called when all digits are entered */
  onComplete: (code: string) => void;
  /** Called on each change */
  onChange?: (code: string) => void;
  /** Error state - shows red border */
  error?: boolean;
  /** Auto focus first input on mount */
  autoFocus?: boolean;
  /** Disable all inputs */
  disabled?: boolean;
}

export default function CodeInput({
  length = 6,
  onComplete,
  onChange,
  error = false,
  autoFocus = true,
  disabled = false,
}: CodeInputProps) {
  const { theme: appTheme } = useTheme();
  const [code, setCode] = useState<string[]>(Array(length).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [autoFocus]);

  // Handle input change
  const handleChange = (text: string, index: number) => {
    // Only allow numbers
    const digit = text.replace(/[^0-9]/g, '');
    
    if (digit.length > 1) {
      // Handle paste - distribute digits across inputs
      const digits = digit.split('').slice(0, length);
      const newCode = [...code];
      
      digits.forEach((d, i) => {
        if (index + i < length) {
          newCode[index + i] = d;
        }
      });
      
      setCode(newCode);
      onChange?.(newCode.join(''));
      
      // Focus appropriate input after paste
      const nextIndex = Math.min(index + digits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      
      // Check if complete
      if (newCode.every(d => d !== '')) {
        Keyboard.dismiss();
        onComplete(newCode.join(''));
      }
      return;
    }

    // Single digit input
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    onChange?.(newCode.join(''));

    // Auto-advance to next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (digit && newCode.every(d => d !== '')) {
      Keyboard.dismiss();
      onComplete(newCode.join(''));
    }
  };

  // Handle backspace
  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (code[index] === '' && index > 0) {
        // Move to previous input if current is empty
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        onChange?.(newCode.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
        onChange?.(newCode.join(''));
      }
    }
  };

  // Handle focus
  const handleFocus = (index: number) => {
    setFocusedIndex(index);
    // Select all text when focusing
    inputRefs.current[index]?.setNativeProps({ selection: { start: 0, end: 1 } });
  };

  // Handle blur
  const handleBlur = () => {
    setFocusedIndex(null);
  };

  // Get border color based on state
  const getBorderColor = (index: number) => {
    if (error) return appTheme.colors.error;
    if (focusedIndex === index) return appTheme.colors.primary;
    if (code[index]) return appTheme.colors.primary;
    return appTheme.colors.borderColor;
  };

  return (
    <View style={styles.container}>
      {Array(length)
        .fill(0)
        .map((_, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            style={[
              styles.input,
              {
                borderColor: getBorderColor(index),
                backgroundColor: appTheme.colors.inputBackground,
                color: appTheme.colors.text,
              },
            ]}
            value={code[index]}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => handleFocus(index)}
            onBlur={handleBlur}
            keyboardType="number-pad"
            maxLength={6} // Allow paste of full code
            selectTextOnFocus
            editable={!disabled}
            selectionColor={appTheme.colors.primary}
          />
        ))}
    </View>
  );
}

// Reset function to clear the code (useful for error states)
export const useCodeInputReset = () => {
  const [key, setKey] = useState(0);
  const reset = () => setKey((k) => k + 1);
  return { key, reset };
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  input: {
    width: 50,
    height: 56,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 24,
    fontFamily: theme.fonts.primary.semiBold,
    textAlign: 'center',
  },
});
