/**
 * Business Dashboard Service
 *
 * Fetches the Business Home screen payload in a single call:
 * - summary       → KPI chip counts (new orders, pending deliveries, unpaid invoices, open tasks)
 * - priorityItems → "needs attention" queue (pending orders/deliveries, overdue invoices, stock alerts)
 * - recentActivity → recent activity timeline preview (same shape as the activity feed)
 *
 * Backend: GET /api/companies/:companyId/dashboard?locationId=...
 */

import { get } from '@/shared/services/api';
import type { ActivityItem } from './activity.service';

export interface DashboardSummary {
  newOrders: number;
  pendingDeliveries: number;
  unpaidInvoices: number;
  /** Outstanding unpaid amount (Σ totalAmount − Σ paidAmount on unpaid invoices). */
  unpaidInvoiceAmount: number;
  openTasks: number;
  /** Σ order totals created today (excl. canceled/rejected). */
  salesToday: number;
  /** Σ order totals created yesterday — for the "vs yesterday" delta. */
  salesYesterday: number;
  /** Orders not finished/canceled (NEW…IN_REVIEW). */
  activeOrders: number;
  /** Deliveries whose expected date is today. */
  deliveriesToday: number;
  /** Deliveries currently in transit. */
  deliveriesInTransit: number;
  /** Accurate counts (not capped) for KPI deltas + health. */
  overdueInvoiceCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export type HealthStatus = 'good' | 'attention' | 'critical';

/** Server-computed business health summary. */
export interface BusinessHealth {
  status: HealthStatus;
  reason: string;
}

export type DashboardPriorityType =
  | 'order_pending'
  | 'delivery_pending'
  | 'invoice_overdue'
  | 'stock_alert';

export type DashboardPriorityUrgency = 'high' | 'medium' | 'low';

export type DashboardPriorityEntity = 'order' | 'delivery' | 'invoice' | 'product';

/**
 * A "needs attention" item. The backend supplies the data; the
 * useBusinessDashboard hook attaches the navigation/action handlers.
 */
export interface DashboardPriorityItem {
  id: string;
  type: DashboardPriorityType;
  title: string;
  subtitle: string;
  timestamp: string;
  urgency: DashboardPriorityUrgency;
  entityType: DashboardPriorityEntity;
  entityId: string;
}

export interface BusinessDashboard {
  summary: DashboardSummary;
  health: BusinessHealth;
  priorityItems: DashboardPriorityItem[];
  recentActivity: ActivityItem[];
}

/**
 * Fetch the dashboard payload for a business (optionally scoped to one location).
 */
export async function getBusinessDashboard(
  companyId: string,
  opts?: { locationId?: string }
): Promise<BusinessDashboard> {
  return get<BusinessDashboard>(`/companies/${companyId}/dashboard`, {
    locationId: opts?.locationId,
  });
}

// ─── Business Overview (analytics block, Business+ only) ──────────────────────

export type OverviewRange = '7d' | '30d';

/** One day in the revenue trend. */
export interface RevenuePoint {
  date: string; // YYYY-MM-DD
  amount: number;
}

/** Orders grouped into the simplified home-screen buckets. */
export interface OrdersByStatus {
  New: number;
  Active: number;
  Pending: number;
  Completed: number;
  Canceled: number;
}

/** Outstanding cash situation for the period. */
export interface InvoiceCollection {
  paid: number;
  unpaid: number;
  overdue: number;
}

export interface BusinessOverview {
  range: OverviewRange;
  revenueTrend: RevenuePoint[];
  revenueTotal: number;
  ordersByStatus: OrdersByStatus;
  invoiceCollection: InvoiceCollection;
}

/**
 * Fetch the Business Overview analytics block. Business plan → 7d only;
 * Enterprise → 7d or 30d. Throws (403) if the plan has no analytics entitlement.
 */
export async function getBusinessOverview(
  companyId: string,
  opts?: { range?: OverviewRange; locationId?: string }
): Promise<BusinessOverview> {
  return get<BusinessOverview>(`/companies/${companyId}/dashboard/overview`, {
    range: opts?.range ?? '7d',
    locationId: opts?.locationId,
  });
}
