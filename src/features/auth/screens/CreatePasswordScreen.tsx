/**
 * CreatePasswordScreen
 * Create password for new account
 */

import React, { useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import AppTextField from '@/shared/components/ui/AppTextField';
import AppButton from '@/shared/components/ui/AppButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'CreatePassword'>;

export default function CreatePasswordScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { userData } = route.params;
  
  // State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Validation
  const isPasswordValid = password.length >= 8;
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isFormValid = isPasswordValid && doPasswordsMatch;

  const handleContinue = () => {
    setHasAttemptedSubmit(true);
    
    if (!isPasswordValid) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!doPasswordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    
    // Navigate to upload profile picture
    navigation.navigate('UploadProfilePicture', {
      userData,
      password,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={[styles.title, { color: appTheme.colors.text }]}>
              Create a password
            </Text>
            <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
              Protect your account by creating a strong password.
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <Text style={[styles.errorText, { color: appTheme.colors.error }]}>{error}</Text>
          ) : null}

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <AppTextField
              label="New Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError('');
              }}
              placeholder="Enter your password"
              secureTextEntry
              leftIcon="lock-closed-outline"
              error={hasAttemptedSubmit && !isPasswordValid}
            />

            <AppTextField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (error) setError('');
              }}
              placeholder="Confirm your password"
              secureTextEntry
              leftIcon="lock-closed-outline"
              error={hasAttemptedSubmit && confirmPassword.length > 0 && !doPasswordsMatch}
            />

            {/* Password Requirements Hint */}
            <Text style={[styles.hintText, { color: appTheme.colors.textMuted }]}>
              Password must be at least 8 characters
            </Text>
          </View>
        </View>

        {/* Bottom Button */}
        <View style={[
          styles.bottomContainer,
          { paddingBottom: insets.bottom + 16 }
        ]}>
          <AppButton
            title="Continue"
            onPress={handleContinue}
            variant={isFormValid ? 'primary' : 'disabled'}
            disabled={!isFormValid}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
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
    paddingHorizontal: 16,
  },
  headerSection: {
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.primary.bold,
    lineHeight: 40,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 24,
  },
  errorText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 16,
  },
  formContainer: {
    gap: 16,
  },
  hintText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: -8,
  },
  bottomContainer: {
    paddingHorizontal: 16,
  },
});
