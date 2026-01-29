/**
 * Notifications Service
 * 
 * Fetches and manages user notifications from the backend including:
 * - Join requests (team members requesting to join business)
 * - Pending invites (invitations sent by business)
 * - Invoice notifications (payments received)
 * - Delivery notifications (completed deliveries)
 * - System notifications
 */

import api from '@/shared/services/api';

export interface Notification {
  id: string;
  type: 'message' | 'delivery' | 'invoice' | 'system' | 
        'staff_request' | 'company_request' | 'connection_accepted' | 
        'join_accepted' | 'invite_pending' | 
        'onboarding_create_business' | 'onboarding_join_company';
  title: string;
  description: string;
  time: string; // Relative time string (e.g., "5 min ago")
  timestamp: string; // ISO timestamp
  read: boolean;
  avatar: string | null;
  status?: 'pending' | 'accepted' | 'declined';
  requestData?: {
    requestId?: string;
    inviteId?: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    email?: string;
    role?: string;
    businessId?: string;
    companyId?: string;
    companyName?: string;
  };
}

export type NotificationFilter = 'all' | 'unread' | 'requests';

/**
 * Get notifications for a user
 * Aggregates notifications from multiple sources (team, invoices, deliveries)
 */
export async function getNotifications(
  userId: string,
  filter?: NotificationFilter
): Promise<Notification[]> {
  const params = new URLSearchParams();
  if (filter && filter !== 'all') params.append('filter', filter);
  
  const response = await api.get(
    `/users/${userId}/notifications?${params}`
  );
  return response.data.data.notifications;
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<void> {
  await api.post(
    `/users/${userId}/notifications/${notificationId}/read`
  );
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(
  userId: string
): Promise<void> {
  // This would need a backend endpoint: POST /api/users/:userId/notifications/mark-all-read
  // For now, we don't implement this
  console.log('Mark all as read not implemented yet');
}
