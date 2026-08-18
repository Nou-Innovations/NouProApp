/**
 * NotificationsPermissionScreen
 *
 * Explains what notifications are for BEFORE iOS shows its one-shot system prompt.
 *
 * The prompt used to fire the instant someone first signed in, with no context — and iOS
 * only ever shows it once per install, so a reflexive "Don't Allow" was permanent and
 * silent (N-10). This screen sits at the end of the signup wizard, right after the
 * account exists, so a token can actually be registered.
 *
 * Note it reads the token from `route.params.pendingAuth`, NOT from the store: the
 * previous screen only seeds the store when the user actually picks an avatar, so for
 * anyone who tapped "Later" the token lives only in `pendingAuth`.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import { AppButton, TextButton } from '@/shared/components/ui';
import { Icon } from '@/shared/utils/icons';
import {
  registerForPushNotifications,
  registerTokenWithBackend,
} from '@/shared/services/pushNotifications';
import { useTranslation } from '@/shared/i18n';

type Props = NativeStackScreenProps<AuthStackParamList, 'NotificationsPermission'>;

/** Keys, not copy — the strings live in the locale files. */
const REASONS = [
  { icon: 'chatbubble-outline', key: 'messages' },
  { icon: 'cube-outline', key: 'orders' },
  { icon: 'people-outline', key: 'requests' },
] as const;

export default function NotificationsPermissionScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { pendingAuth } = route.params;
  const [loading, setLoading] = useState(false);

  const goNext = () => {
    navigation.navigate('ChoosePath', { pendingAuth });
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      const { token } = await registerForPushNotifications();
      if (token) {
        // The account exists but the user isn't logged in yet, so the API interceptor
        // has no token to attach — pass the one from the wizard explicitly.
        await registerTokenWithBackend(token, pendingAuth?.token);
      }
    } catch {
      // A permission prompt must never strand someone inside signup.
    } finally {
      setLoading(false);
      goNext();
    }
  };

  // Deliberately does NOT mark the prompt as asked: skipping here should leave the one
  // iOS prompt available for a later moment that earns it (a join request, an order,
  // a first message).
  const handleSkip = goNext;

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: appTheme.colors.text }]}>
            {t('notificationsPermission.title')}
          </Text>
          <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
            {t('notificationsPermission.subtitle')}
          </Text>
        </View>

        <View style={styles.reasons}>
          {REASONS.map((reason) => (
            <View key={reason.key} style={styles.reasonRow}>
              <View style={[styles.reasonIcon, { backgroundColor: appTheme.colors.surface }]}>
                <Icon name={reason.icon} size={20} color={appTheme.colors.primary} />
              </View>
              <View style={styles.reasonText}>
                <Text style={[styles.reasonTitle, { color: appTheme.colors.text }]}>
                  {t(`notificationsPermission.${reason.key}Title`)}
                </Text>
                <Text style={[styles.reasonBody, { color: appTheme.colors.textSecondary }]}>
                  {t(`notificationsPermission.${reason.key}Body`)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.footnote, { color: appTheme.colors.textSecondary }]}>
          {t('notificationsPermission.footnote')}
        </Text>
      </View>

      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
        <AppButton
          title={t('notificationsPermission.enable')}
          onPress={handleEnable}
          variant={loading ? 'disabled' : 'primary'}
          disabled={loading}
          loading={loading}
        />
        <TextButton
          title={t('common.notNow')}
          onPress={handleSkip}
          disabled={loading}
          tone="muted"
          style={styles.skipButton}
          textStyle={{ color: appTheme.colors.text }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerSection: {
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.primary.bold,
    lineHeight: 40,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 24,
  },
  reasons: {
    gap: 24,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  reasonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonText: {
    flex: 1,
  },
  reasonTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
    lineHeight: 22,
    marginBottom: 2,
  },
  reasonBody: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 20,
  },
  footnote: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 18,
    marginTop: 32,
  },
  bottomContainer: {
    paddingHorizontal: 16,
  },
  skipButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
