import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { AppButton, EmptyState, SectionTitle, TextButton } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { useEvent } from '../hooks/useEvent';
import { rsvpEvent, EVENT_TYPE_LABELS, formatEventDate } from '../events.service';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

export default function EventDetailScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const myId = activeBusiness?.id;
  const { eventId } = route.params;
  const { event, rsvps, loading, error, refresh } = useEvent(eventId);
  const [busy, setBusy] = useState(false);

  const isOrganizer = !!event && event.businessId === myId;
  const counts = useMemo(() => {
    const going = rsvps.filter((r) => r.status === 'going').length;
    const interested = rsvps.filter((r) => r.status === 'interested').length;
    return { going, interested };
  }, [rsvps]);

  const doRsvp = async (status: 'going' | 'interested') => {
    if (!myId) {
      AppAlert.alert('No business', 'Switch to a business to RSVP.');
      return;
    }
    setBusy(true);
    try {
      await rsvpEvent(eventId, myId, status);
      AppAlert.alert('RSVP saved', status === 'going' ? "You're going!" : 'Marked as interested.');
      refresh();
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || 'Failed to RSVP');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Event" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Event" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
        <EmptyState iconName="alert-circle-outline" title="Couldn't load" subtitle={error || 'Not found'} ctaLabel="Retry" onCtaPress={refresh} />
      </SafeAreaView>
    );
  }

  const e = event;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader title="Event" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: appTheme.colors.text }]}>{e.title}</Text>
        <Text style={[styles.meta, { color: appTheme.colors.textMuted }]}>
          {[EVENT_TYPE_LABELS[e.type], formatEventDate(e.startAt), e.isOnline ? 'Online' : e.locationText].filter(Boolean).join(' · ')}
        </Text>

        {e.business && (
          <TouchableOpacity onPress={() => navigation.navigate('ViewBusinessProfile', { businessId: e.businessId })} style={styles.bizRow}>
            <Text style={[styles.bizName, { color: appTheme.colors.primary }]}>{e.business.name}</Text>
          </TouchableOpacity>
        )}

        {e.description ? <Text style={[styles.desc, { color: appTheme.colors.text }]}>{e.description}</Text> : null}

        {isOrganizer ? (
          <View style={styles.section}>
            <SectionTitle style={{ marginBottom: 10 }}>Attendees</SectionTitle>
            <Text style={[styles.meta, { color: appTheme.colors.textMuted }]}>
              {counts.going} going · {counts.interested} interested
            </Text>
          </View>
        ) : (
          <View style={styles.section}>
            <AppButton title="I'm going" onPress={() => doRsvp('going')} loading={busy} disabled={busy} fullWidth />
            <TextButton title="Interested" onPress={() => doRsvp('interested')} disabled={busy} style={styles.interested} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 6 },
  bizRow: { marginTop: 10 },
  bizName: { fontSize: 15, fontWeight: '600' },
  desc: { fontSize: 15, lineHeight: 22, marginTop: 16 },
  section: { marginTop: 24 },
  interested: { marginTop: 14, alignSelf: 'center' },
});
