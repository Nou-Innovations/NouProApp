import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Switch } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppTextField from '@/shared/components/ui/AppTextField';
import AppButton from '@/shared/components/ui/AppButton';
import { ExploreChips, DateSelector, TimeSelector } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { createEvent, type EventType, EVENT_TYPE_LABELS, formatEventDate } from '../events.service';

const TYPE_ORDER: EventType[] = ['networking', 'workshop', 'coffee_connect', 'conference', 'panel', 'webinar', 'other'];
const LABEL_TO_TYPE: Record<string, EventType> = TYPE_ORDER.reduce((a, t) => {
  a[EVENT_TYPE_LABELS[t]] = t;
  return a;
}, {} as Record<string, EventType>);

type Props = NativeStackScreenProps<RootStackParamList, 'CreateEvent'>;

function defaultStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(18, 0, 0, 0);
  return d;
}

export default function CreateEventScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const businessId = route.params.businessId;
  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('networking');
  const [startAt, setStartAt] = useState<Date>(defaultStart());
  const [location, setLocation] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);

  const setDatePart = (d: Date) =>
    setStartAt((prev) => {
      const n = new Date(prev);
      n.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
      return n;
    });
  const setTimePart = (t: Date) =>
    setStartAt((prev) => {
      const n = new Date(prev);
      n.setHours(t.getHours(), t.getMinutes(), 0, 0);
      return n;
    });

  const submit = async () => {
    if (!title.trim()) {
      AppAlert.alert('Title required', 'Add a title for your event.');
      return;
    }
    setSaving(true);
    try {
      await createEvent({
        businessId,
        title: title.trim(),
        type,
        startAt: startAt.toISOString(),
        locationText: location.trim() || undefined,
        isOnline,
        description: description.trim() || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      const isPaywall = e?.code === 'PAYWALL' || /upgrade/i.test(e?.message || '');
      AppAlert.alert(isPaywall ? 'Upgrade required' : 'Error', e?.message || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader title="Host Event" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppTextField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. SME Growth Workshop" containerStyle={styles.field} />

        <Text style={[styles.label, { color: appTheme.colors.text }]}>Type</Text>
        <ExploreChips
          chips={TYPE_ORDER.map((t) => EVENT_TYPE_LABELS[t])}
          selected={EVENT_TYPE_LABELS[type]}
          onSelect={(l) => setType(LABEL_TO_TYPE[l] ?? 'other')}
          style={styles.chips}
        />

        <AppTextField
          label="Date & time"
          value={formatEventDate(startAt.toISOString())}
          onChangeText={() => {}}
          isDropdown
          onPress={() => setPicker(true)}
          containerStyle={styles.field}
        />

        <View style={styles.row}>
          <Text style={[styles.label, { color: appTheme.colors.text, marginBottom: 0 }]}>Online event</Text>
          <Switch value={isOnline} onValueChange={setIsOnline} trackColor={{ true: appTheme.colors.primary, false: appTheme.colors.borderColor }} />
        </View>

        <AppTextField
          label={isOnline ? 'Link (optional)' : 'Location (optional)'}
          value={location}
          onChangeText={setLocation}
          placeholder={isOnline ? 'https://...' : 'e.g. Ebene'}
          containerStyle={styles.field}
        />
        <AppTextField label="Details (optional)" value={description} onChangeText={setDescription} placeholder="What's the event about?" isMultiline containerStyle={styles.field} />

        <AppButton title={saving ? 'Creating...' : 'Create Event'} onPress={submit} disabled={saving} style={styles.submit} />
      </ScrollView>

      <Modal visible={picker} transparent animationType="slide" onRequestClose={() => setPicker(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: appTheme.colors.background }]}>
            <Text style={[styles.sheetTitle, { color: appTheme.colors.text }]}>Pick date & time</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <DateSelector value={startAt} onChange={setDatePart} minDate={new Date()} />
              <TimeSelector value={startAt} onChange={setTimePart} />
            </ScrollView>
            <AppButton title="Done" onPress={() => setPicker(false)} style={styles.doneBtn} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  chips: { marginBottom: 16, marginHorizontal: -16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  submit: { marginTop: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32, maxHeight: '85%' },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  doneBtn: { marginTop: 12 },
});
