/**
 * Analytics + Variance service (Business+ only; enforced backend-side).
 * Company-scoped deep-dive on top of the Business Home overview block.
 */
import { get, put } from '@/shared/services/api';

export type AnalyticsRange = '7d' | '30d';

export interface RevenuePoint { date: string; amount: number; }
export interface OrdersByStatus { New: number; Active: number; Pending: number; Completed: number; Canceled: number; }
export interface LabelValue { label: string; value: number; }

export interface BusinessAnalytics {
  range: AnalyticsRange;
  revenueTrend: RevenuePoint[];
  revenueTotal: number;
  orderCount: number;
  avgOrderValue: number;
  ordersByStatus: OrdersByStatus;
  invoiceCollection: { paid: number; unpaid: number; overdue: number };
  collectionRate: number;
  topProducts: LabelValue[];
  topCustomers: LabelValue[];
}

export interface DeltaBlock { current: number; previous: number; changePct: number; }

export interface VarianceReport {
  period: string;
  budget: {
    period: string;
    revenueTarget: number | null;
    ordersTarget: number | null;
    actualRevenue: number;
    actualOrders: number;
    revenuePct: number | null;
    ordersPct: number | null;
  };
  periodOverPeriod: { revenue: DeltaBlock; orders: DeltaBlock; collected: DeltaBlock };
  margin: {
    revenue: number;
    costedRevenue: number;
    cogs: number;
    grossMargin: number;
    marginPct: number | null;
    listMargin: number;
    leakage: number;
  };
}

export interface BusinessTargetData {
  period: string;
  revenueTarget: number | null;
  ordersTarget: number | null;
}

export async function getBusinessAnalytics(
  companyId: string,
  opts?: { range?: AnalyticsRange; locationId?: string },
): Promise<BusinessAnalytics> {
  return get<BusinessAnalytics>(`/companies/${companyId}/analytics`, {
    range: opts?.range ?? '7d',
    locationId: opts?.locationId,
  });
}

export async function getVariance(
  companyId: string,
  opts?: { period?: string; locationId?: string },
): Promise<VarianceReport> {
  return get<VarianceReport>(`/companies/${companyId}/variance`, {
    period: opts?.period,
    locationId: opts?.locationId,
  });
}

export async function getTargets(companyId: string, period?: string): Promise<BusinessTargetData> {
  return get<BusinessTargetData>(`/companies/${companyId}/targets`, { period });
}

export async function saveTargets(
  companyId: string,
  data: { period: string; revenueTarget: number | null; ordersTarget: number | null },
): Promise<BusinessTargetData> {
  return put<BusinessTargetData>(`/companies/${companyId}/targets`, data);
}
