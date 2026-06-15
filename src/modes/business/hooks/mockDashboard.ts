/**
 * Mock / preview data for the Business Home command center.
 *
 * Used as an AUTOMATIC fallback while the backend that serves the new
 * /dashboard fields (salesToday, health, …) and the /dashboard/overview
 * endpoint is not yet deployed — so the redesigned screen can be previewed with
 * realistic numbers instead of "Rs NaN" / "undefined" / "Couldn't load
 * analytics".
 *
 * Self-healing: the hooks only use this when the live backend does NOT return
 * the new fields. Once the backend is deployed (it returns `summary.salesToday`)
 * the screen switches to real data automatically — no code change needed.
 *
 * To turn the preview off entirely, set USE_MOCK_DASHBOARD_FALLBACK to false.
 */

import type {
  BusinessDashboard,
  BusinessOverview,
  OverviewRange,
  RevenuePoint,
} from '@/features/business';

export const USE_MOCK_DASHBOARD_FALLBACK = true;

const minsAgo = (n: number): string => new Date(Date.now() - n * 60_000).toISOString();
const hoursAgo = (n: number): string => new Date(Date.now() - n * 3_600_000).toISOString();

export const MOCK_DASHBOARD: BusinessDashboard = {
  summary: {
    newOrders: 4,
    pendingDeliveries: 6,
    unpaidInvoices: 7,
    unpaidInvoiceAmount: 42500,
    openTasks: 3,
    salesToday: 18400,
    salesYesterday: 16430,
    activeOrders: 16,
    deliveriesToday: 9,
    deliveriesInTransit: 5,
    overdueInvoiceCount: 3,
    lowStockCount: 8,
    outOfStockCount: 0,
  },
  health: {
    status: 'attention',
    reason: '3 invoices overdue and 8 products low in stock.',
  },
  priorityItems: [
    {
      id: 'mock-inv-1',
      type: 'invoice_overdue',
      title: 'Invoice INV-1042',
      subtitle: 'Jumbo Market · Rs 12,500',
      timestamp: hoursAgo(30),
      urgency: 'high',
      entityType: 'invoice',
      entityId: 'mock-inv-1',
    },
    {
      id: 'mock-ord-1',
      type: 'order_pending',
      title: 'Order #1087',
      subtitle: 'Freshmart · Rs 8,200',
      timestamp: hoursAgo(2),
      urgency: 'medium',
      entityType: 'order',
      entityId: 'mock-ord-1',
    },
    {
      id: 'mock-stock-1',
      type: 'stock_alert',
      title: 'Vanilla Cup 125ml',
      subtitle: '4 left',
      timestamp: hoursAgo(1),
      urgency: 'medium',
      entityType: 'product',
      entityId: 'mock-stock-1',
    },
  ],
  recentActivity: [
    {
      id: 'mock-a1',
      type: 'invoice_sent',
      title: 'Invoice paid',
      description: 'Jumbo Market paid Rs 12,500',
      timestamp: minsAgo(10),
      entityId: 'mock-a1',
      entityType: 'invoice',
    },
    {
      id: 'mock-a2',
      type: 'delivery_completed',
      title: 'Delivery completed',
      description: 'Delivery to Rose Hill marked as done',
      timestamp: hoursAgo(1),
      entityId: 'mock-a2',
      entityType: 'delivery',
    },
    {
      id: 'mock-a3',
      type: 'order_created',
      title: 'New order received',
      description: 'ABC Store placed a new order',
      timestamp: hoursAgo(3),
      entityId: 'mock-a3',
      entityType: 'order',
    },
    {
      id: 'mock-a4',
      type: 'product_added',
      title: 'Low stock',
      description: 'Choco Cone is low in stock (7 left)',
      timestamp: hoursAgo(5),
      entityId: 'mock-a4',
      entityType: 'product',
    },
  ],
};

const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const isoDaysAgo = (n: number): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return dayKey(d);
};

const WEEK_REVENUE = [14000, 18000, 21000, 16000, 27000, 30000, 22000];

/** Build a realistic overview for the selected range (preview only). */
export function buildMockOverview(range: OverviewRange): BusinessOverview {
  const days = range === '30d' ? 30 : 7;
  const revenueTrend: RevenuePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const idx = days - 1 - i;
    const amount =
      days === 7
        ? WEEK_REVENUE[idx]
        : Math.round(11000 + ((idx * 4663) % 22000)); // deterministic spread for 30d
    revenueTrend.push({ date: isoDaysAgo(i), amount });
  }
  const revenueTotal = revenueTrend.reduce((sum, p) => sum + p.amount, 0);
  const scale = days === 30 ? 4 : 1;

  return {
    range,
    revenueTrend,
    revenueTotal,
    ordersByStatus: {
      New: 4 * scale,
      Active: 11 * scale,
      Pending: 2 * scale,
      Completed: 19 * scale,
      Canceled: 1 * scale,
    },
    invoiceCollection: {
      paid: 88000 * scale,
      unpaid: 42500,
      overdue: 12000,
    },
  };
}
