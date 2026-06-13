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
  | 'NOT_ASSIGNED'
  | 'ASSIGNED'
  | 'PACKED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELED';

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
  NOT_ASSIGNED: theme.colors.neutral,       // gray
  ASSIGNED: theme.colors.info,              // blue
  PACKED: theme.colors.statusInReview,      // purple
  OUT_FOR_DELIVERY: theme.colors.info,      // blue
  DELIVERED: theme.colors.success,          // green
  FAILED: theme.colors.error,               // red
  CANCELED: theme.colors.neutral,           // gray
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  NOT_ASSIGNED: 'Not assigned',
  ASSIGNED: 'Assigned',
  PACKED: 'Packed',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  CANCELED: 'Canceled',
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
  // Order linkage
  orderId?: string;
  createdAt?: string;
  updatedAt?: string;
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

export interface DeliveryFilters {
  status?: DeliveryStatus | 'all';
  locationId?: string;
  direction?: DeliveryDirection;
  type?: DeliveryType;
  assignedTo?: string;
  search?: string;
}

export type DeliveryViewType = 'all' | 'outgoing' | 'incoming' | 'transfers';

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
  new: ['NOT_ASSIGNED'],
  pending: ['ASSIGNED', 'PACKED'],
  in_transit: ['OUT_FOR_DELIVERY'],
  done: ['DELIVERED'],
  canceled: ['CANCELED', 'FAILED'],
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
}

