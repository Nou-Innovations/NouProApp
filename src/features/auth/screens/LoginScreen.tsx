import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  
  // Use profileStore for auth (single source of truth)
  const login = useProfileStore((state) => state.login);

  const handleLogin = async () => {
    setHasAttemptedSubmit(true);
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Debug: Log what we're sending
      console.log('[Login] Attempting login with:', { email: email.trim(), passwordLength: password.length });
      
      // Call API and get response
      const response = await authAPI.login(email.trim(), password);
      
      // Use profileStore.login() to set user + tokens + businesses
      login(
        response.data?.user || response.user,
        response.data?.token || response.token,
        response.data?.refreshToken || response.refreshToken,
        response.data?.businesses // optional: user's businesses
      );
    } catch (err: any) {
      console.log('[Login] Error:', err);
      console.log('[Login] Error response:', err.response?.data);
      setError(err.response?.data?.message || err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // TODO: Implement Google Sign In
    console.log('Google Sign In pressed');
  };

  const handleAppleSignIn = async () => {
    // TODO: Implement Apple Sign In
    console.log('Apple Sign In pressed');
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
            >
              <Text style={[styles.forgotPasswordText, { color: appTheme.colors.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <AppButton
              title="Login"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              variant="primary"
            />

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: appTheme.colors.borderColor }]} />
              <Text style={[styles.dividerText, { color: appTheme.colors.textSecondary }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: appTheme.colors.borderColor }]} />
            </View>

            {/* Social Sign In Buttons */}
            <TouchableOpacity
              style={[styles.socialButton, { borderColor: appTheme.colors.borderColor }]}
              onPress={handleGoogleSignIn}
              activeOpacity={0.7}
            >
              <AntDesign name="google" size={20} color={appTheme.colors.text} />
              <Text style={[styles.socialButtonText, { color: appTheme.colors.text }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, { borderColor: appTheme.colors.borderColor }]}
              onPress={handleAppleSignIn}
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
        <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
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
  registerText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  registerLink: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
});
