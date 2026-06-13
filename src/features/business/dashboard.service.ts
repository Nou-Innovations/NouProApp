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
  openTasks: number;
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
