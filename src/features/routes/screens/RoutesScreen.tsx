/**
 * RoutesScreen — list of delivery routes / trips, segmented by status.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { PrimaryHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { EmptyState } from '@/shared/components/ui';
import Pill from '@/shared/components/ui/Pill';
import { Icon } from '@/shared/utils/icons';
import { useProfileStore } from '@/shared/store/profileStore';
import { ROUTE_STATUS_LABELS, ROUTE_STATUS_COLORS } from '@/shared/types/route';
import { createRoute } from '../routes.service';
import { useRoutes, RouteSegment } from '../hooks/useRoutes';

const SEGMENTS: { key: RouteSegment; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'planned', label: 'Planned' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
];

function shortId(id: string): string {
  return id.length > 6 ? id.slice(-6) : id;
}

function formatDate(date?: string | null): string {
  if (!date) return 'No date';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 'No date';
  return d.toLocaleDateString();
}

export default function RoutesScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const companyId = useProfileStore((s) => s.activeBusiness?.id) || '';
  const { filtered, loading, refreshing, error, refresh, segment, setSegment, activeCount } = useRoutes();
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!companyId || creating) return;
    setCreating(true);
    try {
      const created = await createRoute(companyId, { status: 'Planned', stops: [] });
      (navigation as any).navigate('RouteDetail', { routeId: created.id });
    } catch {
      Alert.alert('Could not create route', 'Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <PrimaryHeader
        title="Routes"
        leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
        actions={[{ icon: 'add', onPress: handleCreate, accessibilityLabel: 'New route' }]}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentBar} style={{ flexGrow: 0 }}>
        {SEGMENTS.map((s) => {
          const active = segment === s.key;
          const badge = s.key === 'active' ? activeCount : 0;
          return (
            <TouchableOpacity
              key={s.key}
              onPress={() => setSegment(s.key)}
              style={[styles.chip, { backgroundColor: active ? appTheme.colors.accent : appTheme.colors.inputBackground, borderColor: active ? appTheme.colors.accent : appTheme.colors.borderColor }]}
            >
              <Text style={[styles.chipText, { color: active ? '#FFFFFF' : appTheme.colors.textSecondary }]}>{s.label}</Text>
              {badge > 0 && (
                <View style={[styles.badge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : appTheme.colors.info }]}>
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
        renderItem={({ item }) => {
          const stopCount = Array.isArray(item.stops) ? item.stops.length : 0;
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}
              onPress={() => (navigation as any).navigate('RouteDetail', { routeId: item.id })}
            >
              <View style={styles.cardHeader}>
                <Icon name="navigate-outline" size={18} color={ROUTE_STATUS_COLORS[item.status]} />
                <Text style={[styles.cardTitle, { color: appTheme.colors.text }]} numberOfLines={1}>
                  {item.name || `Route ${shortId(item.id)}`}
                </Text>
                <Pill text={ROUTE_STATUS_LABELS[item.status]} color={ROUTE_STATUS_COLORS[item.status]} />
              </View>
              <Text style={[styles.cardSub, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
                {formatDate(item.date)} · {stopCount} stop{stopCount === 1 ? '' : 's'}{item.driverId ? ' · Driver assigned' : ''}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={loading ? (
          <View style={styles.center}><ActivityIndicator color={appTheme.colors.accent} /></View>
        ) : (
          <EmptyState iconName="navigate-outline" title="No routes" subtitle="Plan delivery routes and trips for your drivers here." />
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
