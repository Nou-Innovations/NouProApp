/**
 * OrderDetailsScreen
 * Shows a single order. Sellers (order.businessId === active business) get
 * actions: Accept/Reject (NEW), update status, promoted Payment/Delivery
 * cards with quick actions, and a "More" list (assign, invoice, chat, notes,
 * history). Buyers get a polished read-only view + "Message supplier".
 *
 * The order is read reactively from the order store (already populated by
 * OrdersScreen via useOrders), so seller-scoped service calls work and a
 * buyer doesn't need access to the seller's company-scoped GET endpoint.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import { RootStackParamList } from '@/shared/types/navigation';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { AppBottomSheet, AppButton, EmptyState } from '@/shared/components/ui';
import { Text } from '@/shared/components/ui/Typography';
import { formatCurrency } from '@/shared/utils/format';
import { OrderHeaderCard, OrderInfoActionCard, OrderOptionsList } from '@/features/orders/components';
import { useOrderStore } from '@/shared/store/orderStore';
import { useProfileStore } from '@/shared/store/profileStore';
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_COLORS,
} from '@/shared/types/order';
import type { PaymentStatus, DeliveryStatus } from '@/shared/types/order';
import type { OrderStatus } from '@/shared/constants/orderStatus';
import { isFinalStatus } from '@/shared/constants/orderStatus';
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

const formatDate = (iso?: string): string => {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'd MMM yyyy');
  } catch {
    return '';
  }
};

export default function OrderDetailsScreen({ route }: Props) {
  const { orderId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();

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
        <EmptyState
          iconName="alert-circle-outline"
          title="Order not found"
          subtitle="This order may have been removed or is no longer available."
          ctaLabel="Go back"
          onCtaPress={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const counterparty = isSeller
    ? order.buyerBusinessName || order.customerName || 'Customer'
    : order.sellerBusinessName || 'Supplier';

  const items = order.items || [];
  const itemCount = items.length;
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const dateStr = formatDate(order.createdAt);
  const metaLine = [dateStr, `${itemCount} item${itemCount !== 1 ? 's' : ''} (${totalUnits} units)`]
    .filter(Boolean)
    .join(' · ');

  const paymentStatus = (order.paymentStatus as PaymentStatus) || 'UNPAID';
  const paymentLabel = PAYMENT_STATUS_LABELS[paymentStatus] || order.paymentStatus || 'Unknown';
  const paymentColor = PAYMENT_STATUS_COLORS[paymentStatus] || appTheme.colors.neutral;
  const isPaid = order.paymentStatus === 'PAID';

  const deliveryStatus = (order.deliveryStatus as DeliveryStatus) || 'Draft';
  const deliveryLabel = DELIVERY_STATUS_LABELS[deliveryStatus] || deliveryStatus;
  const deliveryColor = DELIVERY_STATUS_COLORS[deliveryStatus] || appTheme.colors.neutral;
  const hasDelivery = deliveryStatus !== 'Draft';

  const isNew = order.status === 'NEW';
  const isFinal = isFinalStatus(order.status as OrderStatus);

  // ---- Actions ----
  const openChat = () => {
    // Role-aware target: seller messages the buyer, buyer messages the seller.
    const partnerId = isSeller ? order.buyerBusinessId || order.id : order.businessId || order.id;
    navigation.navigate('Chat', {
      id: partnerId,
      name: counterparty,
      isGroup: false,
      partnerId,
      partnerType: 'business',
    });
  };

  const openDelivery = () => navigation.navigate('CreateDelivery', { orderId });

  const handleAccept = async () => {
    if (!businessId) return;
    setBusy(true);
    try {
      await confirmOrder(businessId, orderId);
      await refresh();
      AppAlert.alert('Order accepted', 'A delivery has been created for this order.');
    } catch (err: any) {
      AppAlert.alert('Error', err?.message || 'Could not accept the order.');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = () => {
    AppAlert.alert('Reject order', 'Are you sure you want to reject this order?', [
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
            AppAlert.alert('Error', err?.message || 'Could not reject the order.');
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
      AppAlert.alert('Error', err?.message || 'Could not load status options.');
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
      AppAlert.alert('Error', err?.message || 'Could not update status.');
    } finally {
      setBusy(false);
    }
  };

  const handleMarkPaid = () => {
    AppAlert.alert('Mark as paid', 'Record this order as fully paid?', [
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
            AppAlert.alert('Error', err?.message || 'Could not update payment.');
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
      AppAlert.alert('Error', err?.message || 'Could not load history.');
    }
  };

  const handleOptionPress = (type: string) => {
    switch (type) {
      case 'assign':
        navigation.navigate('CreateDelivery', { orderId });
        break;
      case 'invoice':
        navigation.navigate('CreateInvoice', { type: 'invoice' });
        break;
      case 'chat':
        openChat();
        break;
      case 'notes':
        AppAlert.alert('Order notes', order.notes || 'No notes on this order.');
        break;
      case 'history':
        openHistory();
        break;
      default:
        break;
    }
  };

  // ---- Sticky action bar ----
  const showBar = isSeller ? isNew || !isFinal : true;
  const renderActionBar = () => {
    if (isSeller && isNew) {
      return (
        <View style={styles.barRow}>
          <AppButton
            title="Reject"
            onPress={handleReject}
            variant="outline"
            disabled={busy}
            style={{ flex: 1, borderColor: appTheme.colors.error }}
            textStyle={{ color: appTheme.colors.error }}
          />
          <AppButton
            title="Accept"
            onPress={handleAccept}
            variant="confirm"
            loading={busy}
            style={styles.barBtn}
          />
        </View>
      );
    }
    if (isSeller && !isFinal) {
      return <AppButton title="Update status" onPress={openTransitions} variant="primary" loading={busy} />;
    }
    if (!isSeller) {
      return <AppButton title="Message supplier" onPress={openChat} variant="primary" iconLeft="message-circle" />;
    }
    return null;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title={`Order #${order.id.slice(-6)}`}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: showBar ? 104 + insets.bottom : theme.spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <OrderHeaderCard
          counterpartyName={counterparty}
          avatarSeedId={order.buyerBusinessId || order.id}
          metaLine={metaLine}
          status={order.status as OrderStatus}
          totalAmount={order.totalAmount ?? 0}
        />

        {/* Items */}
        <Text style={[styles.sectionLabel, { color: appTheme.colors.textSecondary }]}>
          ITEMS ({itemCount})
        </Text>
        <View style={[styles.card, { backgroundColor: appTheme.colors.cardBackground, borderColor: appTheme.colors.borderColor }]}>
          {itemCount === 0 ? (
            <Text style={[styles.itemMeta, { color: appTheme.colors.textMuted }]}>No items on this order.</Text>
          ) : (
            <>
              {items.map((item) => (
                <View key={item.id || item.productId} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: appTheme.colors.text }]} numberOfLines={2}>
                      {item.productName || 'Item'}
                    </Text>
                    <Text style={[styles.itemMeta, { color: appTheme.colors.textMuted }]}>
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: appTheme.colors.text }]}>
                    {formatCurrency(item.subtotal ?? item.unitPrice * item.quantity)}
                  </Text>
                </View>
              ))}
              <View style={[styles.totalDivider, { backgroundColor: appTheme.colors.surface }]} />
              <View style={styles.summaryTotalRow}>
                <Text style={[styles.summaryTotalLabel, { color: appTheme.colors.textSecondary }]}>Total</Text>
                <Text style={[styles.summaryTotalValue, { color: appTheme.colors.text }]}>
                  {formatCurrency(order.totalAmount ?? 0)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Promoted status cards */}
        <OrderInfoActionCard
          icon="card"
          iconColor={appTheme.colors.success}
          title="Payment"
          statusText={paymentLabel}
          statusColor={paymentColor}
          actionLabel={isSeller && !isPaid ? 'Mark as paid' : undefined}
          onActionPress={isSeller && !isPaid ? handleMarkPaid : undefined}
          disabled={busy}
        />
        <OrderInfoActionCard
          icon="truck"
          iconColor={appTheme.colors.statusInReview}
          title="Delivery"
          statusText={deliveryLabel}
          statusColor={deliveryColor}
          actionLabel={isSeller ? (hasDelivery ? 'View delivery' : 'Assign delivery') : undefined}
          onActionPress={isSeller ? openDelivery : undefined}
          disabled={busy}
        />

        {/* More actions */}
        <OrderOptionsList order={order} onOptionPress={handleOptionPress} isSeller={isSeller} />
      </ScrollView>

      {/* Sticky action bar */}
      {showBar && (
        <View
          style={[
            styles.bar,
            {
              backgroundColor: appTheme.colors.background,
              borderTopColor: appTheme.colors.borderColor,
              paddingBottom: insets.bottom + theme.spacing.md,
            },
          ]}
        >
          {renderActionBar()}
        </View>
      )}

      {/* History sheet */}
      <AppBottomSheet visible={historyVisible} onClose={() => setHistoryVisible(false)} title="Status history">
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          {history.length === 0 ? (
            <Text style={[styles.sheetEmpty, { color: appTheme.colors.textMuted }]}>No history yet.</Text>
          ) : (
            history.map((h) => (
              <View key={h.id} style={[styles.historyRow, { borderBottomColor: appTheme.colors.borderColor }]}>
                <Text style={[styles.historyText, { color: appTheme.colors.text }]}>
                  {h.from} → {h.to}
                </Text>
                {h.reason ? (
                  <Text style={[styles.historyMeta, { color: appTheme.colors.textMuted }]}>{h.reason}</Text>
                ) : null}
                <Text style={[styles.historyMeta, { color: appTheme.colors.textMuted }]}>
                  {new Date(h.createdAt).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </AppBottomSheet>

      {/* Transitions sheet */}
      <AppBottomSheet
        visible={transitionsVisible}
        onClose={() => setTransitionsVisible(false)}
        title="Update status"
      >
        <View style={styles.sheetButtons}>
          {transitions?.transitions?.length ? (
            transitions.transitions.map((t) => (
              <AppButton
                key={t.status}
                title={t.label}
                onPress={() => applyTransition(t.status)}
                variant="outline"
              />
            ))
          ) : (
            <Text style={[styles.sheetEmpty, { color: appTheme.colors.textMuted }]}>
              No further status changes available.
            </Text>
          )}
        </View>
      </AppBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: theme.spacing.md },
  card: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.semiBold,
    letterSpacing: 0.5,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    marginLeft: 4,
  },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.md },
  itemInfo: { flex: 1, paddingRight: theme.spacing.md },
  itemName: { fontSize: 15, fontFamily: theme.fonts.primary.medium },
  itemMeta: { fontSize: 13, marginTop: 2 },
  itemTotal: { fontSize: 15, fontFamily: theme.fonts.primary.bold },
  totalDivider: { height: 1, marginTop: 2, marginBottom: theme.spacing.md },
  summaryTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryTotalLabel: { fontSize: 14, fontFamily: theme.fonts.primary.medium },
  summaryTotalValue: { fontSize: 18, fontFamily: theme.fonts.primary.bold },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  barRow: { flexDirection: 'row', gap: theme.spacing.sm + 4 },
  barBtn: { flex: 1 },
  sheetScroll: { maxHeight: 380, paddingHorizontal: theme.spacing.md },
  sheetButtons: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm, gap: theme.spacing.sm },
  sheetEmpty: { fontSize: 14, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.md },
  historyRow: { paddingVertical: theme.spacing.sm + 2, borderBottomWidth: 1 },
  historyText: { fontSize: 14, fontFamily: theme.fonts.primary.medium },
  historyMeta: { fontSize: 12, marginTop: 2 },
});
