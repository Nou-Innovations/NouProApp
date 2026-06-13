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

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await getNotificationPreferences();
      setPrefs(data);
    } catch (err) {
      // Use defaults on error
      setPrefs({
        messages: true,
        deliveries: true,
        invoices: true,
        orders: true,
        team: true,
        system: true,
      });
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
      // Revert on error
      setPrefs(prefs);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader title="Notification Preferences" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
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
