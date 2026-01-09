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
 * Normalized delivery status values
 * - 'new': Just received, not yet processed
 * - 'pending': Acknowledged, awaiting pickup/dispatch
 * - 'ongoing': In transit
 * - 'delivered': Completed successfully
 * - 'canceled': Canceled by either party
 */
export type DeliveryStatus = 'new' | 'pending' | 'ongoing' | 'delivered' | 'canceled';

export type PaymentStatus = 'Paid' | 'Unpaid' | 'Pending Confirmation';

export type ItemStatus = 'Available' | 'In Stock' | 'Out of Stock' | 'In Production' | 'Discontinued';

export type DeliveryType = 'delivery' | 'transfer';

export type DeliveryDirection = 'incoming' | 'outgoing';

// ============================================================================
// Status Colors & Labels
// ============================================================================

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  new: '#6E0000',
  pending: '#FFB600',
  ongoing: '#0075FF',
  delivered: '#2ACF01',
  canceled: '#A4AAB8',
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  new: 'New',
  pending: 'Pending',
  ongoing: 'Ongoing',
  delivered: 'Delivered',
  canceled: 'Canceled',
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
  companyId?: string;
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

