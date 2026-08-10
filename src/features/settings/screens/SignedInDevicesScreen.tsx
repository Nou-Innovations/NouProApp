/**
 * SignedInDevicesScreen
 *
 * Lists the devices signed in to this account and lets you sign any of them out.
 * Before per-device sessions existed there was no way to do this: logging out anywhere
 * signed you out everywhere, and a lost phone could only be dealt with by changing your
 * password (audit A-7).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { AppAlert } from '@/shared/services/appAlert';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { EmptyState, SectionTitle } from '@/shared/components/ui';
import { authAPI, type SignedInDevice } from '@/shared/services/api';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { timeAgo } from '@/shared/utils/timeAgo';
import theme from '@/shared/theme';

interface Props {
  navigation: any;
}

export default function SignedInDevicesScreen({ navigation }: Props) {
  const { theme: appTheme } = useTheme();
  const [devices, setDevices] = useState<SignedInDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await authAPI.getSessions();
      setDevices(result?.sessions || []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load your devices.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const signOutDevice = (device: SignedInDevice) => {
    const label = device.deviceName || 'this device';
    AppAlert.alert('Sign out device', `Sign ${label} out of your account?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setBusyId(device.id);
          try {
            await authAPI.revokeSession(device.id);
            await fetchDevices();
          } catch (err) {
            AppAlert.alert('Error', getApiErrorMessage(err, 'Could not sign that device out.'));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const signOutOthers = () => {
    AppAlert.alert(
      'Sign out other devices',
      'Every device except this one will be signed out. They may stay active for up to 30 minutes before it takes effect.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out others',
          style: 'destructive',
          onPress: async () => {
            setBusyId('all');
            try {
              await authAPI.revokeOtherSessions();
              await fetchDevices();
            } catch (err) {
              AppAlert.alert('Error', getApiErrorMessage(err, 'Could not sign the other devices out.'));
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const otherCount = devices.filter((d) => !d.isCurrent).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <SecondaryHeader
        title="Signed-in devices"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator style={styles.loader} color={appTheme.colors.primary} />
        ) : error ? (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: appTheme.colors.textLight }]}>{error}</Text>
            <TouchableOpacity onPress={fetchDevices} style={styles.retry}>
              <Text style={{ color: appTheme.colors.primary, fontFamily: theme.fonts.primary.semiBold }}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : devices.length === 0 ? (
          <EmptyState
            iconName="smartphone"
            title="No other devices"
            subtitle="You're only signed in here."
          />
        ) : (
          <>
            <Text style={[styles.description, { color: appTheme.colors.textLight }]}>
              If you don&apos;t recognise a device, sign it out and change your password.
            </Text>

            <SectionTitle style={styles.sectionTitle}>Devices</SectionTitle>

            {devices.map((device) => (
              <View
                key={device.id}
                style={[styles.deviceRow, { borderBottomColor: appTheme.colors.borderColor }]}
              >
                <Icon
                  name={device.platform === 'android' ? 'phone-portrait-outline' : 'phone-portrait'}
                  size={24}
                  color={appTheme.colors.iconColor}
                />
                <View style={styles.deviceInfo}>
                  <Text style={[styles.deviceName, { color: appTheme.colors.text }]}>
                    {device.deviceName || 'Unknown device'}
                    {device.isCurrent ? ' · This device' : ''}
                  </Text>
                  <Text style={[styles.deviceMeta, { color: appTheme.colors.textMuted }]}>
                    {device.platform === 'ios' ? 'iOS' : device.platform === 'android' ? 'Android' : 'Unknown'}
                    {` · last used ${timeAgo(device.lastUsedAt)}`}
                  </Text>
                </View>
                {!device.isCurrent && (
                  <TouchableOpacity
                    onPress={() => signOutDevice(device)}
                    disabled={busyId === device.id}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text
                      style={{
                        color: busyId === device.id ? appTheme.colors.textMuted : appTheme.colors.error,
                        fontFamily: theme.fonts.primary.semiBold,
                      }}
                    >
                      Sign out
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {otherCount > 0 && (
              <TouchableOpacity
                style={[styles.signOutAll, { borderColor: appTheme.colors.error }]}
                onPress={signOutOthers}
                disabled={busyId === 'all'}
              >
                <Text style={{ color: appTheme.colors.error, fontFamily: theme.fonts.primary.semiBold }}>
                  {busyId === 'all' ? 'Signing out…' : `Sign out all other devices (${otherCount})`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  loader: { marginTop: 40 },
  centered: { alignItems: 'center', marginTop: 40 },
  retry: { marginTop: 12, padding: 8 },
  errorText: { fontSize: theme.fontSize.base, fontFamily: theme.fonts.primary.regular, textAlign: 'center' },
  description: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 20,
    marginBottom: 16,
  },
  sectionTitle: { marginBottom: 8 },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  deviceInfo: { flex: 1, marginLeft: 12 },
  deviceName: { fontSize: theme.fontSize.base, fontFamily: theme.fonts.primary.semiBold },
  deviceMeta: { fontSize: theme.fontSize.sm, fontFamily: theme.fonts.primary.regular, marginTop: 2 },
  signOutAll: {
    marginTop: 24,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
