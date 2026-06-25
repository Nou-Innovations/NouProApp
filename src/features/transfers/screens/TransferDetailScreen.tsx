/**
 * TransferDetailScreen — view a transfer and advance it through its approval lifecycle.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import Pill from '@/shared/components/ui/Pill';
import { SectionTitle, AppButton, ButtonRow } from '@/shared/components/ui';
import { Icon } from '@/shared/utils/icons';
import { useProfileStore } from '@/shared/store/profileStore';
import {
  Transfer,
  TransferStatus,
  TransferStatusHistoryEntry,
  TRANSFER_STATUS_LABELS,
  TRANSFER_STATUS_COLORS,
} from '@/shared/types/transfer';
import { getTransfer, getTransferHistory, changeTransferStatus } from '../transfers.service';
import TransferReceiveModal from '../components/TransferReceiveModal';

interface NextAction {
  next: TransferStatus;
  label: string;
  destructive?: boolean;
  promptReason?: boolean;
}

// Forward actions available per status. Each status can offer 1-2 buttons.
const ACTIONS: Partial<Record<TransferStatus, NextAction[]>> = {
  Requested: [
    { next: 'Approved', label: 'Approve' },
    { next: 'Rejected', label: 'Reject', destructive: true, promptReason: true },
  ],
  Approved: [{ next: 'InTransit', label: 'Start transfer' }],
  Preparing: [{ next: 'InTransit', label: 'Start transfer' }],
  InTransit: [{ next: 'Received', label: 'Mark received' }],
  Received: [{ next: 'Completed', label: 'Complete' }],
};

const formatDateTime = (dateString?: string | null) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function TransferDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme: appTheme } = useTheme();
  const companyId = useProfileStore((s) => s.activeBusiness?.id) || '';
  const transferId = (route.params as { transferId: string }).transferId;

  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [history, setHistory] = useState<TransferStatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReceive, setShowReceive] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getTransfer(companyId, transferId);
      setTransfer(data);
    } catch {
      setTransfer(null);
    } finally {
      setLoading(false);
    }
    try {
      const rows = await getTransferHistory(companyId, transferId);
      setHistory(Array.isArray(rows) ? rows : []);
    } catch {
      setHistory([]);
    }
  }, [companyId, transferId]);

  useEffect(() => { load(); }, [load]);

  const applyStatus = async (next: TransferStatus, reason?: string) => {
    setSubmitting(true);
    try {
      const updated = await changeTransferStatus(companyId, transferId, next, reason);
      setTransfer((prev) => (prev ? { ...prev, ...updated } : updated));
      setRejecting(false);
      setRejectReason('');
      try {
        const rows = await getTransferHistory(companyId, transferId);
        setHistory(Array.isArray(rows) ? rows : []);
      } catch { /* history is best-effort */ }
    } catch {
      AppAlert.alert('Could not update', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const onAction = (action: NextAction) => {
    if (action.promptReason) {
      setRejecting(true);
      return;
    }
    // Receiving opens the per-item receive sheet (partial quantities + damage).
    if (action.next === 'Received') {
      setShowReceive(true);
      return;
    }
    applyStatus(action.next);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Transfer" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }} />
        <View style={styles.center}><ActivityIndicator color={appTheme.colors.accent} /></View>
      </SafeAreaView>
    );
  }
  if (!transfer) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Transfer" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }} />
        <View style={styles.center}><Text style={{ color: appTheme.colors.textSecondary }}>Transfer not found</Text></View>
      </SafeAreaView>
    );
  }

  const actions = ACTIONS[transfer.status] || [];
  const items = transfer.items || [];
  const requestedAt = formatDateTime(transfer.createdAt);
  const expectedAt = formatDateTime(transfer.expectedAt);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader title="Transfer" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* From → To + status */}
        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
          <View style={styles.statusRow}>
            <View style={styles.locationRow}>
              <Icon name="business-outline" size={16} color={appTheme.colors.textSecondary} />
              <Text style={[styles.locationText, { color: appTheme.colors.text }]} numberOfLines={1}>
                {transfer.fromLocationName || 'Unknown'}
              </Text>
              <Icon name="arrow-forward" size={14} color={appTheme.colors.textSecondary} style={styles.arrow} />
              <Text style={[styles.locationText, { color: appTheme.colors.text }]} numberOfLines={1}>
                {transfer.toLocationName || 'Unknown'}
              </Text>
            </View>
            <Pill text={TRANSFER_STATUS_LABELS[transfer.status]} color={TRANSFER_STATUS_COLORS[transfer.status]} />
          </View>
          {requestedAt && (
            <Text style={[styles.meta, { color: appTheme.colors.textSecondary }]}>Requested: {requestedAt}</Text>
          )}
          {expectedAt && (
            <Text style={[styles.meta, { color: appTheme.colors.textSecondary }]}>Expected: {expectedAt}</Text>
          )}
          {!!transfer.rejectedReason && (
            <Text style={[styles.meta, { color: appTheme.colors.error }]}>Rejected: {transfer.rejectedReason}</Text>
          )}
        </View>

        {/* Items */}
        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
          <SectionTitle style={{ marginBottom: 4 }}>Items ({items.length})</SectionTitle>
          {items.length === 0 ? (
            <Text style={[styles.meta, { color: appTheme.colors.textSecondary }]}>No items.</Text>
          ) : (
            items.map((it, idx) => (
              <View key={`${it.productId}-${idx}`} style={styles.itemRow}>
                <Icon name="cube-outline" size={16} color={appTheme.colors.textSecondary} />
                <Text style={[styles.itemName, { color: appTheme.colors.text }]} numberOfLines={1}>{it.name}</Text>
                <Text style={[styles.itemQty, { color: appTheme.colors.textSecondary }]}>×{it.quantity}</Text>
              </View>
            ))
          )}
        </View>

        {/* Notes */}
        {!!transfer.notes && (
          <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
            <SectionTitle style={{ marginBottom: 4 }}>Notes</SectionTitle>
            <Text style={[styles.body, { color: appTheme.colors.textSecondary }]}>{transfer.notes}</Text>
          </View>
        )}

        {/* Status history timeline */}
        {history.length > 0 && (
          <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
            <SectionTitle style={{ marginBottom: 4 }}>History</SectionTitle>
            {history.map((h) => (
              <View key={h.id} style={styles.historyRow}>
                <Icon name="checkmark-circle-outline" size={16} color={TRANSFER_STATUS_COLORS[h.to]} />
                <Text style={[styles.historyText, { color: appTheme.colors.text }]}>
                  {h.from ? `${TRANSFER_STATUS_LABELS[h.from]} → ` : ''}{TRANSFER_STATUS_LABELS[h.to]}
                </Text>
                <Text style={[styles.historyDate, { color: appTheme.colors.textSecondary }]}>{formatDateTime(h.createdAt)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Reject reason input */}
        {rejecting && (
          <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.label, { color: appTheme.colors.textSecondary }]}>Reason for rejection (optional)</Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Why is this being rejected…"
              placeholderTextColor={appTheme.colors.textMuted}
              multiline
              style={[styles.input, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor }]}
            />
            <ButtonRow gap={10} style={styles.rejectActions}>
              <AppButton
                title="Cancel"
                onPress={() => { setRejecting(false); setRejectReason(''); }}
                variant="outline"
                disabled={submitting}
              />
              <AppButton
                title="Confirm reject"
                onPress={() => applyStatus('Rejected', rejectReason || undefined)}
                variant="alert"
                loading={submitting}
                disabled={submitting}
              />
            </ButtonRow>
          </View>
        )}

        {/* Action buttons */}
        {!rejecting && actions.map((action) => (
          <AppButton
            key={action.next}
            title={action.label}
            onPress={() => onAction(action)}
            variant={action.destructive ? 'alert' : 'accent'}
            loading={submitting}
            disabled={submitting}
            fullWidth
          />
        ))}
      </ScrollView>

      <TransferReceiveModal
        visible={showReceive}
        onClose={() => setShowReceive(false)}
        transfer={transfer}
        onReceived={(updated) => {
          setTransfer((prev) => (prev ? { ...prev, ...updated } : updated));
          load();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  locationText: { fontSize: 15, fontFamily: 'InterCustom-SemiBold', flexShrink: 1 },
  arrow: { marginHorizontal: 6 },
  meta: { fontSize: 14, fontFamily: 'InterCustom-Medium' },
  body: { fontSize: 15, fontFamily: 'InterCustom-Regular', lineHeight: 21 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { flex: 1, fontSize: 15, fontFamily: 'InterCustom-Medium' },
  itemQty: { fontSize: 14, fontFamily: 'InterCustom-SemiBold' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyText: { flex: 1, fontSize: 14, fontFamily: 'InterCustom-Medium' },
  historyDate: { fontSize: 12, fontFamily: 'InterCustom-Regular' },
  label: { fontSize: 13, fontFamily: 'InterCustom-SemiBold', marginBottom: 8 },
  input: { minHeight: 70, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 15, textAlignVertical: 'top' },
  rejectActions: { marginTop: 4 },
});
