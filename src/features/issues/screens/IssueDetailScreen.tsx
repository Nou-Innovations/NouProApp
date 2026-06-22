/**
 * IssueDetailScreen — view an issue and advance its status / resolve it.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import Pill from '@/shared/components/ui/Pill';
import { AppButton } from '@/shared/components/ui';
import { useProfileStore } from '@/shared/store/profileStore';
import { Issue, IssueStatus, ISSUE_TYPE_LABELS, ISSUE_STATUS_LABELS, ISSUE_STATUS_COLORS } from '@/shared/types/issue';
import { getIssue, updateIssue } from '../issues.service';

const NEXT: Partial<Record<IssueStatus, { next: IssueStatus; label: string }>> = {
  open: { next: 'investigating', label: 'Start investigating' },
  investigating: { next: 'resolved', label: 'Mark resolved' },
};

export default function IssueDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme: appTheme } = useTheme();
  const companyId = useProfileStore((s) => s.activeBusiness?.id) || '';
  const issueId = (route.params as { issueId: string }).issueId;

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolution, setResolution] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getIssue(companyId, issueId);
      setIssue(data);
      setResolution(data.resolution || '');
    } catch {
      setIssue(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, issueId]);

  useEffect(() => { load(); }, [load]);

  const advance = async () => {
    if (!issue) return;
    const action = NEXT[issue.status];
    if (!action) return;
    setSubmitting(true);
    try {
      const updated = await updateIssue(companyId, issueId, {
        status: action.next,
        ...(action.next === 'resolved' && resolution ? { resolution } : {}),
      });
      setIssue((prev) => (prev ? { ...prev, ...updated } : updated));
    } catch {
      Alert.alert('Could not update', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Issue" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }} />
        <View style={styles.center}><ActivityIndicator color={appTheme.colors.accent} /></View>
      </SafeAreaView>
    );
  }
  if (!issue) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Issue" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }} />
        <View style={styles.center}><Text style={{ color: appTheme.colors.textSecondary }}>Issue not found</Text></View>
      </SafeAreaView>
    );
  }

  const action = NEXT[issue.status];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader title="Issue" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={styles.row}>
          <Text style={[styles.title, { color: appTheme.colors.text }]}>{ISSUE_TYPE_LABELS[issue.type] || issue.type}</Text>
          <Pill text={ISSUE_STATUS_LABELS[issue.status]} color={ISSUE_STATUS_COLORS[issue.status]} />
        </View>
        <Text style={[styles.meta, { color: appTheme.colors.textSecondary }]}>
          On {issue.entityType} · {issue.entityId}
        </Text>
        {!!issue.note && <Text style={[styles.body, { color: appTheme.colors.text }]}>{issue.note}</Text>}
        {!!issue.photoUrl && <Image source={{ uri: issue.photoUrl }} style={styles.photo} resizeMode="cover" />}

        {issue.status !== 'resolved' && (
          <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.label, { color: appTheme.colors.textSecondary }]}>Resolution note</Text>
            <TextInput
              value={resolution}
              onChangeText={setResolution}
              placeholder="What was done…"
              placeholderTextColor={appTheme.colors.textMuted}
              multiline
              style={[styles.input, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor }]}
            />
          </View>
        )}
        {!!issue.resolution && issue.status === 'resolved' && (
          <Text style={[styles.body, { color: appTheme.colors.textSecondary }]}>Resolution: {issue.resolution}</Text>
        )}

        {action && (
          <AppButton
            title={action.label}
            onPress={advance}
            variant="accent"
            loading={submitting}
            disabled={submitting}
            fullWidth
            style={styles.actionSpacing}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontFamily: 'InterCustom-SemiBold', flex: 1, marginRight: 8 },
  meta: { fontSize: 14, fontFamily: 'InterCustom-Medium' },
  body: { fontSize: 15, fontFamily: 'InterCustom-Regular', lineHeight: 21 },
  photo: { width: '100%', height: 200, borderRadius: 12 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  label: { fontSize: 13, fontFamily: 'InterCustom-SemiBold', marginBottom: 8 },
  input: { minHeight: 70, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 15, textAlignVertical: 'top' },
  actionSpacing: { marginTop: 4 },
});
