/**
 * Activity Feed Service
 * 
 * Fetches aggregated business activities from the backend including:
 * - Recent invoices
 * - Recent deliveries
 * - Recent orders
 * - Product additions
 */

import api from '@/shared/services/api';

export interface ActivityItem {
  id: string;
  type: 'invoice_sent' | 'delivery_completed' | 'delivery_started' | 
        'delivery_pending' | 'delivery_canceled' | 'order_created' | 'product_added';
  title: string;
  description: string;
  timestamp: string;
  entityId: string;
  entityType: 'invoice' | 'delivery' | 'order' | 'product';
  metadata?: Record<string, any>;
}

export interface ActivityFeedOptions {
  locationId?: string;
  limit?: number;
}

/**
 * Get activity feed for a business
 * Aggregates recent activities from invoices, deliveries, and orders
 */
export async function getActivityFeed(
  companyId: string,
  options?: ActivityFeedOptions
): Promise<ActivityItem[]> {
  const params = new URLSearchParams();
  if (options?.locationId) params.append('locationId', options.locationId);
  if (options?.limit) params.append('limit', options.limit.toString());
  
  const response = await api.get(
    `/api/companies/${companyId}/activity-feed?${params}`
  );
  return response.data.data.activities;
}

/**
 * Format activity timestamp to relative time for display
 */
export function formatActivityTime(timestamp: string): string {
  const now = new Date();
  const activityTime = new Date(timestamp);
  const diffMs = now.getTime() - activityTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  // Format as date for older items
  return activityTime.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}
