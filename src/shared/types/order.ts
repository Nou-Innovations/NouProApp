/**
 * Order Types
 * Based on app-logic.json dataModels.order, dataModels.orderItem, dataModels.delivery
 */

/**
 * Order status enum
 * Based on app-logic.json statusEnums.orderStatus
 */
export type OrderStatus = 'pending' | 'accepted' | 'completed' | 'cancelled';

/**
 * Order status colors for UI
 */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#F59E0B',
  accepted: '#0EA5E9',
  completed: '#22C55E',
  cancelled: '#6B7280',
};

/**
 * Order status labels for display
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/**
 * Delivery status enum
 * Based on app-logic.json statusEnums.deliveryStatus
 */
export type DeliveryStatus = 'pending' | 'on_the_way' | 'done';

/**
 * Delivery status colors for UI
 */
export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: '#F59E0B',
  on_the_way: '#0EA5E9',
  done: '#22C55E',
};

/**
 * Delivery status labels for display
 */
export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pending',
  on_the_way: 'On the Way',
  done: 'Delivered',
};

/**
 * Order - B2B orders between businesses
 * Based on app-logic.json dataModels.order
 */
export interface Order {
  id: string; // UUID
  from_business_id: string; // Business placing the order
  to_business_id: string; // Business receiving the order
  from_business_name?: string; // For display
  to_business_name?: string; // For display
  status: OrderStatus;
  total_price: number; // Snapshot at order time
  notes?: string;
  created_by: string; // FK to User who created the order
  created_at: string;
  updated_at?: string;
}

/**
 * Order Item - Line items in an order
 * Based on app-logic.json dataModels.orderItem
 */
export interface OrderItem {
  id: string; // UUID
  order_id: string; // FK to Order
  product_id: string; // FK to Product
  product_name?: string; // Snapshot at order time
  quantity: number;
  unit_price: number; // Captured at time of ordering
  subtotal: number; // Computed: quantity × unit_price
}

/**
 * Order with items
 */
export interface OrderWithItems extends Order {
  items: OrderItem[];
}

/**
 * Delivery - Delivery assignments for orders
 * Based on app-logic.json dataModels.delivery
 */
export interface Delivery {
  id: string; // UUID
  order_id: string; // FK to Order
  order?: Order; // Optional expanded order
  assigned_to?: string; // FK to User (delivery staff)
  assigned_to_name?: string; // For display
  status: DeliveryStatus;
  delivery_address?: string;
  delivery_notes?: string;
  proof_photo_url?: string; // Optional proof of delivery
  completed_at?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Delivery with order details
 */
export interface DeliveryWithOrder extends Delivery {
  order: OrderWithItems;
}

/**
 * Create order payload
 */
export interface CreateOrderPayload {
  from_business_id: string;
  to_business_id: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
  }[];
  notes?: string;
}

/**
 * Create delivery payload
 */
export interface CreateDeliveryPayload {
  order_id: string;
  assigned_to?: string;
  delivery_address?: string;
  delivery_notes?: string;
}

/**
 * Update delivery payload
 */
export interface UpdateDeliveryPayload {
  assigned_to?: string;
  status?: DeliveryStatus;
  delivery_notes?: string;
  proof_photo_url?: string;
}

/**
 * Cart item for B2B ordering
 */
export interface CartItem {
  product_id: string;
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    unit?: string;
  };
  quantity: number;
}

/**
 * Cart state for a specific business
 */
export interface BusinessCart {
  business_id: string;
  business_name: string;
  items: CartItem[];
  total: number;
}






