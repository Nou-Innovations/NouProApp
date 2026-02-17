import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import type { RootStackParamList } from '@/shared/types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddSuggestionRouteProp = RouteProp<RootStackParamList, 'AddSuggestion'>;

export default function AddSuggestionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddSuggestionRouteProp>();
  const { theme: appTheme } = useTheme();
  const { categoryId, categoryTitle } = route.params;

  const [suggestion, setSuggestion] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isButtonEnabled = suggestion.trim().length > 0;

  // Auto-focus the input when the screen loads
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    if (!isButtonEnabled) return;

    setIsSubmitting(true);
    
    try {
      // In real app, this would send to API
      // await post('/feedback/suggestions', {
      //   categoryId,
      //   text: suggestion.trim(),
      // });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      Alert.alert(
        'Thank you!',
        'Your suggestion has been submitted successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      Alert.alert('Error', 'Failed to submit suggestion. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Help the community"
        leftAction={{
          icon: 'chevron-left',
          onPress: () => navigation.goBack(),
          accessibilityLabel: 'Go back',
        }}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <View style={styles.content}>
          {/* Input area */}
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                {
                  color: appTheme.colors.primary,
                }
              ]}
              value={suggestion}
              onChangeText={setSuggestion}
              placeholder="Write something..."
              placeholderTextColor={appTheme.colors.textMuted}
              multiline
              textAlignVertical="top"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              selectionColor={appTheme.colors.primary}
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Bottom action */}
        <View style={[styles.bottomActions, { 
          borderTopColor: appTheme.colors.borderColor,
          backgroundColor: appTheme.colors.background,
        }]}>
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              { 
                backgroundColor: isButtonEnabled ? appTheme.colors.primary : appTheme.colors.surface,
              }
            ]}
            onPress={handleSubmit}
            disabled={!isButtonEnabled || isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.submitButtonText,
              { color: isButtonEnabled ? '#FFFFFF' : appTheme.colors.textMuted }
            ]}>
              {isSubmitting ? 'Sending...' : 'Send suggestion'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    flex: 1,
  },
  textInput: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 26,
    flex: 1,
    paddingTop: 8,
  },
  bottomActions: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
});
