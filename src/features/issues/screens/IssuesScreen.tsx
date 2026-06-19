/**
 * IssuesScreen — list of reported logistics issues, segmented by status.
 */
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { PrimaryHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { EmptyState } from '@/shared/components/ui';
import Pill from '@/shared/components/ui/Pill';
import { Icon } from '@/shared/utils/icons';
import { ISSUE_TYPE_LABELS, ISSUE_STATUS_LABELS, ISSUE_STATUS_COLORS } from '@/shared/types/issue';
import { useIssues, IssueSegment } from '../hooks/useIssues';

const SEGMENTS: { key: IssueSegment; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'investigating', label: 'Investigating' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' },
];

export default function IssuesScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const { filtered, loading, refreshing, error, refresh, segment, setSegment, openCount } = useIssues();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <PrimaryHeader
        title="Issues"
        leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentBar} style={{ flexGrow: 0 }}>
        {SEGMENTS.map((s) => {
          const active = segment === s.key;
          const badge = s.key === 'open' ? openCount : 0;
          return (
            <TouchableOpacity
              key={s.key}
              onPress={() => setSegment(s.key)}
              style={[styles.chip, { backgroundColor: active ? appTheme.colors.accent : appTheme.colors.inputBackground, borderColor: active ? appTheme.colors.accent : appTheme.colors.borderColor }]}
            >
              <Text style={[styles.chipText, { color: active ? '#FFFFFF' : appTheme.colors.textSecondary }]}>{s.label}</Text>
              {badge > 0 && (
                <View style={[styles.badge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : appTheme.colors.error }]}>
                  <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={appTheme.colors.primary} />}
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingVertical: 8 }}
        ListHeaderComponent={error && !loading ? (
          <Text style={[styles.error, { color: appTheme.colors.error }]}>{error}</Text>
        ) : null}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}
            onPress={() => (navigation as any).navigate('IssueDetail', { issueId: item.id })}
          >
            <View style={styles.cardHeader}>
              <Icon name="alert-circle-outline" size={18} color={ISSUE_STATUS_COLORS[item.status]} />
              <Text style={[styles.cardTitle, { color: appTheme.colors.text }]} numberOfLines={1}>
                {ISSUE_TYPE_LABELS[item.type] || item.type}
              </Text>
              <Pill text={ISSUE_STATUS_LABELS[item.status]} color={ISSUE_STATUS_COLORS[item.status]} />
            </View>
            <Text style={[styles.cardSub, { color: appTheme.colors.textSecondary }]} numberOfLines={2}>
              {item.entityType} · {item.entityId}{item.note ? ` — ${item.note}` : ''}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={loading ? (
          <View style={styles.center}><ActivityIndicator color={appTheme.colors.accent} /></View>
        ) : (
          <EmptyState iconName="checkmark-circle-outline" title="No issues" subtitle="Reported problems on deliveries, transfers and routes show up here." />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { textAlign: 'center', paddingVertical: 12 },
  segmentBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 14, fontFamily: 'InterCustom-SemiBold' },
  badge: { marginLeft: 6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'InterCustom-SemiBold' },
  card: { marginHorizontal: 16, marginVertical: 6, padding: 14, borderRadius: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { flex: 1, fontSize: 16, fontFamily: 'InterCustom-SemiBold' },
  cardSub: { fontSize: 13, fontFamily: 'InterCustom-Regular' },
});
