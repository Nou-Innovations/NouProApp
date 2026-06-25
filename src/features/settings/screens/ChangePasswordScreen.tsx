import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { authAPI } from '@/shared/services/api';
import AppTextField from '@/shared/components/ui/AppTextField';
import { AppButton } from '@/shared/components/ui';
import theme from '@/shared/theme';

interface ChangePasswordScreenProps {
  navigation: any;
}

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export default function ChangePasswordScreen({ navigation }: ChangePasswordScreenProps) {
  const { theme: appTheme } = useTheme();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password validation
  const validatePassword = (password: string): PasswordValidation => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  };

  const passwordValidation = validatePassword(newPassword);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword !== '';

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      AppAlert.alert('Error', 'Please enter your current password');
      return;
    }

    if (!isPasswordValid) {
      AppAlert.alert('Error', 'Please ensure your new password meets all requirements');
      return;
    }

    if (!passwordsMatch) {
      AppAlert.alert('Error', 'New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      AppAlert.alert('Error', 'New password must be different from current password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.changePassword(currentPassword, newPassword);
      
      const message = response?.data?.message || response?.message || 'Password changed successfully';
      AppAlert.alert(
        'Success',
        message,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      const errorMessage = error?.response?.message || error?.message || 'An unexpected error occurred. Please try again.';
      AppAlert.alert('Error', errorMessage);
      console.error('Password change error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: appTheme.colors.background }]}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Icon name="chevron-back" size={24} color={appTheme.colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: appTheme.colors.text }]}>Change Password</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  const renderPasswordRequirements = () => (
    <View style={[styles.requirementsContainer, { backgroundColor: appTheme.colors.cardBackground }]}>
      <Text style={[styles.requirementsTitle, { color: appTheme.colors.text }]}>Password Requirements:</Text>
      
      {Object.entries({
        minLength: 'At least 8 characters',
        hasUppercase: 'One uppercase letter',
        hasLowercase: 'One lowercase letter',
        hasNumber: 'One number',
        hasSpecialChar: 'One special character',
      }).map(([key, requirement]) => (
        <View key={key} style={styles.requirementItem}>
          <Icon 
            name={passwordValidation[key as keyof PasswordValidation] ? "checkmark-circle" : "ellipse-outline"} 
            size={16} 
            color={passwordValidation[key as keyof PasswordValidation] ? appTheme.colors.success : appTheme.colors.textLight}
          />
          <Text style={[
            styles.requirementText, 
            { color: passwordValidation[key as keyof PasswordValidation] ? appTheme.colors.success : appTheme.colors.textLight }
          ]}>
            {requirement}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      {renderHeader()}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.description, { color: appTheme.colors.textLight }]}>
            For your security, please enter your current password and choose a new strong password.
          </Text>

          <AppTextField
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter your current password"
            secureTextEntry
            leftIcon="lock-closed-outline"
            containerStyle={styles.textField}
          />

          <AppTextField
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter your new password"
            secureTextEntry
            leftIcon="lock-closed-outline"
            containerStyle={styles.textField}
          />

          {newPassword.length > 0 && renderPasswordRequirements()}

          <AppTextField
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your new password"
            secureTextEntry
            leftIcon="lock-closed-outline"
            containerStyle={styles.textField}
          />

          {confirmPassword.length > 0 && (
            <View style={styles.matchIndicator}>
              <Icon 
                name={passwordsMatch ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={passwordsMatch ? appTheme.colors.success : appTheme.colors.error}
              />
              <Text style={[styles.matchText, { color: passwordsMatch ? appTheme.colors.success : appTheme.colors.error }]}>
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </Text>
            </View>
          )}

          <AppButton
            title="Change Password"
            onPress={handleChangePassword}
            variant="accent"
            fullWidth
            loading={isLoading}
            disabled={!isPasswordValid || !passwordsMatch || !currentPassword.length || isLoading}
            style={styles.changeButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: theme.fonts.primary.bold,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: theme.fonts.primary.regular,
  },
  textField: {
    marginBottom: 16,
  },
  requirementsContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: theme.fonts.primary.medium,
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
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  matchText: {
    fontSize: 14,
    marginLeft: 8,
    fontFamily: theme.fonts.primary.regular,
  },
  changeButton: {
    marginTop: 20,
  },
});
