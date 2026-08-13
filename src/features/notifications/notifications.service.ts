/**
 * Notifications Service
 *
 * Fetches and manages user notifications from the backend:
 * - Business mode: join requests, invoices, deliveries, stock, orders, subscription, connections
 * - Personal mode: invites received, join accepted, status changes, delivery assignments, connections
 */

import api from '@/shared/services/api';
import { maybePromptForPush } from '@/shared/services/pushNotifications';

export interface Notification {
  id: string;
  type:
    // Business mode
    | 'staff_request'
    | 'join_accepted'
    | 'invite_pending'
    | 'company_request'
    | 'connection_accepted'
    | 'connection_declined'
    | 'welcome'
    | 'invoice'
    | 'delivery'
    | 'stock_alert'
    | 'order_update'
    | 'subscription_due'
    // Personal mode
    | 'invite_received'
    | 'join_request_accepted'
    | 'join_request_rejected'
    | 'status_change'
    | 'delivery_assigned'
    // Shared
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
    /**
     * Which relationship a `company_request` refers to. The type string covers both a
     * BusinessConnection and a UserConnection, which have different accept/decline
     * endpoints; this says which outright instead of leaving the client to guess from
     * whether `companyId` is present (C-10). Optional because notifications served by
     * an older backend won't carry it.
     */
    connectionKind?: 'user' | 'business';
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
export interface NotificationPage {
  notifications: Notification[];
  /** Unread across the WHOLE filtered set, not just this page — the badge reads this. */
  unreadCount: number;
  total: number;
  hasMore: boolean;
}

/**
 * Get notifications for a user, filtered by mode.
 *
 * Pagination is opt-in: pass `limit` and the server slices, omit it and you get the
 * full (capped) list exactly as before. Older app builds send neither, which is why
 * the server keeps that path — the backend deploys on push while the app ships via
 * EAS, so installed builds must keep working unchanged (N-12).
 */
export async function getNotificationPage(
  userId: string,
  opts: {
    filter?: NotificationFilter;
    mode?: NotificationMode;
    limit?: number;
    offset?: number;
  } = {},
): Promise<NotificationPage> {
  const params = new URLSearchParams();
  if (opts.filter && opts.filter !== 'all') params.append('filter', opts.filter);
  if (opts.mode) params.append('mode', opts.mode);
  if (opts.limit !== undefined) params.append('limit', String(opts.limit));
  if (opts.offset !== undefined) params.append('offset', String(opts.offset));

  const query = params.toString();
  const response = await api.get(
    `/users/${userId}/notifications${query ? `?${query}` : ''}`,
  );
  const body = response.data.data;
  const notifications: Notification[] = body?.notifications ?? [];
  return {
    notifications,
    // Fall back to counting when the server predates the field, so the badge is never
    // worse than it was.
    unreadCount: body?.unreadCount ?? notifications.filter((n) => !n.read).length,
    total: body?.total ?? notifications.length,
    hasMore: Boolean(body?.hasMore),
  };
}

/** Unpaginated convenience wrapper, unchanged for existing callers. */
export async function getNotifications(
  userId: string,
  filter?: NotificationFilter,
  mode?: NotificationMode,
): Promise<Notification[]> {
  const { notifications } = await getNotificationPage(userId, { filter, mode });
  return notifications;
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
  // First time this obviously matters — ask for push permission if we never have.
  // No-ops when already asked; never blocks or fails the action (N-10).
  maybePromptForPush();
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
