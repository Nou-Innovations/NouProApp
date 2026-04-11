/**
 * ForgotPasswordScreen
 * Request password reset via email
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import AppButton from '@/shared/components/ui/AppButton';
import AppTextField from '@/shared/components/ui/AppTextField';
import { authAPI } from '@/shared/services/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const isFormValid = email.trim().length > 0;

  const handleSendReset = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authAPI.forgotPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      if (err.status === 0 || err.code === 'ERR_NETWORK') {
        setError('No internet connection. Please check your network and try again.');
      } else {
        // Always show success to prevent email enumeration
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
        <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="arrow-back" size={24} color={appTheme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <Text style={[styles.title, { color: appTheme.colors.text }]}>
              Check your email
            </Text>
            <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
              If an account exists for {email.trim()}, we've sent instructions to reset your password.
            </Text>
          </View>

          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: appTheme.colors.surface }]}>
              <Icon name="mail-outline" size={48} color={appTheme.colors.primary} />
            </View>
          </View>
        </View>

        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
          <AppButton
            title="Back to Login"
            onPress={() => navigation.goBack()}
            variant="primary"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="arrow-back" size={24} color={appTheme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <Text style={[styles.title, { color: appTheme.colors.text }]}>
              Reset Password
            </Text>
            <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </Text>
          </View>

          {error ? (
            <Text style={[styles.errorText, { color: appTheme.colors.error }]}>{error}</Text>
          ) : null}

          <View style={styles.formContainer}>
            <AppTextField
              label="Email Address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
              placeholder="Enter your email address"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
            />
          </View>
        </ScrollView>

        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
          <AppButton
            title="Send Reset Link"
            onPress={handleSendReset}
            loading={loading}
            disabled={loading || !isFormValid}
            variant={isFormValid && !loading ? 'primary' : 'disabled'}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
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
    marginBottom: 8,
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
  iconContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomContainer: {
    paddingHorizontal: 16,
  },
});
