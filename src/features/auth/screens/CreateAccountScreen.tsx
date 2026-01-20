/**
 * CreateAccountScreen
 * First step of registration - basic user information
 */

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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import AppTextField from '@/shared/components/ui/AppTextField';
import AppButton from '@/shared/components/ui/AppButton';
import PhoneNumberField from '@/shared/components/ui/PhoneNumberField';

type Props = NativeStackScreenProps<AuthStackParamList, 'CreateAccount'>;

export default function CreateAccountScreen({ navigation }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+230');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Check if form is valid
  const isFormValid = firstName.trim() && lastName.trim() && phoneNumber.trim();

  const handleContinue = () => {
    setHasAttemptedSubmit(true);
    
    if (!isFormValid) {
      setError('Please fill in all required fields');
      return;
    }

    setError('');
    
    // Navigate directly to create password (OTP screens disabled for now)
    navigation.navigate('CreatePassword', {
      userData: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phoneNumber.trim(),
        countryCode,
        email: email.trim() || undefined,
      },
    });
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
              Create an account
            </Text>
            <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
              Enter your information to get started
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <Text style={[styles.errorText, { color: appTheme.colors.error }]}>{error}</Text>
          ) : null}

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <AppTextField
              label="First Name"
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                if (error) setError('');
              }}
              placeholder="Enter your first name"
              leftIcon="person-outline"
              error={hasAttemptedSubmit && !firstName.trim()}
            />

            <AppTextField
              label="Last Name"
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                if (error) setError('');
              }}
              placeholder="Enter your last name"
              leftIcon="person-outline"
              error={hasAttemptedSubmit && !lastName.trim()}
            />

            <PhoneNumberField
              label="Phone Number"
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                if (error) setError('');
              }}
              countryCode={countryCode}
              onCountryCodeChange={setCountryCode}
              placeholder="Enter your phone number"
              error={hasAttemptedSubmit && !phoneNumber.trim()}
            />

            <AppTextField
              label="Email Address (Optional)"
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

            {/* Continue Button */}
            <AppButton
              title="Continue"
              onPress={handleContinue}
              variant={isFormValid ? 'primary' : 'disabled'}
              disabled={!isFormValid}
              style={styles.continueButton}
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

      {/* Fixed Bottom - Login Link */}
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
    paddingBottom: 100,
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
  continueButton: {
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
