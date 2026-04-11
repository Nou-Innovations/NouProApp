import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { useProfileStore } from '@/shared/store/profileStore';
import { authAPI, unwrapAuthResponse } from '@/shared/services/api';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import AppTextField from '@/shared/components/ui/AppTextField';
import AppButton from '@/shared/components/ui/AppButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(true);

  // Use profileStore for auth (single source of truth)
  const login = useProfileStore((state) => state.login);
  const storeSetStaySignedIn = useProfileStore((state) => state.setStaySignedIn);

  // Form validity
  const isFormValid = email.trim().length > 0 && password.length > 0;

  const handleLogin = async () => {
    setHasAttemptedSubmit(true);
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (__DEV__) {
        console.log('[Login] Attempting login with:', { email: email.trim(), passwordLength: password.length });
      }

      // Call API and get response
      const response = await authAPI.login(email.trim(), password);

      // Check if 2FA is required
      if (response.data && (response.data as any).requiresTwoFactor) {
        const tempToken = (response.data as any).tempToken;
        navigation.navigate('TwoFactorVerify', { tempToken });
        return;
      }

      const { user, token, refreshToken, businesses } = unwrapAuthResponse(response);

      // Use profileStore.login() to set user + tokens + businesses
      login(user, token, refreshToken, businesses);
    } catch (err: any) {
      if (__DEV__) {
        console.log('[Login] Error:', err);
      }
      if (err.status === 0 || err.code === 'ERR_NETWORK') {
        setError('No internet connection. Please check your network and try again.');
      } else {
        setError(err.response?.message || err.message || 'Failed to login');
      }
    } finally {
      setLoading(false);
    }
  };

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
              Welcome Back!
            </Text>
            <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
              Login to your account
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <Text style={[styles.errorText, { color: appTheme.colors.error }]}>{error}</Text>
          ) : null}

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <AppTextField
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(''); // Clear error when user types
              }}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
              error={hasAttemptedSubmit && !email}
            />

            <AppTextField
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(''); // Clear error when user types
              }}
              placeholder="Enter your password"
              secureTextEntry
              leftIcon="lock-closed-outline"
              error={hasAttemptedSubmit && !password}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPasswordButton}
              accessibilityRole="link"
              accessibilityLabel="Forgot password"
            >
              <Text style={[styles.forgotPasswordText, { color: appTheme.colors.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* Stay Signed In Toggle */}
            <View style={styles.staySignedInRow}>
              <Text style={[styles.staySignedInText, { color: appTheme.colors.textSecondary }]}>
                Stay signed in
              </Text>
              <Switch
                value={staySignedIn}
                onValueChange={(value) => {
                  setStaySignedIn(value);
                  storeSetStaySignedIn(value);
                }}
                trackColor={{ false: appTheme.colors.borderColor, true: appTheme.colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Login Button */}
            <AppButton
              title="Login"
              onPress={handleLogin}
              loading={loading}
              disabled={loading || !isFormValid}
              variant={isFormValid && !loading ? 'primary' : 'disabled'}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Bottom - Register Link (stays at bottom even with keyboard) */}
      <View style={[
        styles.bottomContainer, 
        { 
          borderTopColor: appTheme.colors.borderColor,
          backgroundColor: appTheme.colors.background,
          paddingBottom: insets.bottom + 16,
        }
      ]}>
        <Text style={[styles.registerText, { color: appTheme.colors.textSecondary }]}>
          Don't have an account?{' '}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateAccount')}
          accessibilityRole="link"
          accessibilityLabel="Register for a new account"
        >
          <Text style={[styles.registerLink, { color: appTheme.colors.primary }]}>
            Register
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 100, // Space for fixed bottom container
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
    fontFamily: theme.fonts.primary.medium,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 16,
  },
  formContainer: {
    gap: 16,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: -8, // Reduce gap to 8px from password field
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  staySignedInRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -8,
  },
  staySignedInText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  registerText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  registerLink: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
});
