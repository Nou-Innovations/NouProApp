/**
 * Order Service
 * 
 * Business-scoped API calls for order management.
 * All endpoints require a companyId for proper scoping.
 */

import { get, post, patch } from '@/shared/services/api';
import type { Order, OrderWithItems, CreateOrderPayload, PaymentStatus, DeliveryStatus } from '@/shared/types/order';
import type { OrderStatus } from '@/shared/constants/orderStatus';
import type { Delivery } from '@/shared/types/delivery';

/** Shape returned by the transitions endpoint */
export interface OrderTransitions {
  currentStatus: string;
  currentMeta: { label: string; color: string };
  isFinal: boolean;
  transitions: { status: string; label: string; color: string }[];
}

/** Shape of a single status history entry */
export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  from: string;
  to: string;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

/**
 * Fetch orders for a business (seller view - orders placed TO this business)
 */
export async function fetchOrders(businessId: string, filters?: {
  status?: string;
  search?: string;
}): Promise<Order[]> {
  return get<Order[]>(`/companies/${businessId}/orders`, filters as Record<string, string>);
}

/**
 * Fetch orders placed BY this business to other businesses (buyer view)
 */
export async function fetchPlacedOrders(businessId: string, filters?: {
  status?: string;
  search?: string;
}): Promise<Order[]> {
  return get<Order[]>(`/companies/${businessId}/placed-orders`, filters as Record<string, string>);
}

/**
 * Get a single order by ID
 */
export async function fetchOrder(businessId: string, orderId: string): Promise<Order> {
  return get<Order>(`/companies/${businessId}/orders/${orderId}`);
}

/**
 * Create a new order (B2B or B2C)
 * For B2B: businessId is the SELLER, payload includes buyerBusinessId
 */
export async function createOrder(
  sellerBusinessId: string,
  payload: Omit<CreateOrderPayload, 'businessId'>
): Promise<Order> {
  return post<Order>(`/companies/${sellerBusinessId}/orders`, payload);
}

/** Item shape sent when placing a public storefront order */
export interface PublicOrderItemInput {
  productId: string;
  quantity: number;
}

/** Payload for placing an order from a business's public storefront */
export interface CreatePublicOrderPayload {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: PublicOrderItemInput[];
  notes?: string;
}

/**
 * Place an order from a business's public storefront (location-scoped).
 * No business membership required — used by personal-mode customers viewing a
 * business's public page. Prices and totals are computed server-side.
 */
export async function createPublicOrder(
  locationId: string,
  payload: CreatePublicOrderPayload,
): Promise<Order> {
  return post<Order>(`/public/locations/${locationId}/orders`, payload);
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  businessId: string,
  orderId: string,
  status: OrderStatus,
  reason?: string
): Promise<Order> {
  return patch<Order>(`/companies/${businessId}/orders/${orderId}/status`, { status, reason });
}

/**
 * Update order payment status
 */
export async function updateOrderPaymentStatus(
  businessId: string,
  orderId: string,
  paymentStatus: PaymentStatus
): Promise<Order> {
  return patch<Order>(`/companies/${businessId}/orders/${orderId}`, { paymentStatus });
}

/**
 * Update order delivery status
 */
export async function updateOrderDeliveryStatus(
  businessId: string,
  orderId: string,
  deliveryStatus: DeliveryStatus
): Promise<Order> {
  return patch<Order>(`/companies/${businessId}/orders/${orderId}/delivery-status`, { deliveryStatus });
}

/**
 * Assign order to a location for fulfillment
 */
export async function assignOrder(
  businessId: string,
  orderId: string,
  fulfillmentLocationId: string,
): Promise<Order> {
  return post<Order>(`/companies/${businessId}/orders/${orderId}/assign`, {
    fulfillmentLocationId,
  });
}

/**
 * Create a delivery record linked to an order
 * Called after confirming a B2B order
 */
export async function createDeliveryFromOrder(
  businessId: string,
  orderId: string,
  expectedDeliveryDateTime?: string
): Promise<Delivery> {
  return post<Delivery>(`/companies/${businessId}/orders/${orderId}/create-delivery`, {
    expectedDeliveryDateTime,
  });
}

/**
 * Confirm a B2B order: set status to ACCEPTED and create a delivery
 */
export async function confirmOrder(
  sellerBusinessId: string,
  orderId: string
): Promise<{ order: Order; delivery: Delivery | null }> {
  // Step 1: Accept the order
  const order = await updateOrderStatus(sellerBusinessId, orderId, 'ACCEPTED');
  
  // Step 2: Create a delivery linked to the order
  let delivery: Delivery | null = null;
  try {
    delivery = await createDeliveryFromOrder(sellerBusinessId, orderId);
  } catch (err) {
    console.warn('Delivery creation failed (may already exist):', err);
  }
  
  return { order, delivery };
}

/**
 * Decline a B2B order: set status to REJECTED
 */
export async function declineOrder(
  sellerBusinessId: string,
  orderId: string,
  reason: string
): Promise<Order> {
  return updateOrderStatus(sellerBusinessId, orderId, 'REJECTED', reason);
}

/**
 * Get valid status transitions for an order
 */
export async function getOrderTransitions(
  businessId: string,
  orderId: string
): Promise<OrderTransitions> {
  return get<OrderTransitions>(`/companies/${businessId}/orders/${orderId}/transitions`);
}

/**
 * Get order status history
 */
export async function getOrderHistory(
  businessId: string,
  orderId: string
): Promise<OrderStatusHistoryEntry[]> {
  return get<OrderStatusHistoryEntry[]>(`/companies/${businessId}/orders/${orderId}/history`);
}
