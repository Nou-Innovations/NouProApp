/**
 * Delivery Types
 * 
 * Types for the delivery/order fulfillment API and components.
 * These match the mockDeliveries structure and backend response shapes.
 */

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

export type PaymentStatus = 'Paid' | 'Unpaid' | 'Pending Confirmation';

export type ItemStatus = 'Available' | 'In Stock' | 'Out of Stock' | 'In Production' | 'Discontinued';

export type DeliveryType = 'delivery' | 'transfer';

export type DeliveryDirection = 'incoming' | 'outgoing';

// ============================================================================
// Status Colors & Labels
// ============================================================================

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  NOT_ASSIGNED: '#6B7280',     // gray
  ASSIGNED: '#1E40AF',         // dark blue
  PACKED: '#5B21B6',           // purple
  OUT_FOR_DELIVERY: '#0075FF', // blue
  DELIVERED: '#065F46',        // dark green
  FAILED: '#FF2400',           // red
  CANCELED: '#6B7280',         // gray
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

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  Paid: '#2ACF01',
  Unpaid: '#FF2400',
  'Pending Confirmation': '#FFB600',
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

export interface Delivery {
  id: string;
  businessId?: string;
  type?: DeliveryType;
  direction?: DeliveryDirection;
  locationId?: string;
  clientId?: string;
  clientCompanyLogo?: string;
  clientCompanyName: string;
  clientAddress: string;
  clientEmail?: string;
  clientPhone?: string;
  clientNotes?: string;
  distributorNotes?: string;
  orderTime: string;
  expectedDeliveryDateTime: string;
  itemCount: number;
  items?: DeliveryItem[];
  totalAmount?: number;
  trackingNumber?: string;
  deliveryStatus: DeliveryStatus;
  paymentStatus: PaymentStatus;
  assignedStaffId?: string;
  assignedTo?: string;
  transportMode?: string;
  // For transfers - location information
  fromLocation?: string;
  toLocation?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  avatar?: string;
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

export interface CreateDeliveryData {
  clientCompanyName: string;
  clientAddress: string;
  clientEmail?: string;
  clientPhone?: string;
  clientNotes?: string;
  expectedDeliveryDateTime: string;
  items: Omit<DeliveryItem, 'id' | 'isLoaded'>[];
  transportMode?: string;
  assignedStaffId?: string;
}

export interface UpdateDeliveryData {
  deliveryStatus?: DeliveryStatus;
  paymentStatus?: PaymentStatus;
  assignedStaffId?: string;
  transportMode?: string;
  distributorNotes?: string;
  trackingNumber?: string;
}

