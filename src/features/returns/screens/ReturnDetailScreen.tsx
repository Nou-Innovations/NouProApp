/**
 * ReturnDetailScreen — view a return (RMA) and advance its status.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { PrimaryHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import Pill from '@/shared/components/ui/Pill';
import { useProfileStore } from '@/shared/store/profileStore';
import { Return, ReturnStatus, RETURN_STATUS_LABELS, RETURN_STATUS_COLORS } from '@/shared/types/return';
import { getReturn, changeReturnStatus } from '../returns.service';

const NEXT: Partial<Record<ReturnStatus, { next: ReturnStatus; label: string }>> = {
  Requested: { next: 'Scheduled', label: 'Schedule pickup' },
  Scheduled: { next: 'PickedUp', label: 'Mark picked up' },
  PickedUp: { next: 'Received', label: 'Mark received' },
  Received: { next: 'Completed', label: 'Complete' },
};

const CONDITION_LABELS: Record<string, string> = { resellable: 'Resellable', damaged: 'Damaged' };
const DISPOSITION_LABELS: Record<string, string> = { restock: 'Restock', writeoff: 'Write off' };

export default function ReturnDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme: appTheme } = useTheme();
  const companyId = useProfileStore((s) => s.activeBusiness?.id) || '';
  const returnId = (route.params as { returnId: string }).returnId;

  const [item, setItem] = useState<Return | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getReturn(companyId, returnId);
      setItem(data);
    } catch {
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, returnId]);

  useEffect(() => { load(); }, [load]);

  const advance = async () => {
    if (!item) return;
    const action = NEXT[item.status];
    if (!action) return;
    setSubmitting(true);
    try {
      const updated = await changeReturnStatus(companyId, returnId, action.next);
      setItem((prev) => (prev ? { ...prev, ...updated } : updated));
    } catch {
      Alert.alert('Could not update', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reject = async () => {
    if (!item) return;
    setSubmitting(true);
    try {
      const updated = await changeReturnStatus(companyId, returnId, 'Rejected');
      setItem((prev) => (prev ? { ...prev, ...updated } : updated));
    } catch {
      Alert.alert('Could not update', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <PrimaryHeader title="Return" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }} />
        <View style={styles.center}><ActivityIndicator color={appTheme.colors.accent} /></View>
      </SafeAreaView>
    );
  }
  if (!item) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <PrimaryHeader title="Return" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }} />
        <View style={styles.center}><Text style={{ color: appTheme.colors.textSecondary }}>Return not found</Text></View>
      </SafeAreaView>
    );
  }

  const action = NEXT[item.status];
  const canReject = item.status === 'Requested' || item.status === 'Scheduled';
  const items = Array.isArray(item.items) ? item.items : [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <PrimaryHeader title="Return" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={styles.row}>
          <Text style={[styles.title, { color: appTheme.colors.text }]}>
            {item.customerName || (item.orderId ? `Order ${item.orderId}` : 'Return')}
          </Text>
          <Pill text={RETURN_STATUS_LABELS[item.status]} color={RETURN_STATUS_COLORS[item.status]} />
        </View>
        {!!item.orderId && (
          <Text style={[styles.meta, { color: appTheme.colors.textSecondary }]}>Order · {item.orderId}</Text>
        )}
        {!!item.reason && <Text style={[styles.body, { color: appTheme.colors.text }]}>{item.reason}</Text>}

        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
          <Text style={[styles.label, { color: appTheme.colors.textSecondary }]}>Items</Text>
          {items.length === 0 ? (
            <Text style={[styles.body, { color: appTheme.colors.textMuted }]}>No items</Text>
          ) : items.map((it, idx) => (
            <View key={`${it.productId}-${idx}`} style={[styles.itemRow, idx > 0 && { borderTopWidth: 1, borderTopColor: appTheme.colors.borderColor }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: appTheme.colors.text }]} numberOfLines={1}>{it.name}</Text>
                <Text style={[styles.itemMeta, { color: appTheme.colors.textSecondary }]}>
                  {[it.condition ? CONDITION_LABELS[it.condition] : null, it.disposition ? DISPOSITION_LABELS[it.disposition] : null].filter(Boolean).join(' · ') || '—'}
                </Text>
              </View>
              <Text style={[styles.itemQty, { color: appTheme.colors.text }]}>×{it.quantity}</Text>
            </View>
          ))}
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
        {canReject && (
          <TouchableOpacity
            style={[styles.buttonOutline, { borderColor: appTheme.colors.error }]}
            onPress={reject}
            disabled={submitting}
          >
            <Text style={[styles.buttonOutlineText, { color: appTheme.colors.error }]}>Reject</Text>
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
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  itemName: { fontSize: 15, fontFamily: 'InterCustom-Medium' },
  itemMeta: { fontSize: 13, fontFamily: 'InterCustom-Regular', marginTop: 2 },
  itemQty: { fontSize: 15, fontFamily: 'InterCustom-SemiBold' },
  button: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'InterCustom-SemiBold' },
  buttonOutline: { height: 50, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  buttonOutlineText: { fontSize: 16, fontFamily: 'InterCustom-SemiBold' },
});
