import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppAlert } from '@/shared/services/appAlert';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { authAPI } from '@/shared/services/api';
import AppTextField from '@/shared/components/ui/AppTextField';
import { AppButton } from '@/shared/components/ui';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { useProfileStore } from '@/shared/store/profileStore';
import theme from '@/shared/theme';

interface DeleteAccountScreenProps {
  navigation: any;
}

export default function DeleteAccountScreen({ navigation }: DeleteAccountScreenProps) {
  const { theme: appTheme } = useTheme();
  const twoFactorEnabled = useProfileStore((state) => state.twoFactorEnabled);

  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const performDeletion = async () => {
    setIsDeleting(true);
    try {
      await authAPI.deleteAccount(password, twoFactorEnabled ? twoFactorCode : undefined);
      AppAlert.alert(
        'Account Deleted',
        'Your account and personal data have been deleted. Thank you for using NouPro.',
        [{ text: 'OK', onPress: () => authAPI.logout() }],
      );
    } catch (error: any) {
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message || error?.message;
      if (status === 409) {
        // Backend returns data.businesses as [{ id, name }]
        const businesses: string[] = (error?.response?.data?.data?.businesses || [])
          .map((b: { name?: string } | string) => (typeof b === 'string' ? b : b?.name))
          .filter(Boolean);
        AppAlert.alert(
          'Transfer Ownership First',
          `You are the only owner of ${businesses.length ? businesses.join(', ') : 'a business'} that still has other members. Transfer ownership to another member (Team settings) before deleting your account, so your team does not lose access.`,
        );
      } else if (status === 401) {
        AppAlert.alert(
          'Verification Failed',
          twoFactorEnabled
            ? 'The password or authentication code is incorrect.'
            : 'The password is incorrect.',
        );
      } else {
        AppAlert.alert('Error', serverMessage || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeletePress = () => {
    if (!password.trim()) {
      AppAlert.alert('Password Required', 'Enter your password to confirm it is really you.');
      return;
    }
    if (twoFactorEnabled && twoFactorCode.trim().length < 6) {
      AppAlert.alert('Code Required', 'Enter the 6-digit code from your authenticator app.');
      return;
    }
    AppAlert.alert(
      'Delete your account?',
      'This is permanent and cannot be undone. Your profile, connections, and personal data will be erased immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Forever', style: 'destructive', onPress: performDeletion },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <SecondaryHeader
        title="Delete Account"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={[styles.warningCard, { backgroundColor: appTheme.colors.cardBackground }]}>
            <Icon name="warning-outline" size={28} color={appTheme.colors.error} />
            <Text style={[styles.warningTitle, { color: appTheme.colors.text }]}>
              This cannot be undone
            </Text>
            <Text style={[styles.warningBody, { color: appTheme.colors.textLight }]}>
              Deleting your account immediately and permanently erases:
            </Text>
            {[
              'Your profile (name, photo, bio, experience, skills)',
              'Your connections and follows',
              'Your login — all devices are signed out',
            ].map((item) => (
              <View key={item} style={styles.bulletRow}>
                <Icon name="close-circle-outline" size={16} color={appTheme.colors.error} />
                <Text style={[styles.bulletText, { color: appTheme.colors.textLight }]}>{item}</Text>
              </View>
            ))}
            <Text style={[styles.warningBody, { color: appTheme.colors.textLight, marginTop: 12 }]}>
              What is kept: invoices, orders, and deliveries already exchanged with other
              businesses remain in their records (legal requirement), and your past chat messages
              stay visible as “Deleted user”.
            </Text>
            <Text style={[styles.warningBody, { color: appTheme.colors.textLight, marginTop: 12 }]}>
              Tip: you can export a copy of your data first from Security Settings.
            </Text>
          </View>

          <AppTextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password to confirm"
            secureTextEntry
            leftIcon="lock-closed-outline"
            containerStyle={styles.textField}
          />

          {twoFactorEnabled && (
            <AppTextField
              label="Authenticator Code"
              value={twoFactorCode}
              onChangeText={setTwoFactorCode}
              placeholder="6-digit code"
              keyboardType="number-pad"
              maxLength={6}
              leftIcon="shield-checkmark-outline"
              containerStyle={styles.textField}
            />
          )}

          <AppButton
            title="Delete My Account Forever"
            onPress={handleDeletePress}
            loading={isDeleting}
            disabled={isDeleting}
            fullWidth
            style={{ backgroundColor: appTheme.colors.error, marginTop: 8 }}
            accessibilityLabel="Permanently delete my account"
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  warningCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  warningTitle: {
    fontSize: theme.fontSize.lg,
    fontFamily: theme.fonts.primary.bold,
    marginTop: 8,
    marginBottom: 8,
  },
  warningBody: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  bulletText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    marginLeft: 8,
    flex: 1,
  },
  textField: {
    marginBottom: 16,
  },
});
