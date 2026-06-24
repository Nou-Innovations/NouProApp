/**
 * CreatePasswordScreen
 * Create password for new account
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import AppTextField from '@/shared/components/ui/AppTextField';
import AppButton from '@/shared/components/ui/AppButton';
import { KeyboardAwareScreen } from '@/shared/components/layout';
import { useRegistrationStore } from '@/shared/store/registrationStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'CreatePassword'>;

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

const validatePassword = (password: string): PasswordValidation => ({
  minLength: password.length >= 8,
  hasUppercase: /[A-Z]/.test(password),
  hasLowercase: /[a-z]/.test(password),
  hasNumber: /\d/.test(password),
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
});

const isPasswordStrong = (v: PasswordValidation): boolean =>
  v.minLength && v.hasUppercase && v.hasLowercase && v.hasNumber && v.hasSpecialChar;

export default function CreatePasswordScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { userData } = route.params;
  const setRegistrationPassword = useRegistrationStore((state) => state.setPassword);

  // State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Warn user before leaving with unsaved data
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!password && !confirmPassword) return; // Nothing to lose
      e.preventDefault();
      Alert.alert(
        'Discard changes?',
        'You have unsaved data. Are you sure you want to go back?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, password, confirmPassword]);

  // Validation
  const passwordValidation = validatePassword(password);
  const isPasswordValid = isPasswordStrong(passwordValidation);
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isFormValid = isPasswordValid && doPasswordsMatch;

  const handleContinue = () => {
    setHasAttemptedSubmit(true);
    
    if (!isPasswordValid) {
      setError('Please ensure your password meets all requirements');
      return;
    }

    if (!doPasswordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setError('');

    // Store password in registration store (not in nav params for security)
    setRegistrationPassword(password);
    navigation.navigate('UploadProfilePicture', {
      userData,
    });
  };

  const requirementLabels: Record<keyof PasswordValidation, string> = {
    minLength: 'At least 8 characters',
    hasUppercase: 'One uppercase letter',
    hasLowercase: 'One lowercase letter',
    hasNumber: 'One number',
    hasSpecialChar: 'One special character',
  };

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <KeyboardAwareScreen
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
      >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="arrow-back" size={24} color={appTheme.colors.text} />
          </TouchableOpacity>

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
              maxLength={128}
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
              maxLength={128}
              error={hasAttemptedSubmit && confirmPassword.length > 0 && !doPasswordsMatch}
            />

            {/* Password Requirements */}
            <View style={[styles.requirementsContainer, { backgroundColor: appTheme.colors.cardBackground }]}>
              <Text style={[styles.requirementsTitle, { color: appTheme.colors.text }]}>
                Password Requirements:
              </Text>
              {(Object.entries(requirementLabels) as [keyof PasswordValidation, string][]).map(
                ([key, label]) => {
                  const met = passwordValidation[key];
                  const showStatus = password.length > 0;
                  return (
                    <View key={key} style={styles.requirementItem}>
                      <Icon
                        name={showStatus && met ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={showStatus && met ? appTheme.colors.success : appTheme.colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.requirementText,
                          { color: showStatus && met ? appTheme.colors.success : appTheme.colors.textMuted },
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  );
                },
              )}
            </View>
          </View>
      </KeyboardAwareScreen>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
  requirementsContainer: {
    padding: 16,
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    marginLeft: 8,
    fontFamily: theme.fonts.primary.regular,
  },
  bottomContainer: {
    paddingHorizontal: 16,
  },
});
