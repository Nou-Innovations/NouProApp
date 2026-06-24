/**
 * KeyboardAwareScreen
 *
 * The single app-wide scroll container for any screen that contains text inputs.
 * Wraps react-native-keyboard-controller's KeyboardAwareScrollView so the
 * focused TextInput is always scrolled above the on-screen keyboard, with
 * identical behavior on iOS and Android.
 *
 * Replaces the old per-screen `KeyboardAvoidingView` + `ScrollView` pattern.
 * Standardized defaults live here so every screen behaves the same way.
 *
 * Usage notes:
 * - Keep any fixed/absolute bottom bar as a SIBLING *outside* this component.
 * - Requires <KeyboardProvider> mounted near the app root (see App.tsx).
 */
import React from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

type KeyboardAwareScrollViewProps = React.ComponentProps<typeof KeyboardAwareScrollView>;

export interface KeyboardAwareScreenProps extends KeyboardAwareScrollViewProps {
  children: React.ReactNode;
}

export default function KeyboardAwareScreen({
  children,
  bottomOffset = 24,
  ...props
}: KeyboardAwareScreenProps) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={bottomOffset}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
