import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useProfileStore } from '@/shared/store/profileStore';
import { authAPI } from '@/shared/services/api';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import theme from '@/shared/theme';
import { Text, H1, BodyBold } from '@/shared/components/ui/Typography';
import AppTextField from '@/shared/components/ui/AppTextField';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <H1 style={styles.title}>Create Account</H1>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <View style={styles.formContainer}>
            <AppTextField
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              leftIcon="person-outline"
              containerStyle={styles.textField}
            />

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
              label="Business Name (Optional)"
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Enter your business name"
              leftIcon="business-outline"
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

            <AppTextField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              secureTextEntry
              leftIcon="lock-closed-outline"
              containerStyle={styles.textField}
            />

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              style={styles.registerButton}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <BodyBold style={styles.registerButtonText}>
                  Register
                </BodyBold>
              )}
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <BodyBold style={styles.loginLink}>Login</BodyBold>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: theme.spacing.md
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
  registerButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 3,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md
  },
  registerButtonText: {
    color: theme.colors.textInverse,
    textAlign: 'center'
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.md
  },
  loginText: {
    color: theme.colors.textSecondary,
  },
  loginLink: {
    color: theme.colors.primary
  }
});
