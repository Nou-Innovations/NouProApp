import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { AppButton, AppBottomSheet } from '@/shared/components/ui';
import { Text, Caption } from '@/shared/components/ui/Typography';
import type { AppBottomSheetItem } from '@/shared/components/ui';
import type { RootStackParamList } from '@/shared/types/navigation';
import { ApiError } from '@/shared/services/api';
import { createSuggestion } from '../services/feedbackService';
import { FEEDBACK_CATEGORIES, DEFAULT_CATEGORY_ID } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddSuggestionRouteProp = RouteProp<RootStackParamList, 'AddSuggestion'>;

const MAX_LENGTH = 1000;
const CATEGORY_ITEMS: AppBottomSheetItem[] = FEEDBACK_CATEGORIES.map((c) => ({
  id: c.id,
  title: c.title,
}));

export default function AddSuggestionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddSuggestionRouteProp>();
  const { theme: appTheme } = useTheme();

  const initialCategory = route.params?.defaultCategoryId ?? DEFAULT_CATEGORY_ID;
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isButtonEnabled = suggestion.trim().length > 0 && !isSubmitting;
  const selectedCategory =
    FEEDBACK_CATEGORIES.find((c) => c.id === categoryId) ?? FEEDBACK_CATEGORIES[0];

  // Auto-focus the input when the screen loads
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    const text = suggestion.trim();
    if (!text || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createSuggestion({ categoryId, text });
      navigation.goBack(); // board reloads on focus
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Failed to submit suggestion. Please try again.';
      AppAlert.alert('Error', message);
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
          {/* Category picker */}
          <TouchableOpacity
            style={[
              styles.categorySelector,
              { backgroundColor: appTheme.colors.surface, borderColor: appTheme.colors.borderColor },
            ]}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.7}
          >
            <Icon name={selectedCategory.icon} size={20} color={appTheme.colors.primary} />
            <View style={styles.categoryTextWrap}>
              <Caption style={{ color: appTheme.colors.textMuted }}>Category</Caption>
              <Text style={[styles.categoryValue, { color: appTheme.colors.text }]}>
                {selectedCategory.title}
              </Text>
            </View>
            <Icon name="chevron-down" size={20} color={appTheme.colors.iconMuted} />
          </TouchableOpacity>

          {/* Input area */}
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { color: appTheme.colors.text }]}
            value={suggestion}
            onChangeText={(t) => setSuggestion(t.slice(0, MAX_LENGTH))}
            placeholder="Write your suggestion..."
            placeholderTextColor={appTheme.colors.textMuted}
            multiline
            textAlignVertical="top"
            selectionColor={appTheme.colors.primary}
            autoCorrect
            maxLength={MAX_LENGTH}
          />
        </View>

        {/* Bottom action */}
        <View
          style={[
            styles.bottomActions,
            { borderTopColor: appTheme.colors.borderColor, backgroundColor: appTheme.colors.background },
          ]}
        >
          <AppButton
            title="Send suggestion"
            onPress={handleSubmit}
            disabled={!isButtonEnabled}
            loading={isSubmitting}
          />
        </View>
      </KeyboardAvoidingView>

      <AppBottomSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choose a category"
        items={CATEGORY_ITEMS}
        selectedItemId={categoryId}
        onSelectItem={(item) => {
          setCategoryId(item.id);
          setPickerOpen(false);
        }}
      />
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
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  categoryTextWrap: {
    flex: 1,
  },
  categoryValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 26,
    paddingTop: 4,
  },
  bottomActions: {
    padding: 16,
    borderTopWidth: 1,
  },
});
