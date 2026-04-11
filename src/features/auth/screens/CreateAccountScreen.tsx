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
import { Icon } from '@/shared/utils/icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import AppTextField from '@/shared/components/ui/AppTextField';
import AppButton from '@/shared/components/ui/AppButton';
import PhoneNumberField from '@/shared/components/ui/PhoneNumberField';
import { authAPI } from '@/shared/services/api';

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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);

  // Check if form is valid
  const isFormValid = firstName.trim() && lastName.trim() && phoneNumber.trim() && email.trim() && acceptedTerms;

  const handleContinue = async () => {
    setHasAttemptedSubmit(true);

    if (!isFormValid) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate phone number length (between 7 and 15 digits)
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      setError('Phone number must be between 7 and 15 digits');
      return;
    }

    setError('');

    const sanitize = (str: string) => str.replace(/[<>]/g, '').trim();

    const userData = {
      firstName: sanitize(firstName),
      lastName: sanitize(lastName),
      phone: phoneNumber.replace(/\D/g, ''),
      countryCode,
      email: email.trim() || undefined,
    };

    // Send OTP to phone and navigate to verification screen
    setIsSendingOTP(true);
    try {
      await authAPI.sendPhoneOTP(userData.phone, userData.countryCode);
      navigation.navigate('PhoneVerification', {
        userData,
        verificationMethod: 'phone',
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSendingOTP(false);
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
              maxLength={50}
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
              maxLength={50}
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
              maxLength={15}
              error={hasAttemptedSubmit && !phoneNumber.trim()}
            />

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
              maxLength={100}
              error={hasAttemptedSubmit && !email.trim()}
            />

            {/* Terms of Service */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
              accessibilityLabel="Accept Terms of Service and Privacy Policy"
            >
              <View style={[
                styles.termsCheckbox,
                {
                  borderColor: acceptedTerms ? appTheme.colors.primary : appTheme.colors.borderColor,
                  backgroundColor: acceptedTerms ? appTheme.colors.primary : 'transparent',
                },
              ]}>
                {acceptedTerms && (
                  <Icon name="checkmark" size={14} color="#FFFFFF" />
                )}
              </View>
              <Text style={[styles.termsText, { color: appTheme.colors.textSecondary }]}>
                I agree to the{' '}
                <Text style={{ color: appTheme.colors.primary }}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={{ color: appTheme.colors.primary }}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {/* Continue Button */}
            <AppButton
              title="Continue"
              onPress={handleContinue}
              variant={isFormValid ? 'primary' : 'disabled'}
              disabled={!isFormValid || isSendingOTP}
              loading={isSendingOTP}
              style={styles.continueButton}
            />
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
  continueButton: {
    marginTop: 8,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 4,
  },
  termsCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 20,
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
