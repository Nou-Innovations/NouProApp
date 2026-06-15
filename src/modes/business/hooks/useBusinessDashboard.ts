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
import { formatCurrency } from '@/shared/utils/format';
import {
  getBusinessDashboard,
  formatActivityTime,
  type BusinessDashboard,
  type BusinessHealth,
  type DashboardPriorityItem,
  type DashboardSummary,
  type ActivityItem,
} from '@/features/business';
import type { KpiChip } from '../components/ProKpiChipsRow';
import type { KpiCardData } from '../components/KpiCard';
import type { PriorityItem, PriorityItemType } from '../components/ProPriorityQueue';
import type { QuickAction } from '../components/ProQuickActions';
import { MOCK_DASHBOARD, USE_MOCK_DASHBOARD_FALLBACK } from './mockDashboard';

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
  health: BusinessHealth | null;
  kpiChips: KpiChip[];
  kpiCards: KpiCardData[];
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

  // Preview fallback: until the backend that serves the new dashboard fields is
  // deployed, `salesToday` is absent → use mock data so the screen previews
  // cleanly. Once the backend returns the new fields, this switches to real data.
  const backendHasNewFields = data?.summary?.salesToday !== undefined;
  const useMock = USE_MOCK_DASHBOARD_FALLBACK && !backendHasNewFields;
  const effectiveData = useMock ? MOCK_DASHBOARD : data;

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

  const kpiCards = useMemo<KpiCardData[]>(() => {
    if (!effectiveData?.summary) return [];
    const s = effectiveData.summary;

    // Sales Today delta vs yesterday
    let salesDelta: KpiCardData['delta'];
    if (s.salesYesterday > 0) {
      const pct = Math.round(((s.salesToday - s.salesYesterday) / s.salesYesterday) * 100);
      salesDelta = {
        text: `${pct >= 0 ? '+' : ''}${pct}% vs yesterday`,
        tone: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
      };
    } else if (s.salesToday > 0) {
      salesDelta = { text: 'New sales today', tone: 'up' };
    }

    return [
      {
        id: 'sales',
        label: 'Sales Today',
        value: formatCurrency(Math.round(s.salesToday)),
        delta: salesDelta,
        icon: 'cash-outline',
        color: theme.colors.success,
        onPress: () => navigation.navigate('Orders', { initialTab: 'incoming' }),
      },
      {
        id: 'activeOrders',
        label: 'Active Orders',
        value: String(s.activeOrders),
        delta: s.newOrders > 0 ? { text: `${s.newOrders} new`, tone: 'neutral' } : undefined,
        icon: 'cart-outline',
        color: theme.colors.info,
        onPress: () => navigation.navigate('Orders', { initialTab: 'incoming' }),
      },
      {
        id: 'deliveriesToday',
        label: 'Deliveries Today',
        value: String(s.deliveriesToday),
        delta:
          s.deliveriesInTransit > 0
            ? { text: `${s.deliveriesInTransit} in transit`, tone: 'neutral' }
            : undefined,
        icon: 'car-outline',
        color: theme.colors.warning,
        onPress: () => navigation.navigate('Deliveries'),
      },
      {
        id: 'unpaid',
        label: 'Unpaid Invoices',
        value: formatCurrency(Math.round(s.unpaidInvoiceAmount)),
        delta:
          s.overdueInvoiceCount > 0
            ? { text: `${s.overdueInvoiceCount} overdue`, tone: 'down' }
            : undefined,
        icon: 'receipt-text-outline',
        color: theme.colors.error,
        onPress: () => navigation.navigate('Invoices'),
      },
    ];
  }, [effectiveData?.summary, navigation]);

  const priorityItems = useMemo<PriorityItem[]>(() => {
    if (!effectiveData?.priorityItems) return [];
    return effectiveData.priorityItems.map((it) => ({
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
  }, [effectiveData?.priorityItems, navigation]);

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
    summary: effectiveData?.summary ?? null,
    health: effectiveData?.health ?? null,
    kpiChips,
    kpiCards,
    priorityItems,
    quickActions,
    recentActivity: effectiveData?.recentActivity ?? [],
    // When previewing with mock data, never surface the (real) load error.
    loading,
    refreshing,
    error: useMock ? null : error,
    refresh,
  };
}

export default useBusinessDashboard;
