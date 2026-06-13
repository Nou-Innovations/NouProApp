/**
 * useBusinessDashboard
 *
 * Single source of truth for the Business Home screen. Fetches the dashboard
 * payload (summary counts, priority queue, recent activity) and maps it into
 * ready-to-render props for the Pro* presentational components, attaching the
 * navigation/action handlers the backend can't supply.
 *
 * Data: API → dashboard.service → this hook → BusinessHomeScreen.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/shared/types/navigation';
import { theme } from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';
import { SubscriptionPlan } from '@/shared/types/subscription';
import {
  canViewInvoices,
  canCreateDeliveries,
  canViewProcurement,
  canCreateProcurementOrders,
  canEditProducts,
} from '@/shared/utils/permissions';
import {
  getBusinessDashboard,
  formatActivityTime,
  type BusinessDashboard,
  type DashboardPriorityItem,
  type DashboardSummary,
  type ActivityItem,
} from '@/features/business';
import type { KpiChip } from '../components/ProKpiChipsRow';
import type { PriorityItem, PriorityItemType } from '../components/ProPriorityQueue';
import type { QuickAction } from '../components/ProQuickActions';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ACTION_LABELS: Record<DashboardPriorityItem['type'], string> = {
  order_pending: 'Review',
  delivery_pending: 'Assign',
  invoice_overdue: 'View',
  stock_alert: 'Restock',
};

/** Open the detail screen for a priority item based on its entity type. */
function openEntity(navigation: Nav, item: DashboardPriorityItem) {
  switch (item.entityType) {
    case 'order':
      navigation.navigate('OrderDetails', { orderId: item.entityId });
      break;
    case 'delivery':
      navigation.navigate('DeliveryDetail', { deliveryId: item.entityId, viewAs: 'self' });
      break;
    case 'invoice':
      navigation.navigate('InvoiceDetails', { invoiceId: item.entityId });
      break;
    case 'product':
      navigation.navigate('ProductDetail', { productId: item.entityId });
      break;
  }
}

export interface UseBusinessDashboardResult {
  summary: DashboardSummary | null;
  kpiChips: KpiChip[];
  priorityItems: PriorityItem[];
  quickActions: QuickAction[];
  recentActivity: ActivityItem[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBusinessDashboard(): UseBusinessDashboardResult {
  const navigation = useNavigation<Nav>();

  const activeBusinessId = useProfileStore((s) => s.activeBusinessId);
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const role = useProfileStore((s) => s.currentUserRole);
  const currentLocationId = useBusinessStore((s) => s.currentLocationId);

  const plan = (activeBusiness?.plan ?? null) as SubscriptionPlan | null;
  const isAdmin = role === 'admin' || role === 'super_admin';

  const [data, setData] = useState<BusinessDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const fetchData = useCallback(
    async ({ initial }: { initial: boolean }) => {
      if (!activeBusinessId) {
        setLoading(false);
        return;
      }
      if (initial) setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const result = await getBusinessDashboard(activeBusinessId, {
          locationId: currentLocationId ?? undefined,
        });
        setData(result);
        hasLoaded.current = true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeBusinessId, currentLocationId]
  );

  // Refetch on focus and whenever the business/location changes. The first
  // load shows skeletons; later loads refresh silently.
  useFocusEffect(
    useCallback(() => {
      fetchData({ initial: !hasLoaded.current });
    }, [fetchData])
  );

  const refresh = useCallback(() => fetchData({ initial: false }), [fetchData]);

  const kpiChips = useMemo<KpiChip[]>(() => {
    if (!data?.summary) return [];
    const s = data.summary;
    return [
      {
        id: 'orders',
        label: 'New Orders',
        value: s.newOrders,
        icon: 'cart-outline',
        color: theme.colors.info,
        onPress: () => navigation.navigate('Orders', { initialTab: 'incoming' }),
      },
      {
        id: 'deliveries',
        label: 'Deliveries',
        value: s.pendingDeliveries,
        icon: 'car-outline',
        color: theme.colors.warning,
        onPress: () => navigation.navigate('Deliveries'),
      },
      {
        id: 'invoices',
        label: 'Unpaid Invoices',
        value: s.unpaidInvoices,
        icon: 'receipt-text-outline',
        color: theme.colors.error,
        onPress: () => navigation.navigate('Invoices'),
      },
      {
        id: 'tasks',
        label: 'Open Tasks',
        value: s.openTasks,
        icon: 'checkbox-outline',
        color: theme.colors.statusInReview,
        onPress: () => navigation.navigate('Tasks'),
      },
    ];
  }, [data?.summary, navigation]);

  const priorityItems = useMemo<PriorityItem[]>(() => {
    if (!data?.priorityItems) return [];
    return data.priorityItems.map((it) => ({
      id: it.id,
      type: it.type as PriorityItemType,
      title: it.title,
      subtitle: it.subtitle,
      timestamp: formatActivityTime(it.timestamp),
      urgency: it.urgency,
      actionLabel: ACTION_LABELS[it.type],
      onAction: () => openEntity(navigation, it),
      onPress: () => openEntity(navigation, it),
    }));
  }, [data?.priorityItems, navigation]);

  const quickActions = useMemo<QuickAction[]>(() => {
    const candidates: QuickAction[] = [];
    if (canViewInvoices(role, plan)) {
      candidates.push({
        id: 'invoice',
        label: 'New Invoice',
        icon: 'document-text-outline',
        color: theme.colors.error,
        onPress: () => navigation.navigate('CreateInvoice', { type: 'invoice' }),
      });
    }
    if (isAdmin && canCreateDeliveries(plan)) {
      candidates.push({
        id: 'delivery',
        label: 'New Delivery',
        icon: 'car-outline',
        color: theme.colors.warning,
        onPress: () => navigation.navigate('CreateDelivery', {}),
      });
    }
    if (canViewProcurement(role) && canCreateProcurementOrders(plan)) {
      candidates.push({
        id: 'po',
        label: 'New Purchase Order',
        icon: 'cart-outline',
        color: theme.colors.info,
        onPress: () => navigation.navigate('CreatePurchaseOrder', {}),
      });
    }
    if (canEditProducts(role)) {
      candidates.push({
        id: 'product',
        label: 'New Product',
        icon: 'cube-outline',
        color: theme.colors.success,
        onPress: () => navigation.navigate('CreateProduct', {}),
      });
    }
    if (isAdmin && activeBusinessId) {
      candidates.push({
        id: 'task',
        label: 'New Task',
        icon: 'checkbox-outline',
        color: theme.colors.statusInReview,
        onPress: () => navigation.navigate('CreateTask', { businessId: activeBusinessId }),
      });
    }
    return candidates.slice(0, 4);
  }, [role, plan, isAdmin, activeBusinessId, navigation]);

  return {
    summary: data?.summary ?? null,
    kpiChips,
    priorityItems,
    quickActions,
    recentActivity: data?.recentActivity ?? [],
    loading,
    refreshing,
    error,
    refresh,
  };
}

export default useBusinessDashboard;
