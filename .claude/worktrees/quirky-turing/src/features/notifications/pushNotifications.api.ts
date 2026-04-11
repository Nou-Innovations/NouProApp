import { get, patch } from '@/shared/services/api';

export interface NotificationPreferences {
  messages: boolean;
  deliveries: boolean;
  invoices: boolean;
  orders: boolean;
  team: boolean;
  system: boolean;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return get<NotificationPreferences>('/notification-preferences');
}

export async function updateNotificationPreferences(
  updates: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  return patch<NotificationPreferences>('/notification-preferences', updates);
}
