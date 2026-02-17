/**
 * Notifications Service
 *
 * Fetches and manages user notifications from the backend:
 * - Business mode: join requests, invoices, deliveries, stock, orders, subscription, connections
 * - Personal mode: invites received, join accepted, status changes, delivery assignments, connections
 */

import api from '@/shared/services/api';

export interface Notification {
  id: string;
  type:
    // Business mode
    | 'staff_request'
    | 'join_accepted'
    | 'invite_pending'
    | 'company_request'
    | 'connection_accepted'
    | 'invoice'
    | 'delivery'
    | 'stock_alert'
    | 'order_update'
    | 'subscription_due'
    // Personal mode
    | 'invite_received'
    | 'join_request_accepted'
    | 'status_change'
    | 'delivery_assigned'
    // Shared
    | 'message'
    | 'system'
    // Onboarding (frontend-only)
    | 'onboarding_create_business'
    | 'onboarding_join_company';
  title: string;
  description: string;
  time: string;
  timestamp: string;
  read: boolean;
  readAt?: string | null;
  avatar: string | null;
  status?: 'pending' | 'accepted' | 'declined';
  requestData?: {
    requestId?: string;
    inviteId?: string;
    connectionId?: string;
    orderId?: string;
    deliveryId?: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    email?: string;
    role?: string;
    currentRole?: string;
    businessId?: string;
    companyId?: string;
    companyName?: string;
    severity?: 'warning' | 'critical';
  };
  productData?: {
    productId?: string;
    productName?: string;
    currentStock?: number;
    locationId?: string;
  };
}

export type NotificationFilter =
  | 'all'
  | 'unread'
  | 'requests'
  | 'deliveries'
  | 'invoices'
  | 'orders'
  | 'connections'
  | 'jobs';

export type NotificationMode = 'business' | 'personal';

/**
 * Get notifications for a user, filtered by mode
 */
export async function getNotifications(
  userId: string,
  filter?: NotificationFilter,
  mode?: NotificationMode,
): Promise<Notification[]> {
  const params = new URLSearchParams();
  if (filter && filter !== 'all') params.append('filter', filter);
  if (mode) params.append('mode', mode);

  const query = params.toString();
  const response = await api.get(
    `/users/${userId}/notifications${query ? `?${query}` : ''}`,
  );
  return response.data.data.notifications;
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  await api.post(`/users/${userId}/notifications/${notificationId}/read`);
}

/**
 * Send a request to join a company (from company profile, for non-members in personal mode)
 */
export async function requestToJoinCompany(
  businessId: string,
  message?: string,
): Promise<void> {
  await api.post(`/companies/${businessId}/request-membership`, { message });
}

/**
 * Accept a personal connection request (personal mode company_request notification)
 */
export async function acceptConnectionRequest(connectionId: string): Promise<void> {
  await api.patch(`/connections/${connectionId}/accept`);
}

/**
 * Decline a personal connection request (personal mode company_request notification)
 */
export async function declineConnectionRequest(connectionId: string): Promise<void> {
  await api.patch(`/connections/${connectionId}/reject`);
}
