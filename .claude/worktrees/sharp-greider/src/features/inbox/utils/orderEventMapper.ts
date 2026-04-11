/**
 * Order Event Mapper Utilities
 * 
 * Maps order event status to badge config, title, icons, and action lists.
 */

import type { OrderEventStatus, OrderEventPayload } from '@/shared/types/inbox';
import {
  ORDER_EVENT_STATUS_CONFIG,
  ORDER_EVENT_STATUS_CONFIG_DARK,
  STATUS_TO_TIMELINE_STEP,
  type StatusBadgeConfig,
} from '@/shared/ui/tokens/orderEventCard';

// ============================================================================
// Action Types
// ============================================================================

export interface OrderEventAction {
  id: string;
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'outline' | 'destructive';
  disabled?: boolean;
}

// ============================================================================
// Status Config Getter
// ============================================================================

export function getStatusConfig(status: OrderEventStatus, isDarkMode: boolean): StatusBadgeConfig {
  return isDarkMode 
    ? ORDER_EVENT_STATUS_CONFIG_DARK[status] 
    : ORDER_EVENT_STATUS_CONFIG[status];
}

// ============================================================================
// Timeline Step Getter
// ============================================================================

export function getActiveTimelineStep(status: OrderEventStatus): number {
  return STATUS_TO_TIMELINE_STEP[status];
}

// ============================================================================
// Actions by Role
// ============================================================================

/**
 * Get available actions for the buyer based on order status
 * Returns actions ordered by priority: primary action first, then secondary, then overflow
 * 
 * Note: "Track" button removed until dedicated tracking screen exists.
 * Rule: A Track button must answer "where is my order right now?" - if it cannot, it must not exist.
 */
export function getBuyerActions(status: OrderEventStatus): OrderEventAction[] {
  switch (status) {
    case 'NEW':
    case 'PENDING':
      return [
        { id: 'view', label: 'View Order', icon: 'eye', variant: 'primary' },
        { id: 'message', label: 'Message', icon: 'message-circle', variant: 'secondary' },
        { id: 'cancel', label: 'Cancel Order', icon: 'x-circle', variant: 'destructive' },
      ];
    case 'ONGOING':
      return [
        { id: 'view', label: 'View Order', icon: 'eye', variant: 'primary' },
        { id: 'message', label: 'Message', icon: 'message-circle', variant: 'secondary' },
      ];
    case 'IN_REVIEW':
      return [
        { id: 'view', label: 'View Order', icon: 'eye', variant: 'primary' },
        { id: 'message', label: 'Message', icon: 'message-circle', variant: 'secondary' },
      ];
    case 'DONE':
      return [
        { id: 'view', label: 'View Order', icon: 'eye', variant: 'primary' },
        { id: 'reorder', label: 'Reorder', icon: 'refresh-cw', variant: 'secondary' },
        { id: 'invoice', label: 'View Invoice', icon: 'file-text', variant: 'outline' },
      ];
    case 'CANCELED':
      return [
        { id: 'view', label: 'View Order', icon: 'eye', variant: 'primary' },
      ];
    default:
      return [
        { id: 'view', label: 'View Order', icon: 'eye', variant: 'primary' },
      ];
  }
}

/**
 * Get available actions for the seller based on order status
 * Returns actions ordered by priority: primary action first, then secondary, then overflow
 */
export function getSellerActions(status: OrderEventStatus): OrderEventAction[] {
  switch (status) {
    case 'NEW':
      return [
        { id: 'accept', label: 'Accept', icon: 'check', variant: 'primary' },
        { id: 'view', label: 'View', icon: 'eye', variant: 'secondary' },
        { id: 'reject', label: 'Reject', icon: 'x', variant: 'destructive' },
      ];
    case 'PENDING':
      return [
        { id: 'accept', label: 'Accept', icon: 'check', variant: 'primary' },
        { id: 'view', label: 'View', icon: 'eye', variant: 'secondary' },
        { id: 'reject', label: 'Reject', icon: 'x', variant: 'outline' },
      ];
    case 'ONGOING':
      return [
        { id: 'view', label: 'View Order', icon: 'eye', variant: 'primary' },
        { id: 'update_status', label: 'Update', icon: 'edit-3', variant: 'secondary' },
        { id: 'invoice', label: 'Create Invoice', icon: 'file-plus', variant: 'outline' },
      ];
    case 'IN_REVIEW':
      return [
        { id: 'view', label: 'View Order', icon: 'eye', variant: 'primary' },
        { id: 'update_status', label: 'Update', icon: 'edit-3', variant: 'secondary' },
      ];
    case 'DONE':
      return [
        { id: 'view', label: 'View Order', icon: 'eye', variant: 'primary' },
        { id: 'invoice', label: 'Invoice', icon: 'file-text', variant: 'secondary' },
      ];
    case 'CANCELED':
      return [
        { id: 'view', label: 'View Order', icon: 'eye', variant: 'primary' },
      ];
    default:
      return [
        { id: 'view', label: 'View Order', icon: 'eye', variant: 'primary' },
      ];
  }
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'MUR'): string {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format timestamp for display
 */
export function formatOrderTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return timestamp;
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  
  if (messageDate.getTime() === today.getTime()) {
    return time;
  }
  
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  if (messageDate.getTime() === yesterday.getTime()) {
    return `Yesterday, ${time}`;
  }
  
  // Format as "Jan 25, 12:30"
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${dateStr}, ${time}`;
}

/**
 * Get items preview text (max 3 items + "+N more")
 */
export function getItemsPreviewText(itemsPreview: OrderEventPayload['itemsPreview'], totalCount: number): { items: typeof itemsPreview; moreCount: number } {
  const displayItems = itemsPreview.slice(0, 3);
  const moreCount = totalCount - displayItems.length;
  return { items: displayItems, moreCount: Math.max(0, moreCount) };
}

/**
 * Get initials from business name
 */
export function getBusinessInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, maxLength: number = 40): { text: string; isTruncated: boolean } {
  if (address.length <= maxLength) {
    return { text: address, isTruncated: false };
  }
  return { text: address.slice(0, maxLength) + '...', isTruncated: true };
}
