/**
 * TransfersScreen — list of internal stock transfers, segmented by lifecycle stage.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { PrimaryHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { EmptyState } from '@/shared/components/ui';
import { useTransfers, TransferSegment } from '../hooks/useTransfers';
import TransferCard from '../components/TransferCard';
import TransferCreateModal from '../components/TransferCreateModal';

const SEGMENTS: { key: TransferSegment; label: string }[] = [
  { key: 'requests', label: 'Requests' },
  { key: 'to_send', label: 'To Send' },
  { key: 'to_receive', label: 'To Receive' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
];

export default function TransfersScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const { filtered, loading, refreshing, error, refresh, segment, setSegment, requestsCount, toReceiveCount } = useTransfers();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <PrimaryHeader
        title="Transfers"
        leftAction={navigation.canGoBack() ? { icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' } : undefined}
        actions={[{ icon: 'add', onPress: () => setShowCreate(true), accessibilityLabel: 'New transfer' }]}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentBar} style={{ flexGrow: 0 }}>
        {SEGMENTS.map((s) => {
          const active = segment === s.key;
          const badge = s.key === 'requests' ? requestsCount : s.key === 'to_receive' ? toReceiveCount : 0;
          return (
            <TouchableOpacity
              key={s.key}
              onPress={() => setSegment(s.key)}
              style={[styles.chip, { backgroundColor: active ? appTheme.colors.accent : appTheme.colors.inputBackground, borderColor: active ? appTheme.colors.accent : appTheme.colors.borderColor }]}
            >
              <Text style={[styles.chipText, { color: active ? '#FFFFFF' : appTheme.colors.textSecondary }]}>{s.label}</Text>
              {badge > 0 && (
                <View style={[styles.badge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : appTheme.colors.accent }]}>
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
          <TransferCard
            transfer={item}
            onPress={() => (navigation as any).navigate('TransferDetail', { transferId: item.id })}
          />
        )}
        ListEmptyComponent={loading ? (
          <View style={styles.center}><ActivityIndicator color={appTheme.colors.accent} /></View>
        ) : (
          <EmptyState iconName="swap-horizontal-outline" title="No transfers" subtitle="Internal stock movements between your locations show up here." />
        )}
      />

      <TransferCreateModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={refresh} />
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
});
