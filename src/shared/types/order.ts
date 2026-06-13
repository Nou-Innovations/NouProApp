/**
 * Order Types
 * Based on app-logic.json dataModels.order, dataModels.orderItem, dataModels.delivery
 */

/**
 * Order status type
 * Re-exported from constants for convenience
 */
import type { OrderStatus as OrderStatusType } from '@/shared/constants/orderStatus';
import { theme } from '@/shared/theme';

export type { OrderStatus } from '@/shared/constants/orderStatus';
export { 
  ORDER_STATUS_META,
  ORDER_STATUS_TONE,
  ORDER_STATUSES,
  ALLOWED_TRANSITIONS,
  getStatusLabel,
  statusRequiresReason,
  canEditOrder,
  isFinalStatus,
  sortByStatusRank,
  sortOrdersByStatusAndDate,
  getValidTransitions,
  isValidTransition,
  getTransitionsWithMeta,
  STATUSES_REQUIRING_REASON,
  FINAL_STATUSES,
  ACTIVE_STATUSES,
} from '@/shared/constants/orderStatus';

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
 * Delivery status colors for UI
 */
export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  NOT_ASSIGNED: theme.colors.neutral,       // gray
  ASSIGNED: theme.colors.info,              // blue
  PACKED: theme.colors.statusInReview,      // purple
  OUT_FOR_DELIVERY: theme.colors.info,      // blue
  DELIVERED: theme.colors.success,          // green
  FAILED: theme.colors.error,               // red
  CANCELED: theme.colors.neutral,           // gray
};

/**
 * Delivery status labels for display
 */
export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  NOT_ASSIGNED: 'Not assigned',
  ASSIGNED: 'Assigned',
  PACKED: 'Packed',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  CANCELED: 'Canceled',
};

/**
 * Payment status enum (matches Prisma PaymentStatus)
 * Used for tracking order payment state
 */
export type PaymentStatus =
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'PAYMENT_PENDING'
  | 'PENDING_CONFIRMATION'
  | 'PROCESSING'
  | 'OVERDUE'
  | 'DUE_TODAY'
  | 'FAILED'
  | 'CANCELED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'DISPUTED';

/**
 * Payment status colors for UI
 */
export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  UNPAID: theme.colors.neutral,              // gray
  PARTIALLY_PAID: theme.colors.warning,      // amber
  PAID: theme.colors.success,                // green
  PAYMENT_PENDING: theme.colors.info,        // blue
  PENDING_CONFIRMATION: theme.colors.statusInReview, // purple
  PROCESSING: theme.colors.info,             // sky blue
  OVERDUE: theme.colors.error,               // red
  DUE_TODAY: theme.colors.warning,           // orange
  FAILED: theme.colors.error,                // red
  CANCELED: theme.colors.neutral,            // gray
  REFUNDED: theme.colors.success,            // emerald
  PARTIALLY_REFUNDED: theme.colors.info,     // teal
  DISPUTED: theme.colors.error,              // red
};

/**
 * Payment status labels for display
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: 'Unpaid',
  PARTIALLY_PAID: 'Partially paid',
  PAID: 'Paid',
  PAYMENT_PENDING: 'Payment pending',
  PENDING_CONFIRMATION: 'Pending confirmation',
  PROCESSING: 'Processing',
  OVERDUE: 'Overdue',
  DUE_TODAY: 'Due today',
  FAILED: 'Payment failed',
  CANCELED: 'Canceled',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partially refunded',
  DISPUTED: 'Disputed',
};

/**
 * Order - Business orders (B2C and B2B)
 * B2C: businessId is the seller, customerId/customerName is the buyer
 * B2B: businessId is the seller, buyerBusinessId is the buying business
 *
 * NOTE: `businessId` here matches the Prisma column name returned by the API.
 * API routes use `/companies/:companyId/orders` but the response body field
 * remains `businessId` because Prisma returns it as such.
 */
export interface Order {
  id: string;
  businessId: string;
  soldByScope?: 'PARENT' | 'LOCATION';
  soldByLocationId?: string;
  fulfillmentLocationId?: string;
  customerId?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  // B2B ordering fields
  buyerBusinessId?: string;
  buyerBusinessName?: string;
  /** Seller's business name — populated on placed (outgoing) orders so the buyer can label them */
  sellerBusinessName?: string;
  createdBy?: string;
  items: OrderItem[];
  totalAmount?: number;
  status: OrderStatusType;
  paymentStatus?: PaymentStatus;
  deliveryStatus?: DeliveryStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  
  // Status tracking fields
  statusChangedAt?: string;
  statusChangedBy?: string;
  statusReason?: string;
  lastActivityAt?: string;
}

/**
 * Order Item - Line items in an order
 * Normalized to camelCase
 */
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/**
 * Order with items
 */
export interface OrderWithItems extends Order {
  items: OrderItem[];
}

/**
 * OrderDelivery - Lightweight delivery reference on orders
 * Use Delivery from delivery.ts for the full delivery type
 */
export interface OrderDelivery {
  id: string;
  orderId: string;
  order?: Order;
  assignedTo?: string;
  assignedToName?: string;
  status: DeliveryStatus;
  deliveryAddress?: string;
  deliveryNotes?: string;
  proofPhotoUrl?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * OrderDelivery with order details
 */
export interface OrderDeliveryWithOrder extends OrderDelivery {
  order: OrderWithItems;
}

/**
 * Create order payload
 * Normalized to camelCase
 */
export interface CreateOrderPayload {
  businessId: string;
  soldByLocationId?: string;
  fulfillmentLocationId?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  // B2B fields
  buyerBusinessId?: string;
  buyerBusinessName?: string;
  createdBy?: string;
  items: {
    productId: string;
    productName?: string;
    quantity: number;
    unitPrice: number;
    subtotal?: number;
  }[];
  totalAmount?: number;
  notes?: string;
}

/**
 * Create delivery payload from order
 * Normalized to camelCase
 */
export interface CreateOrderDeliveryPayload {
  orderId: string;
  assignedTo?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
}

/**
 * Update delivery payload from order context
 * Normalized to camelCase
 */
export interface UpdateOrderDeliveryPayload {
  assignedTo?: string;
  status?: DeliveryStatus;
  deliveryNotes?: string;
  proofPhotoUrl?: string;
}

/**
 * Cart item for B2B ordering
 * Normalized to camelCase
 */
export interface CartItem {
  productId: string;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    unit?: string;
  };
  quantity: number;
}

/**
 * Cart state for a specific business
 * Normalized to camelCase
 */
export interface BusinessCart {
  businessId: string;
  businessName: string;
  items: CartItem[];
  total: number;
}






