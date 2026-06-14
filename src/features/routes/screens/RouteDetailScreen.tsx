/**
 * RouteDetailScreen — view a delivery route, edit its name, advance its status,
 * and review its ordered stops.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { PrimaryHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import Pill from '@/shared/components/ui/Pill';
import { Icon } from '@/shared/utils/icons';
import { useProfileStore } from '@/shared/store/profileStore';
import { Route, RouteStatus, RouteStop, ROUTE_STATUS_LABELS, ROUTE_STATUS_COLORS } from '@/shared/types/route';
import { getRoute, updateRoute } from '../routes.service';

const NEXT: Partial<Record<RouteStatus, { next: RouteStatus; label: string }>> = {
  Planned: { next: 'Active', label: 'Start route' },
  Active: { next: 'Completed', label: 'Complete route' },
};

function shortId(id: string): string {
  return id.length > 6 ? id.slice(-6) : id;
}

function formatDate(date?: string | null): string {
  if (!date) return 'No date';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 'No date';
  return d.toLocaleDateString();
}

export default function RouteDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme: appTheme } = useTheme();
  const companyId = useProfileStore((s) => s.activeBusiness?.id) || '';
  const routeId = (route.params as { routeId: string }).routeId;

  const [data, setData] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await getRoute(companyId, routeId);
      setData(result);
      setName(result.name || '');
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, routeId]);

  useEffect(() => { load(); }, [load]);

  const saveName = async () => {
    if (!data) return;
    const trimmed = name.trim();
    if (trimmed === (data.name || '')) return;
    setSavingName(true);
    try {
      const updated = await updateRoute(companyId, routeId, { name: trimmed });
      setData((prev) => (prev ? { ...prev, ...updated } : updated));
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSavingName(false);
    }
  };

  const advance = async () => {
    if (!data) return;
    const action = NEXT[data.status];
    if (!action) return;
    setSubmitting(true);
    try {
      const updated = await updateRoute(companyId, routeId, { status: action.next });
      setData((prev) => (prev ? { ...prev, ...updated } : updated));
    } catch {
      Alert.alert('Could not update', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <PrimaryHeader title="Route" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }} />
        <View style={styles.center}><ActivityIndicator color={appTheme.colors.accent} /></View>
      </SafeAreaView>
    );
  }
  if (!data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <PrimaryHeader title="Route" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }} />
        <View style={styles.center}><Text style={{ color: appTheme.colors.textSecondary }}>Route not found</Text></View>
      </SafeAreaView>
    );
  }

  const action = NEXT[data.status];
  const stops = Array.isArray(data.stops) ? [...data.stops].sort((a, b) => a.seq - b.seq) : [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <PrimaryHeader title="Route" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={styles.row}>
          <Text style={[styles.title, { color: appTheme.colors.text }]}>{data.name || `Route ${shortId(data.id)}`}</Text>
          <Pill text={ROUTE_STATUS_LABELS[data.status]} color={ROUTE_STATUS_COLORS[data.status]} />
        </View>

        <Text style={[styles.meta, { color: appTheme.colors.textSecondary }]}>
          {formatDate(data.date)}
          {data.driverId ? ` · Driver ${shortId(data.driverId)}` : ''}
          {data.transportId ? ` · Vehicle ${shortId(data.transportId)}` : ''}
        </Text>

        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
          <Text style={[styles.label, { color: appTheme.colors.textSecondary }]}>Route name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={saveName}
            placeholder="Name this route…"
            placeholderTextColor={appTheme.colors.textMuted}
            style={[styles.input, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor }]}
          />
          {savingName && <ActivityIndicator style={{ marginTop: 8 }} color={appTheme.colors.accent} />}
        </View>

        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
          <Text style={[styles.label, { color: appTheme.colors.textSecondary }]}>Stops ({stops.length})</Text>
          {stops.length === 0 ? (
            <Text style={[styles.body, { color: appTheme.colors.textMuted }]}>No stops on this route yet.</Text>
          ) : (
            stops.map((stop: RouteStop, idx) => (
              <View
                key={`${stop.seq}-${stop.refId}-${idx}`}
                style={[styles.stopRow, idx < stops.length - 1 ? { borderBottomColor: appTheme.colors.borderColor, borderBottomWidth: StyleSheet.hairlineWidth } : null]}
              >
                <View style={[styles.seqBadge, { backgroundColor: appTheme.colors.accent }]}>
                  <Text style={styles.seqText}>{stop.seq}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stopTitle, { color: appTheme.colors.text }]} numberOfLines={1}>
                    {stop.address || stop.refId}
                  </Text>
                  <Text style={[styles.stopMeta, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
                    {stop.type} · {stop.refId}{stop.eta ? ` · ETA ${stop.eta}` : ''}
                  </Text>
                </View>
                {!!stop.status && (
                  <Icon name="ellipse" size={10} color={appTheme.colors.textMuted} />
                )}
              </View>
            ))
          )}
        </View>

        {action && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: appTheme.colors.accent }]}
            onPress={advance}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{action.label}</Text>}
          </TouchableOpacity>
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
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  label: { fontSize: 13, fontFamily: 'InterCustom-SemiBold', marginBottom: 8 },
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, fontSize: 15 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  seqBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  seqText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'InterCustom-SemiBold' },
  stopTitle: { fontSize: 15, fontFamily: 'InterCustom-SemiBold' },
  stopMeta: { fontSize: 13, fontFamily: 'InterCustom-Regular', marginTop: 2 },
  button: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'InterCustom-SemiBold' },
});
