import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { EmptyState, ListItemCard, SectionTitle } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { useOpportunity } from '../hooks/useOpportunity';
import { respondToOpportunity, OPPORTUNITY_TYPE_LABELS } from '../opportunities.service';

type Props = NativeStackScreenProps<RootStackParamList, 'OpportunityDetail'>;

export default function OpportunityDetailScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const myId = activeBusiness?.id;
  const { opportunityId } = route.params;
  const { opportunity, responses, loading, error, refresh } = useOpportunity(opportunityId);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const isOwner = !!opportunity && opportunity.businessId === myId;

  const handleRespond = async () => {
    if (!myId) {
      Alert.alert('No business', 'Switch to a business to respond.');
      return;
    }
    setSending(true);
    try {
      await respondToOpportunity(opportunityId, myId, message.trim() || undefined);
      setMessage('');
      Alert.alert('Sent', 'Your response was sent to the business.');
      refresh();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send response');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Opportunity" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !opportunity) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Opportunity" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
        <EmptyState iconName="alert-circle-outline" title="Couldn't load" subtitle={error || 'Not found'} ctaLabel="Retry" onCtaPress={refresh} />
      </SafeAreaView>
    );
  }

  const o = opportunity;
  const budget =
    o.budgetMin != null || o.budgetMax != null
      ? `${o.currency} ${o.budgetMin ?? ''}${o.budgetMin != null && o.budgetMax != null ? '–' : ''}${o.budgetMax ?? ''}`
      : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader title="Opportunity" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: appTheme.colors.text }]}>{o.title}</Text>
        <Text style={[styles.meta, { color: appTheme.colors.textMuted }]}>
          {[OPPORTUNITY_TYPE_LABELS[o.type], o.category, o.locationText, budget].filter(Boolean).join(' · ')}
        </Text>

        {o.business && (
          <TouchableOpacity onPress={() => navigation.navigate('ViewBusinessProfile', { businessId: o.businessId })} style={styles.bizRow}>
            <Text style={[styles.bizName, { color: appTheme.colors.primary }]}>{o.business.name}</Text>
          </TouchableOpacity>
        )}

        {o.description ? <Text style={[styles.desc, { color: appTheme.colors.text }]}>{o.description}</Text> : null}

        {isOwner ? (
          <View style={styles.section}>
            <SectionTitle style={{ marginBottom: 10 }}>Responses ({responses.length})</SectionTitle>
            {responses.length === 0 ? (
              <Text style={[styles.meta, { color: appTheme.colors.textMuted }]}>No responses yet.</Text>
            ) : (
              responses.map((r) => (
                <ListItemCard
                  key={r.id}
                  avatar={{
                    type: r.responderBusiness?.logoUrl ? 'image' : 'initials',
                    imageUri: r.responderBusiness?.logoUrl,
                    userId: r.responderBusinessId,
                    userName: r.responderBusiness?.name || 'Business',
                  }}
                  title={r.responderBusiness?.name || 'Business'}
                  subtitle={r.message || 'Interested'}
                  onPress={() => navigation.navigate('ViewBusinessProfile', { businessId: r.responderBusinessId })}
                  showChevron
                />
              ))
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <SectionTitle style={{ marginBottom: 10 }}>Respond</SectionTitle>
            <TextInput
              style={[
                styles.input,
                { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: appTheme.colors.surface },
              ]}
              placeholder="Introduce your business and how you can help"
              placeholderTextColor={appTheme.colors.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <AppButton title={sending ? 'Sending...' : 'Send response'} onPress={handleRespond} disabled={sending} style={styles.sendBtn} />
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
  input: { minHeight: 90, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, textAlignVertical: 'top' },
  sendBtn: { marginTop: 12 },
});
