/**
 * PurchaseOrderDetailScreen
 *
 * Shows full details for a purchase order: status, payment status,
 * supplier info, items, totals, dates, notes, and status history timeline.
 * Provides contextual action buttons based on current PO status.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { SectionTitle } from '@/shared/components/ui';
import ProcurementStatusBadge from '../components/ProcurementStatusBadge';
import type {
  PurchaseOrder,
  PurchaseOrderStatusHistoryEntry,
} from '@/shared/types/procurement';
import * as procurementService from '../services/procurement.service';

export default function PurchaseOrderDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id || '';
  const orderId: string = route.params?.orderId ?? '';

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [history, setHistory] = useState<PurchaseOrderStatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [linkedDeliveryId, setLinkedDeliveryId] = useState<string | null>(null);

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    if (!businessId || !orderId) return;
    setLoading(true);
    setError(null);
    try {
      const [poData, historyData] = await Promise.all([
        procurementService.getPurchaseOrder(businessId, orderId),
        procurementService.getPurchaseOrderHistory(businessId, orderId).catch(() => []),
      ]);
      setPo(poData);
      setHistory(historyData);
    } catch (e: any) {
      setError(e?.message || 'Failed to load purchase order.');
    } finally {
      setLoading(false);
    }
  }, [businessId, orderId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Look up linked delivery when PO is confirmed or beyond
  useEffect(() => {
    if (!po || !businessId) return;
    const confirmedStatuses = ['CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED'];
    if (confirmedStatuses.includes(po.status)) {
      procurementService.getDeliveryByOrderId(businessId, orderId)
        .then((delivery) => {
          if (delivery) setLinkedDeliveryId(delivery.id);
        })
        .catch(() => {});
    }
  }, [po?.status, businessId, orderId]);

  // ── Status change helper ──
  const changeStatus = useCallback(
    async (nextStatus: string, reason?: string) => {
      setActionLoading(true);
      try {
        const updated = await procurementService.updatePurchaseOrderStatus(businessId, orderId, nextStatus, reason);
        setPo(updated);
        // Refresh history
        const newHistory = await procurementService.getPurchaseOrderHistory(businessId, orderId).catch(() => []);
        setHistory(newHistory);
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to update status.');
      } finally {
        setActionLoading(false);
      }
    },
    [businessId, orderId]
  );

  // ── Action handlers ──
  const onSend = useCallback(() => {
    Alert.alert('Send PO', 'Send this purchase order to the supplier?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send', onPress: () => changeStatus('SENT') },
    ]);
  }, [changeStatus]);

  const onConfirm = useCallback(() => {
    Alert.alert('Confirm PO', 'Mark this purchase order as confirmed?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => changeStatus('CONFIRMED') },
    ]);
  }, [changeStatus]);

  const onReceiveGoods = useCallback(() => {
    (navigation as any).navigate('GoodsReceipt', { purchaseOrderId: orderId });
  }, [navigation, orderId]);

  const onCancel = useCallback(() => {
    Alert.prompt(
      'Cancel PO',
      'Please provide a reason for cancellation:',
      async (reason) => {
        if (!reason?.trim()) {
          Alert.alert('Error', 'A reason is required.');
          return;
        }
        await changeStatus('CANCELED', reason.trim());
        Alert.alert('Canceled', 'Purchase order has been canceled.');
      },
      'plain-text'
    );
  }, [changeStatus]);

  // ── Loading / Error states ──
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Purchase Order" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack() }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !po) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Purchase Order" leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack() }} />
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: appTheme.colors.textSecondary }]}>{error || 'Order not found.'}</Text>
          <TouchableOpacity onPress={fetchData} style={[styles.retryButton, { borderColor: appTheme.colors.borderColor }]}>
            <Text style={{ color: appTheme.colors.text, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived ──
  const isTerminal = po.status === 'RECEIVED' || po.status === 'CANCELED';
  const formattedExpectedDate = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : '-';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title={po.poNumber || po.id.slice(0, 12)}
        leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status badges */}
        <View style={styles.badgeRow}>
          <ProcurementStatusBadge status={po.status} type="po" />
          {po.paymentStatus && <ProcurementStatusBadge status={po.paymentStatus} type="po" />}
        </View>

        {/* Supplier info */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}
          onPress={() => {
            if (po.supplierId) {
              (navigation as any).navigate('SupplierDetail', { supplierId: po.supplierId });
            }
          }}
          activeOpacity={po.supplierId ? 0.7 : 1}
        >
          <Text style={[styles.cardLabel, { color: appTheme.colors.textSecondary }]}>Supplier</Text>
          <View style={styles.supplierRow}>
            <Text style={[styles.supplierName, { color: appTheme.colors.text }]}>{po.supplier?.name || '-'}</Text>
            {po.supplierId && <Icon name="chevron-forward" size={18} color={appTheme.colors.textSecondary} />}
          </View>
        </TouchableOpacity>

        {/* Items list */}
        <SectionTitle style={{ marginBottom: 8 }}>Items</SectionTitle>
        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
          {po.items.map((item, idx) => (
            <View key={idx} style={[styles.itemRow, idx < po.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: appTheme.colors.borderColor }]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: appTheme.colors.text }]}>{item.productName}</Text>
                <Text style={[styles.itemMeta, { color: appTheme.colors.textSecondary }]}>
                  Qty: {item.quantity} x {item.unitPrice.toFixed(2)}
                </Text>
              </View>
              <Text style={[styles.itemSubtotal, { color: appTheme.colors.text }]}>
                {item.subtotal.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Total, dates, terms */}
        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
          <InfoRow label="Total Amount" value={(po.totalAmount ?? 0).toFixed(2)} color={appTheme.colors} bold />
          <InfoRow label="Expected Delivery" value={formattedExpectedDate} color={appTheme.colors} />
          <InfoRow label="Payment Terms" value={po.paymentTerms || '-'} color={appTheme.colors} />
        </View>

        {/* Notes */}
        {!!po.notes && (
          <>
            <SectionTitle style={{ marginBottom: 8 }}>Notes</SectionTitle>
            <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
              <Text style={[styles.notesText, { color: appTheme.colors.text }]}>{po.notes}</Text>
            </View>
          </>
        )}

        {/* Linked delivery card (when PO was confirmed and auto-delivery created) */}
        {linkedDeliveryId && (
          <TouchableOpacity
            style={[styles.deliveryLinkCard, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}
            onPress={() => (navigation as any).navigate('DeliveryDetail', { deliveryId: linkedDeliveryId })}
            activeOpacity={0.7}
          >
            <Icon name="cube" size={20} color={appTheme.colors.primary} />
            <Text style={[styles.deliveryLinkText, { color: appTheme.colors.text }]}>
              View Incoming Delivery
            </Text>
            <Icon name="chevron-forward" size={16} color={appTheme.colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Action buttons */}
        {!isTerminal && (
          <View style={styles.actionsSection}>
            {po.status === 'DRAFT' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: appTheme.colors.info }]}
                onPress={onSend}
                disabled={actionLoading}
              >
                <Text style={styles.actionButtonText}>Send</Text>
              </TouchableOpacity>
            )}

            {po.status === 'SENT' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: appTheme.colors.success }]}
                onPress={onConfirm}
                disabled={actionLoading}
              >
                <Text style={styles.actionButtonText}>Mark Confirmed</Text>
              </TouchableOpacity>
            )}

            {po.status === 'CONFIRMED' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: appTheme.colors.success }]}
                onPress={onReceiveGoods}
                disabled={actionLoading}
              >
                <Text style={styles.actionButtonText}>Receive Goods</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: appTheme.colors.error }]}
              onPress={onCancel}
              disabled={actionLoading}
            >
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {actionLoading && <ActivityIndicator style={{ marginTop: 12 }} color={appTheme.colors.primary} />}

        {/* Status history timeline */}
        {history.length > 0 && (
          <>
            <SectionTitle style={{ marginBottom: 8, marginTop: 8 }}>Status History</SectionTitle>
            <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
              {history.map((entry, idx) => (
                <View key={entry.id} style={styles.timelineEntry}>
                  <View style={styles.timelineDotCol}>
                    <View style={[styles.timelineDot, { backgroundColor: appTheme.colors.primary }]} />
                    {idx < history.length - 1 && <View style={[styles.timelineLine, { backgroundColor: appTheme.colors.borderColor }]} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineTransition, { color: appTheme.colors.text }]}>
                      {entry.from} &rarr; {entry.to}
                    </Text>
                    {!!entry.reason && (
                      <Text style={[styles.timelineReason, { color: appTheme.colors.textSecondary }]}>{entry.reason}</Text>
                    )}
                    <Text style={[styles.timelineDate, { color: appTheme.colors.textSecondary }]}>
                      {new Date(entry.createdAt).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helper: Info Row ──
function InfoRow({ label, value, color, bold }: { label: string; value: string; color: any; bold?: boolean }) {
  return (
    <View style={infoStyles.row}>
      <Text style={[infoStyles.label, { color: color.textSecondary }]}>{label}</Text>
      <Text style={[infoStyles.value, { color: color.text, fontWeight: bold ? '700' : '400' }]}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 14, fontWeight: '500' },
  value: { fontSize: 14, maxWidth: '55%', textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  errorText: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },

  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },

  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  cardLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },

  supplierRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  supplierName: { fontSize: 16, fontWeight: '600' },

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

  notesText: { fontSize: 14, lineHeight: 20 },

  actionsSection: { gap: 10, marginBottom: 16 },
  actionButton: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  deliveryLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  deliveryLinkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },

  // Timeline
  timelineEntry: { flexDirection: 'row', marginBottom: 4 },
  timelineDotCol: { width: 24, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  timelineLine: { width: 2, flex: 1, marginTop: 4 },
  timelineContent: { flex: 1, paddingLeft: 8, paddingBottom: 14 },
  timelineTransition: { fontSize: 14, fontWeight: '500' },
  timelineReason: { fontSize: 13, marginTop: 2 },
  timelineDate: { fontSize: 12, marginTop: 4 },
});
