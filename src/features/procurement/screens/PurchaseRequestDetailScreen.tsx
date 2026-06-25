/**
 * PurchaseRequestDetailScreen
 *
 * Shows full details for a purchase request including status, priority,
 * items, supplier, dates, and notes. Provides approve/reject actions
 * for SUBMITTED requests and convert-to-PO for APPROVED ones.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { SectionTitle, AppButton, ButtonRow } from '@/shared/components/ui';
import ProcurementStatusBadge from '../components/ProcurementStatusBadge';
import type { PurchaseRequest } from '@/shared/types/procurement';
import * as procurementService from '../services/procurement.service';
import { usePurchaseRequests } from '../hooks/usePurchaseRequests';

export default function PurchaseRequestDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id || '';
  const requestId: string = route.params?.requestId ?? '';

  const { handleApprove, handleReject, handleConvert } = usePurchaseRequests();

  const [pr, setPr] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    if (!businessId || !requestId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await procurementService.getPurchaseRequest(businessId, requestId);
      setPr(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load purchase request.');
    } finally {
      setLoading(false);
    }
  }, [businessId, requestId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Actions ──
  const onApprove = useCallback(async () => {
    setActionLoading(true);
    try {
      const updated = await handleApprove(requestId);
      setPr(updated);
      AppAlert.alert('Approved', 'Purchase request has been approved.');
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || 'Failed to approve.');
    } finally {
      setActionLoading(false);
    }
  }, [requestId, handleApprove]);

  const onReject = useCallback(() => {
    AppAlert.prompt(
      'Reject Request',
      'Please provide a reason for rejection:',
      async (reason) => {
        if (!reason?.trim()) { AppAlert.alert('Error', 'A reason is required.'); return; }
        setActionLoading(true);
        try {
          const updated = await handleReject(requestId, reason.trim());
          setPr(updated);
          AppAlert.alert('Rejected', 'Purchase request has been rejected.');
        } catch (e: any) {
          AppAlert.alert('Error', e?.message || 'Failed to reject.');
        } finally {
          setActionLoading(false);
        }
      },
      'plain-text'
    );
  }, [requestId, handleReject]);

  const onConvert = useCallback(async () => {
    setActionLoading(true);
    try {
      const po = await handleConvert(requestId);
      AppAlert.alert('Converted', `Purchase order ${po.id} created.`, [
        {
          text: 'View PO',
          onPress: () => (navigation as any).navigate('PurchaseOrderDetail', { orderId: po.id }),
        },
        { text: 'OK' },
      ]);
      setPr((prev) => (prev ? { ...prev, status: 'CONVERTED', purchaseOrderId: po.id } : prev));
    } catch (e: any) {
      AppAlert.alert('Error', e?.message || 'Failed to convert.');
    } finally {
      setActionLoading(false);
    }
  }, [requestId, handleConvert, navigation]);

  // ── Loading / Error ──
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Purchase Request" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack() }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !pr) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Purchase Request" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack() }} />
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: appTheme.colors.textSecondary }]}>{error || 'Request not found.'}</Text>
          <AppButton title="Retry" onPress={fetchData} variant="outline" size="small" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived data ──
  const formattedDate = pr.createdAt ? new Date(pr.createdAt).toLocaleDateString() : '-';
  const requiredByFormatted = pr.requiredByDate ? new Date(pr.requiredByDate).toLocaleDateString() : '-';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title={pr.id.slice(0, 12)}
        leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status & Priority badges */}
        <View style={styles.badgeRow}>
          <ProcurementStatusBadge status={pr.status} type="pr" />
          <ProcurementStatusBadge status={pr.priority} type="priority" />
        </View>

        {/* Info section */}
        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
          <InfoRow label="Supplier" value={pr.supplier?.name || 'None'} color={appTheme.colors} />
          <InfoRow label="Requested By" value={pr.requestedBy || '-'} color={appTheme.colors} />
          <InfoRow label="Date" value={formattedDate} color={appTheme.colors} />
          <InfoRow label="Required By" value={requiredByFormatted} color={appTheme.colors} />
        </View>

        {/* Items list */}
        <SectionTitle style={{ marginBottom: 8 }}>Items</SectionTitle>
        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
          {pr.items.map((item, idx) => (
            <View key={idx} style={[styles.itemRow, idx < pr.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: appTheme.colors.borderColor }]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: appTheme.colors.text }]}>{item.productName}</Text>
                <Text style={[styles.itemMeta, { color: appTheme.colors.textSecondary }]}>
                  Qty: {item.quantity} x {(item.unitPrice ?? 0).toFixed(2)}
                </Text>
              </View>
              <Text style={[styles.itemSubtotal, { color: appTheme.colors.text }]}>
                {(item.subtotal ?? (item.quantity * (item.unitPrice ?? 0))).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={[styles.totalRow, { borderColor: appTheme.colors.borderColor }]}>
          <Text style={[styles.totalLabel, { color: appTheme.colors.textSecondary }]}>Total Amount</Text>
          <Text style={[styles.totalValue, { color: appTheme.colors.text }]}>{(pr.totalAmount ?? 0).toFixed(2)}</Text>
        </View>

        {/* Notes */}
        {!!pr.notes && (
          <>
            <SectionTitle style={{ marginBottom: 8 }}>Notes</SectionTitle>
            <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
              <Text style={[styles.notesText, { color: appTheme.colors.text }]}>{pr.notes}</Text>
            </View>
          </>
        )}

        {/* Rejection reason */}
        {pr.status === 'REJECTED' && !!pr.rejectionReason && (
          <>
            <SectionTitle style={{ marginBottom: 8 }} color={appTheme.colors.error}>Rejection Reason</SectionTitle>
            <View style={[styles.card, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
              <Text style={[styles.notesText, { color: appTheme.colors.error }]}>{pr.rejectionReason}</Text>
            </View>
          </>
        )}

        {/* Action buttons */}
        {pr.status === 'SUBMITTED' && (
          <ButtonRow style={styles.actionRow}>
            <AppButton
              title="Approve"
              onPress={onApprove}
              variant="confirm"
              disabled={actionLoading}
            />
            <AppButton
              title="Reject"
              onPress={onReject}
              variant="alert"
              disabled={actionLoading}
            />
          </ButtonRow>
        )}

        {pr.status === 'APPROVED' && (
          <AppButton
            title="Convert to PO"
            onPress={onConvert}
            variant="primary"
            fullWidth
            loading={actionLoading}
            disabled={actionLoading}
            style={styles.convertButton}
          />
        )}

        {actionLoading && <ActivityIndicator style={{ marginTop: 12 }} color={appTheme.colors.primary} />}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helper: Info Row ──
function InfoRow({ label, value, color }: { label: string; value: string; color: any }) {
  return (
    <View style={infoStyles.row}>
      <Text style={[infoStyles.label, { color: color.textSecondary }]}>{label}</Text>
      <Text style={[infoStyles.value, { color: color.text }]}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 14, fontWeight: '500' },
  value: { fontSize: 14, fontWeight: '400', maxWidth: '55%', textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  errorText: { fontSize: 16, textAlign: 'center', marginBottom: 16 },

  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },

  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '500' },
  itemMeta: { fontSize: 13, marginTop: 2 },
  itemSubtotal: { fontSize: 15, fontWeight: '600', marginLeft: 12 },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    marginBottom: 16,
  },
  totalLabel: { fontSize: 16, fontWeight: '500' },
  totalValue: { fontSize: 20, fontWeight: '700' },

  notesText: { fontSize: 14, lineHeight: 20 },

  actionRow: { marginTop: 8, marginBottom: 16 },

  convertButton: {
    marginTop: 8,
    marginBottom: 16,
  },
});
