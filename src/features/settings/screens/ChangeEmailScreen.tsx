/**
 * ChangeEmailScreen — verified email / phone change.
 *
 * Email and phone are identity, not profile fields: login is email-only, so an
 * unverified change (or a cleared field) permanently locks the account out. That is
 * exactly what the old editable field on the profile form did. PATCH /auth/me now
 * refuses to change them; this screen sends a code to the NEW address and only applies
 * the change once it is confirmed.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppAlert } from '@/shared/services/appAlert';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { authAPI } from '@/shared/services/api';
import AppTextField from '@/shared/components/ui/AppTextField';
import { AppButton } from '@/shared/components/ui';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { useProfileStore } from '@/shared/store/profileStore';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import theme from '@/shared/theme';

interface ChangeEmailScreenProps {
  navigation: any;
  route?: { params?: { mode?: 'email' | 'phone' } };
}

export default function ChangeEmailScreen({ navigation, route }: ChangeEmailScreenProps) {
  const { theme: appTheme } = useTheme();
  const mode = route?.params?.mode === 'phone' ? 'phone' : 'email';
  const currentUser = useProfileStore((state) => state.currentUser);
  const updateCurrentUser = useProfileStore((state) => state.updateCurrentUser);

  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const isEmail = mode === 'email';
  const label = isEmail ? 'email address' : 'phone number';
  const current = isEmail ? currentUser?.email : currentUser?.phone;

  const handleSendCode = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      AppAlert.alert('Required', `Enter your new ${label}.`);
      return;
    }
    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      AppAlert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setIsBusy(true);
    try {
      if (isEmail) await authAPI.requestEmailChange(trimmed);
      else await authAPI.requestPhoneChange(trimmed);
      setCodeSent(true);
    } catch (err) {
      AppAlert.alert('Could not send code', getApiErrorMessage(err, 'Please try again.'));
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirm = async () => {
    const trimmed = value.trim();
    if (code.trim().length < 6) {
      AppAlert.alert('Code Required', 'Enter the 6-digit code we sent.');
      return;
    }
    setIsBusy(true);
    try {
      if (isEmail) await authAPI.confirmEmailChange(trimmed, code.trim());
      else await authAPI.confirmPhoneChange(trimmed, code.trim());
      updateCurrentUser(isEmail ? { email: trimmed } : { phone: trimmed });
      AppAlert.alert(
        'Updated',
        isEmail
          ? 'Your email has been changed. Use it next time you sign in.'
          : 'Your phone number has been changed.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      AppAlert.alert('Could not confirm', getApiErrorMessage(err, 'Please try again.'));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <SecondaryHeader
        title={isEmail ? 'Change Email' : 'Change Phone'}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={[styles.current, { color: appTheme.colors.textLight }]}>
            Current {label}: {current || 'not set'}
          </Text>

          <AppTextField
            label={`New ${label}`}
            value={value}
            onChangeText={setValue}
            placeholder={isEmail ? 'you@example.com' : '+230 5xxx xxxx'}
            keyboardType={isEmail ? 'email-address' : 'phone-pad'}
            autoCapitalize="none"
            autoCorrect={false}
            disabled={codeSent}
            containerStyle={styles.field}
          />

          {codeSent && (
            <>
              <AppTextField
                label="Verification code"
                value={code}
                onChangeText={setCode}
                placeholder="6-digit code"
                keyboardType="number-pad"
                maxLength={6}
                containerStyle={styles.field}
              />
              <Text style={[styles.hint, { color: appTheme.colors.textMuted }]}>
                We sent a code to {value.trim()}. It only changes once you confirm.
              </Text>
            </>
          )}

          <AppButton
            title={codeSent ? 'Confirm change' : 'Send code'}
            onPress={codeSent ? handleConfirm : handleSendCode}
            loading={isBusy}
            disabled={isBusy}
            fullWidth
            style={styles.button}
          />

          {codeSent && (
            <AppButton
              title="Use a different address"
              variant="secondary"
              onPress={() => { setCodeSent(false); setCode(''); }}
              disabled={isBusy}
              fullWidth
              style={styles.button}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  current: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 20,
  },
  field: { marginBottom: 16 },
  hint: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 16,
  },
  button: { marginTop: 8 },
});
