import React, { useState } from 'react';
import { Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppTextField from '@/shared/components/ui/AppTextField';
import AppButton from '@/shared/components/ui/AppButton';
import { ExploreChips } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { createOpportunity, type OpportunityType, OPPORTUNITY_TYPE_LABELS } from '../opportunities.service';

const TYPE_ORDER: OpportunityType[] = ['buying', 'selling', 'service', 'partnership', 'hiring', 'other'];
const LABEL_TO_TYPE: Record<string, OpportunityType> = TYPE_ORDER.reduce((acc, t) => {
  acc[OPPORTUNITY_TYPE_LABELS[t]] = t;
  return acc;
}, {} as Record<string, OpportunityType>);

type Props = NativeStackScreenProps<RootStackParamList, 'CreateOpportunity'>;

export default function CreateOpportunityScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const businessId = route.params.businessId;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<OpportunityType>('buying');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Add a short title for your request.');
      return;
    }
    setSaving(true);
    try {
      await createOpportunity({
        businessId,
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        category: category.trim() || undefined,
        locationText: location.trim() || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      const isPaywall = e?.code === 'PAYWALL' || /upgrade/i.test(e?.message || '');
      Alert.alert(isPaywall ? 'Upgrade required' : 'Error', e?.message || 'Failed to post opportunity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader title="Post Opportunity" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppTextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Looking for a cold delivery partner"
          containerStyle={styles.field}
        />

        <Text style={[styles.label, { color: appTheme.colors.text }]}>Type</Text>
        <ExploreChips
          chips={TYPE_ORDER.map((t) => OPPORTUNITY_TYPE_LABELS[t])}
          selected={OPPORTUNITY_TYPE_LABELS[type]}
          onSelect={(label) => setType(LABEL_TO_TYPE[label] ?? 'other')}
          style={styles.chips}
        />

        <AppTextField label="Category (optional)" value={category} onChangeText={setCategory} placeholder="e.g. Logistics" containerStyle={styles.field} />
        <AppTextField label="Location (optional)" value={location} onChangeText={setLocation} placeholder="e.g. Vacoas" containerStyle={styles.field} />
        <AppTextField
          label="Details (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what your business needs"
          isMultiline
          containerStyle={styles.field}
        />

        <AppButton title={saving ? 'Posting...' : 'Post Opportunity'} onPress={submit} disabled={saving} style={styles.submit} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  chips: { marginBottom: 16, marginHorizontal: -16 },
  submit: { marginTop: 8 },
});
