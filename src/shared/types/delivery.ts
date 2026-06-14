/**
 * Delivery Types
 * 
 * Types for the delivery/order fulfillment API and components.
 * These match the mockDeliveries structure and backend response shapes.
 */

import { theme } from '@/shared/theme';

// ============================================================================
// Status Enums
// ============================================================================

/**
 * Delivery status enum (matches Prisma DeliveryStatus)
 * Used for tracking order fulfillment logistics
 */
export type DeliveryStatus =
  | 'Draft'
  | 'Scheduled'
  | 'Ready'
  | 'InTransit'
  | 'Delivered'
  | 'Issue'
  | 'Canceled';

/**
 * PaymentStatus, PAYMENT_STATUS_COLORS, and PAYMENT_STATUS_LABELS are
 * re-exported from order.ts to ensure a single source of truth.
 */
export { PaymentStatus, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from './order';

export type ItemStatus = 'Available' | 'In Stock' | 'Out of Stock' | 'In Production' | 'Discontinued';

export type DeliveryType = 'delivery' | 'transfer';

export type DeliveryDirection = 'incoming' | 'outgoing';

// ============================================================================
// Status Colors & Labels
// ============================================================================

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  Draft: theme.colors.neutral,          // gray
  Scheduled: theme.colors.info,         // blue
  Ready: theme.colors.statusInReview,   // purple
  InTransit: theme.colors.info,         // blue
  Delivered: theme.colors.success,      // green
  Issue: theme.colors.error,            // red
  Canceled: theme.colors.neutral,       // gray
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  Draft: 'Draft',
  Scheduled: 'Scheduled',
  Ready: 'Ready',
  InTransit: 'In transit',
  Delivered: 'Delivered',
  Issue: 'Issue',
  Canceled: 'Canceled',
};

// ============================================================================
// Data Models
// ============================================================================

export interface DeliveryItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  quantityOrdered: number;
  isLoaded: boolean;
  status: ItemStatus;
  warehouseStock?: Record<string, number>;
}

/**
 * NOTE: `businessId` matches the Prisma column name returned by the API.
 * API routes use `/companies/:companyId/deliveries` but the response body field
 * remains `businessId` because Prisma returns it as such.
 */
export interface Delivery {
  id: string;
  businessId?: string;
  type?: DeliveryType;
  direction?: DeliveryDirection;
  locationId?: string;
  clientId?: string;
  clientCompanyLogo?: string;
  clientCompanyName?: string | null;
  clientAddress?: string | null;
  clientEmail?: string;
  clientPhone?: string;
  clientNotes?: string;
  distributorName?: string | null;
  distributorNotes?: string;
  orderTime?: string | null;
  expectedDeliveryDateTime?: string | null;
  itemCount?: number | null;
  items?: DeliveryItem[];
  totalAmount?: number;
  trackingNumber?: string;
  deliveryStatus?: DeliveryStatus | null;
  paymentStatus?: PaymentStatus | null;
  assignedStaffId?: string;
  assignedTo?: string;
  staffAssignments?: DeliveryStaffAssignment[];
  transportMode?: string;
  // For transfers - location information
  fromLocation?: string;
  toLocation?: string;
  fromLocationId?: string;
  toLocationId?: string;
  // Proof of delivery + SLA (set when marked DELIVERED)
  podPhotoUrl?: string | null;
  podSignatureUrl?: string | null;
  deliveredAt?: string | null;
  deliveredBy?: string | null;
  // Transfer stock-move idempotency guard (set once stock has been applied)
  stockAppliedAt?: string | null;
  // Order linkage
  orderId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * A single entry in a delivery's status-change audit trail.
 * Matches the backend DeliveryStatusHistory model.
 */
export interface DeliveryStatusHistoryEntry {
  id: string;
  deliveryId: string;
  from?: DeliveryStatus | null;
  to: DeliveryStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export type DeliveryStaffRole = 'driver' | 'teamLeader' | 'support';

export interface DeliveryStaffAssignment {
  id: string;
  deliveryId: string;
  userId: string;
  role: DeliveryStaffRole;
  assignedBy?: string;
  assignedAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface TransportMode {
  id: string;
  name: string;
  icon: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface DeliveriesResponse {
  success: boolean;
  data: Delivery[];
  message: string;
}

export interface DeliveryResponse {
  success: boolean;
  data: Delivery;
  message: string;
}

// ============================================================================
// Analytics
// ============================================================================

export interface DeliveryStatusBreakdownEntry {
  status: DeliveryStatus;
  count: number;
}

export interface DeliveryWeeklyTrendPoint {
  weekStart: string;
  created: number;
  delivered: number;
}

export interface DeliveryDriverBreakdown {
  userId: string;
  name: string;
  delivered: number;
  onTimeRate: number;
}

export interface DeliveryLocationBreakdown {
  locationId: string | null;
  name: string;
  total: number;
}

export interface DeliveriesAnalytics {
  range: { from: string; to: string };
  summary: {
    total: number;
    delivered: number;
    active: number;
    failed: number;
    canceled: number;
    onTimeRate: number;
    avgDeliveryHours: number;
    lateActiveCount: number;
  };
  statusBreakdown: DeliveryStatusBreakdownEntry[];
  weeklyTrend: DeliveryWeeklyTrendPoint[];
  perDriver: DeliveryDriverBreakdown[];
  perLocation: DeliveryLocationBreakdown[];
}

export interface DeliveryFilters {
  status?: DeliveryStatus | 'all';
  locationId?: string;
  direction?: DeliveryDirection;
  type?: DeliveryType;
  assignedTo?: string;
  search?: string;
}

export type DeliveryViewType = 'all' | 'needs_attention' | 'outgoing' | 'incoming' | 'transfers';

/**
 * Grouped delivery filter tabs for the UI.
 * Each tab maps to one or more DeliveryStatus values:
 *  - all: no status filter
 *  - new: NOT_ASSIGNED
 *  - pending: ASSIGNED, PACKED
 *  - outgoing: OUT_FOR_DELIVERY
 *  - done: DELIVERED
 *  - canceled: CANCELED, FAILED
 */
export type DeliveryFilterTab = 'all' | 'new' | 'pending' | 'in_transit' | 'done' | 'canceled';

/** Maps each filter tab to the DeliveryStatus values it includes */
export const DELIVERY_FILTER_TAB_STATUSES: Record<Exclude<DeliveryFilterTab, 'all'>, DeliveryStatus[]> = {
  new: ['Draft'],
  pending: ['Scheduled', 'Ready'],
  in_transit: ['InTransit'],
  done: ['Delivered'],
  canceled: ['Canceled', 'Issue'],
};

export interface CreateDeliveryData {
  type: DeliveryType;
  direction: DeliveryDirection;
  locationId?: string;
  clientCompanyName?: string;
  clientAddress?: string;
  clientId?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientNotes?: string;
  expectedDeliveryDateTime: string;
  items: Omit<DeliveryItem, 'id' | 'isLoaded'>[];
  totalAmount?: number;
  itemCount?: number;
  transportMode?: string;
  assignedStaffId?: string;
  assignedTo?: string;
  staffAssignments?: { userId: string; role?: DeliveryStaffRole }[];
  // Transfer-specific
  fromLocation?: string;
  toLocation?: string;
  fromLocationId?: string;
  toLocationId?: string;
  orderId?: string;
}

export interface UpdateDeliveryData {
  deliveryStatus?: DeliveryStatus;
  paymentStatus?: PaymentStatus;
  assignedStaffId?: string;
  assignedTo?: string;
  transportMode?: string;
  distributorNotes?: string;
  clientNotes?: string;
  trackingNumber?: string;
  expectedDeliveryDateTime?: string;
  items?: DeliveryItem[];
  // Proof of delivery (sent alongside a DELIVERED status change)
  podPhotoUrl?: string | null;
  podSignatureUrl?: string | null;
  statusReason?: string;
  // Transfer destination/source location FKs
  fromLocationId?: string;
  toLocationId?: string;
}

