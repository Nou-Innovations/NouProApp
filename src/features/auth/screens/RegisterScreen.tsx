import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome, AntDesign } from '@expo/vector-icons';
import { useProfileStore } from '@/shared/store/profileStore';
import { authAPI } from '@/shared/services/api';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import AppTextField from '@/shared/components/ui/AppTextField';
import AppButton from '@/shared/components/ui/AppButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Use profileStore for auth (single source of truth)
  const login = useProfileStore((state) => state.login);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call API and get response
      const response = await authAPI.register({
        name,
        email,
        password,
        businessName: businessName || undefined,
      });
      
      // Use profileStore.login() to set user + tokens + businesses
      login(
        response.data?.user || response.user,
        response.data?.token || response.token,
        response.data?.refreshToken || response.refreshToken,
        response.data?.businesses // optional: user's businesses
      );
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    Alert.alert('Google Sign Up', 'Google Sign Up is not available yet.');
  };

  const handleAppleSignUp = async () => {
    Alert.alert('Apple Sign Up', 'Apple Sign Up is not available yet.');
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
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={[styles.title, { color: appTheme.colors.text }]}>
              Create Account
            </Text>
            <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
              Sign up to get started
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <Text style={[styles.errorText, { color: appTheme.colors.error }]}>{error}</Text>
          ) : null}

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <AppTextField
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              leftIcon="person-outline"
            />

            <AppTextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
            />

            <AppTextField
              label="Business Name (Optional)"
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Enter your business name"
              leftIcon="business-outline"
            />

            <AppTextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              leftIcon="lock-closed-outline"
            />

            <AppTextField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              secureTextEntry
              leftIcon="lock-closed-outline"
            />

            {/* Register Button */}
            <AppButton
              title="Register"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              variant="primary"
              style={styles.registerButton}
            />

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: appTheme.colors.borderColor }]} />
              <Text style={[styles.dividerText, { color: appTheme.colors.textSecondary }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: appTheme.colors.borderColor }]} />
            </View>

            {/* Social Sign Up Buttons */}
            <TouchableOpacity
              style={[styles.socialButton, { borderColor: appTheme.colors.borderColor }]}
              onPress={handleGoogleSignUp}
              activeOpacity={0.7}
            >
              <AntDesign name="google" size={20} color={appTheme.colors.text} />
              <Text style={[styles.socialButtonText, { color: appTheme.colors.text }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, { borderColor: appTheme.colors.borderColor }]}
              onPress={handleAppleSignUp}
              activeOpacity={0.7}
            >
              <FontAwesome name="apple" size={22} color={appTheme.colors.text} />
              <Text style={[styles.socialButtonText, { color: appTheme.colors.text }]}>
                Continue with Apple
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Bottom - Login Link (stays at bottom even with keyboard) */}
      <View style={[
        styles.bottomContainer, 
        { 
          borderTopColor: appTheme.colors.borderColor,
          backgroundColor: appTheme.colors.background,
          paddingBottom: insets.bottom + 16,
        }
      ]}>
        <Text style={[styles.loginText, { color: appTheme.colors.textSecondary }]}>
          Already have an account?{' '}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={[styles.loginLink, { color: appTheme.colors.primary }]}>
            Login
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
  registerButton: {
    marginTop: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    marginHorizontal: 16,
  },
  socialButton: {
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  socialButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
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
  loginText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  loginLink: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
});
