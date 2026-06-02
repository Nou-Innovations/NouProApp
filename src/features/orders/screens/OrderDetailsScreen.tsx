/**
 * OrderDetailsScreen
 * Shows a single order. Sellers (order.businessId === active business) get
 * actions: Accept/Reject (NEW), update status, and the OrderOptionsList
 * (assign/delivery, invoice, chat, payment, notes, history). Buyers get a
 * read-only view + status history.
 *
 * The order is read reactively from the order store (already populated by
 * OrdersScreen via useOrders), so seller-scoped service calls work and a
 * buyer doesn't need access to the seller's company-scoped GET endpoint.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { OrderStatusBadge } from '@/shared/components/ui';
import { Text } from '@/shared/components/ui/Typography';
import { formatCurrency } from '@/shared/utils/format';
import { OrderOptionsList } from '@/features/orders/components';
import { useOrderStore } from '@/shared/store/orderStore';
import { useProfileStore } from '@/shared/store/profileStore';
import { PAYMENT_STATUS_LABELS } from '@/shared/types/order';
import type { PaymentStatus } from '@/shared/types/order';
import type { OrderStatus } from '@/shared/constants/orderStatus';
import {
  confirmOrder,
  declineOrder,
  updateOrderStatus,
  updateOrderPaymentStatus,
  getOrderHistory,
  getOrderTransitions,
  OrderStatusHistoryEntry,
  OrderTransitions,
} from '@/shared/services/orders';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetails'>;

export default function OrderDetailsScreen({ route }: Props) {
  const { orderId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme: appTheme } = useTheme();

  const order = useOrderStore((state) => state.orders.find((o) => o.id === orderId));
  const fetchOrders = useOrderStore((state) => state.fetchOrders);
  const fetchPlacedOrders = useOrderStore((state) => state.fetchPlacedOrders);

  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const businessId = activeBusiness?.id;
  const isSeller = !!order && !!businessId && order.businessId === businessId;

  const [busy, setBusy] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [history, setHistory] = useState<OrderStatusHistoryEntry[]>([]);
  const [transitionsVisible, setTransitionsVisible] = useState(false);
  const [transitions, setTransitions] = useState<OrderTransitions | null>(null);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    await fetchOrders(businessId);
    await fetchPlacedOrders(businessId);
  }, [businessId, fetchOrders, fetchPlacedOrders]);

  if (!order) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Order" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
        <View style={styles.center}>
          <Text style={{ color: appTheme.colors.textLight }}>Order not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const counterparty = isSeller
    ? order.buyerBusinessName || order.customerName || 'Customer'
    : order.sellerBusinessName || 'Supplier';
  const paymentLabel = order.paymentStatus
    ? PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus] || order.paymentStatus
    : 'Unknown';

  // ---- Seller actions ----
  const handleAccept = async () => {
    if (!businessId) return;
    setBusy(true);
    try {
      await confirmOrder(businessId, orderId);
      await refresh();
      Alert.alert('Order accepted', 'A delivery has been created for this order.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not accept the order.');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = () => {
    Alert.alert('Reject order', 'Are you sure you want to reject this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          if (!businessId) return;
          setBusy(true);
          try {
            await declineOrder(businessId, orderId, 'Rejected by seller');
            await refresh();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not reject the order.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const openTransitions = async () => {
    if (!businessId) return;
    try {
      const t = await getOrderTransitions(businessId, orderId);
      setTransitions(t);
      setTransitionsVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not load status options.');
    }
  };

  const applyTransition = async (status: string) => {
    if (!businessId) return;
    setTransitionsVisible(false);
    setBusy(true);
    try {
      await updateOrderStatus(businessId, orderId, status as OrderStatus, 'Updated by seller');
      await refresh();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update status.');
    } finally {
      setBusy(false);
    }
  };

  const handleMarkPaid = () => {
    Alert.alert('Mark as paid', 'Record this order as fully paid?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark paid',
        onPress: async () => {
          if (!businessId) return;
          setBusy(true);
          try {
            await updateOrderPaymentStatus(businessId, orderId, 'PAID');
            await refresh();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not update payment.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const openHistory = async () => {
    if (!businessId) return;
    try {
      const h = await getOrderHistory(businessId, orderId);
      setHistory(h);
      setHistoryVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not load history.');
    }
  };

  const handleOptionPress = (type: string) => {
    switch (type) {
      case 'assign':
      case 'delivery':
        navigation.navigate('CreateDelivery', { orderId });
        break;
      case 'invoice':
        navigation.navigate('CreateInvoice', { type: 'invoice' });
        break;
      case 'chat':
        navigation.navigate('Chat', {
          id: order.buyerBusinessId || order.id,
          name: counterparty,
          isGroup: false,
          partnerId: order.buyerBusinessId || order.id,
          partnerType: 'business',
        });
        break;
      case 'payment':
        if (order.paymentStatus !== 'PAID') handleMarkPaid();
        break;
      case 'notes':
        Alert.alert('Order notes', order.notes || 'No notes on this order.');
        break;
      case 'history':
        openHistory();
        break;
      default:
        break;
    }
  };

  const isNew = order.status === 'NEW';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title={`Order #${order.id.slice(-6)}`}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground }]}>
          <View style={styles.summaryHeader}>
            <Text style={[styles.counterparty, { color: appTheme.colors.text }]}>{counterparty}</Text>
            <OrderStatusBadge status={order.status as OrderStatus} size="sm" />
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: appTheme.colors.textLight }]}>Total</Text>
            <Text style={[styles.metaValue, { color: appTheme.colors.text }]}>
              {formatCurrency(order.totalAmount ?? 0)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: appTheme.colors.textLight }]}>Payment</Text>
            <Text style={[styles.metaValue, { color: appTheme.colors.text }]}>{paymentLabel}</Text>
          </View>
          {order.notes ? (
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: appTheme.colors.textLight }]}>Notes</Text>
              <Text style={[styles.metaValue, { color: appTheme.colors.text, flex: 1, textAlign: 'right' }]}>
                {order.notes}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Items */}
        <Text style={[styles.sectionLabel, { color: appTheme.colors.textLight }]}>Items</Text>
        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground }]}>
          {(order.items || []).map((item) => (
            <View key={item.id || item.productId} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: appTheme.colors.text }]} numberOfLines={2}>
                  {item.productName || 'Item'}
                </Text>
                <Text style={[styles.itemMeta, { color: appTheme.colors.textLight }]}>
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text style={[styles.itemTotal, { color: appTheme.colors.text }]}>
                {formatCurrency(item.subtotal ?? item.unitPrice * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        {/* Seller: Accept / Reject for NEW orders */}
        {isSeller && isNew && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: appTheme.colors.success, opacity: busy ? 0.6 : 1 }]}
              onPress={handleAccept}
              disabled={busy}
            >
              <Text style={styles.actionBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: appTheme.colors.error, opacity: busy ? 0.6 : 1 }]}
              onPress={handleReject}
              disabled={busy}
            >
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Seller: update status (non-NEW) */}
        {isSeller && !isNew && (
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: appTheme.colors.primary }]}
            onPress={openTransitions}
            disabled={busy}
          >
            <Text style={[styles.secondaryBtnText, { color: appTheme.colors.primary }]}>Update status</Text>
          </TouchableOpacity>
        )}

        {/* Seller options */}
        {isSeller && (
          <View style={{ marginTop: 16 }}>
            <OrderOptionsList order={order} onOptionPress={handleOptionPress} />
          </View>
        )}

        {/* Buyer: view history */}
        {!isSeller && (
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: appTheme.colors.primary }]}
            onPress={openHistory}
          >
            <Text style={[styles.secondaryBtnText, { color: appTheme.colors.primary }]}>View status history</Text>
          </TouchableOpacity>
        )}

        {busy && <ActivityIndicator style={{ marginTop: 16 }} color={appTheme.colors.primary} />}
      </ScrollView>

      {/* History modal */}
      <Modal visible={historyVisible} transparent animationType="slide" onRequestClose={() => setHistoryVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: appTheme.colors.background }]}>
            <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>Status history</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {history.length === 0 ? (
                <Text style={{ color: appTheme.colors.textLight, paddingVertical: 12 }}>No history yet.</Text>
              ) : (
                history.map((h) => (
                  <View key={h.id} style={[styles.historyRow, { borderBottomColor: appTheme.colors.borderColor }]}>
                    <Text style={[styles.historyText, { color: appTheme.colors.text }]}>
                      {h.from} → {h.to}
                    </Text>
                    {h.reason ? (
                      <Text style={[styles.historyMeta, { color: appTheme.colors.textLight }]}>{h.reason}</Text>
                    ) : null}
                    <Text style={[styles.historyMeta, { color: appTheme.colors.textLight }]}>
                      {new Date(h.createdAt).toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalClose, { backgroundColor: appTheme.colors.primary }]}
              onPress={() => setHistoryVisible(false)}
            >
              <Text style={styles.actionBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Transitions modal */}
      <Modal visible={transitionsVisible} transparent animationType="slide" onRequestClose={() => setTransitionsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: appTheme.colors.background }]}>
            <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>Update status</Text>
            {transitions?.transitions?.length ? (
              transitions.transitions.map((t) => (
                <TouchableOpacity
                  key={t.status}
                  style={[styles.transitionBtn, { borderColor: appTheme.colors.borderColor }]}
                  onPress={() => applyTransition(t.status)}
                >
                  <Text style={[styles.transitionText, { color: appTheme.colors.text }]}>{t.label}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={{ color: appTheme.colors.textLight, paddingVertical: 12 }}>
                No further status changes available.
              </Text>
            )}
            <TouchableOpacity
              style={[styles.modalClose, { backgroundColor: appTheme.colors.primary }]}
              onPress={() => setTransitionsVisible(false)}
            >
              <Text style={styles.actionBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  card: { borderRadius: 12, padding: theme.spacing.md, marginBottom: 8 },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  counterparty: { fontSize: 18, fontFamily: theme.fonts.primary.bold, flex: 1, paddingRight: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  metaLabel: { fontSize: 13 },
  metaValue: { fontSize: 14, fontFamily: theme.fonts.primary.medium },
  sectionLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  itemInfo: { flex: 1, paddingRight: 12 },
  itemName: { fontSize: 14, fontFamily: theme.fonts.primary.medium },
  itemMeta: { fontSize: 12, marginTop: 2 },
  itemTotal: { fontSize: 14, fontFamily: theme.fonts.primary.bold },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: theme.fonts.primary.bold },
  secondaryBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  secondaryBtnText: { fontSize: 16, fontFamily: theme.fonts.primary.bold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalTitle: { fontSize: 18, fontFamily: theme.fonts.primary.bold, marginBottom: 12 },
  historyRow: { paddingVertical: 10, borderBottomWidth: 1 },
  historyText: { fontSize: 14, fontFamily: theme.fonts.primary.medium },
  historyMeta: { fontSize: 12, marginTop: 2 },
  transitionBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8 },
  transitionText: { fontSize: 15, fontFamily: theme.fonts.primary.medium },
  modalClose: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
});
