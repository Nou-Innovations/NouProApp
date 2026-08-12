import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { Text } from '@/shared/components/ui/Typography';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { AppButton } from '@/shared/components/ui';
import { AppAlert } from '@/shared/services/appAlert';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  NotificationPreferences,
} from '@/features/notifications/pushNotifications.api';

const CATEGORIES: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'messages', label: 'Messages', description: 'New chat messages' },
  { key: 'orders', label: 'Orders', description: 'Order status updates' },
  { key: 'deliveries', label: 'Deliveries', description: 'Delivery status changes' },
  { key: 'invoices', label: 'Invoices', description: 'Invoice updates and payments' },
  { key: 'team', label: 'Team', description: 'Join requests and team changes' },
  { key: 'system', label: 'System', description: 'App updates and announcements' },
];

export default function NotificationPreferencesScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoadError(null);
    try {
      const data = await getNotificationPreferences();
      setPrefs(data);
    } catch (err) {
      // Previously this substituted an all-`true` object, so a failed load showed every
      // category switched ON and the user read it as their saved settings — the worse
      // half of P-15, because it invents state rather than merely hiding a failure.
      setPrefs(null);
      setLoadError(getApiErrorMessage(err, "We couldn't load your notification settings."));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return;

    // Optimistic update
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);

    try {
      await updateNotificationPreferences({ [key]: value });
    } catch (err) {
      // Revert AND say so. A silent revert is indistinguishable from a switch that
      // just won't move, so people retry it instead of retrying later (P-15).
      setPrefs(prefs);
      AppAlert.alert(
        "Couldn't save",
        getApiErrorMessage(err, `We couldn't change your ${key} notifications. Please try again.`),
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader title="Notification Preferences" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : loadError ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: appTheme.colors.textSecondary }]}>
            {loadError}
          </Text>
          <AppButton title="Try again" onPress={() => { setLoading(true); loadPreferences(); }} />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <Text style={[styles.sectionLabel, { color: appTheme.colors.textSecondary }]}>
            Choose which notifications you want to receive
          </Text>

          {CATEGORIES.map((cat) => (
            <View
              key={cat.key}
              style={[styles.row, { borderBottomColor: appTheme.colors.borderColor }]}
            >
              <View style={styles.rowLeft}>
                <Text style={[styles.rowLabel, { color: appTheme.colors.text }]}>{cat.label}</Text>
                <Text style={[styles.rowDescription, { color: appTheme.colors.textSecondary }]}>
                  {cat.description}
                </Text>
              </View>
              <Switch
                value={prefs?.[cat.key] ?? true}
                onValueChange={(value) => handleToggle(cat.key, value)}
                trackColor={{ false: appTheme.colors.switchTrackOff, true: appTheme.colors.switchTrackOn }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={appTheme.colors.switchTrackOff}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  rowDescription: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
});
