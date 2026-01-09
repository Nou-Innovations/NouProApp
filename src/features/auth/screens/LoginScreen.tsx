import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useProfileStore } from '@/shared/store/profileStore';
import { authAPI } from '@/shared/services/api';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import theme from '@/shared/theme';
import { Text, H1, BodyBold } from '@/shared/components/ui/Typography';
import AppTextField from '@/shared/components/ui/AppTextField';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Use profileStore for auth (single source of truth)
  const login = useProfileStore((state) => state.login);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call API and get response
      const response = await authAPI.login(email, password);
      
      // Use profileStore.login() to set user + tokens + businesses
      login(
        response.data?.user || response.user,
        response.data?.token || response.token,
        response.data?.refreshToken || response.refreshToken,
        response.data?.businesses // optional: user's businesses
      );
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <H1 style={styles.title}>Welcome Back</H1>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <View style={styles.formContainer}>
          <AppTextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
            containerStyle={styles.textField}
          />

          <AppTextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            leftIcon="lock-closed-outline"
            containerStyle={styles.textField}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPasswordButton}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={styles.loginButton}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <BodyBold style={styles.loginButtonText}>
                Login
              </BodyBold>
            )}
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <BodyBold style={styles.registerLink}>Register</BodyBold>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: 'center'
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.xl
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.md
  },
  formContainer: {
    gap: theme.spacing.md
  },
  textField: {
    marginBottom: theme.spacing.sm
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.sm
  },
  forgotPasswordText: {
    color: theme.colors.primary
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 3,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm
  },
  loginButtonText: {
    color: theme.colors.textInverse,
    textAlign: 'center'
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.md
  },
  registerText: {
    color: theme.colors.textSecondary,
  },
  registerLink: {
    color: theme.colors.primary
  }
});
