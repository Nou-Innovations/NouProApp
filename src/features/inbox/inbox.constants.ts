/**
 * Inbox Constants
 * 
 * Color mappings, status constants, and configuration values.
 * Based on design.json specifications.
 */

import { theme } from '@/shared/theme';

// ============================================================================
// Order Status Colors (from design.json)
// ============================================================================

export const ORDER_STATUS_COLORS: Record<string, string> = {
  'pending': theme.colors.warning,
  'accepted': theme.colors.info,
  'completed': theme.colors.success,
  'cancelled': theme.colors.neutral,
  'Done': theme.colors.statusDone,
  'New': theme.colors.statusNewOrder,
  'Ongoing': theme.colors.statusOngoing,
  'Pending': theme.colors.warning,
  'Cancel': theme.colors.statusCanceled,
  'Delivery Pending Confirmation': theme.colors.warning,
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  'Paid': theme.colors.statusPaid,
  'Unpaid': theme.colors.error,
  'Payment Pending Confirmation': theme.colors.warning,
};

// ============================================================================
// Message Status Icons
// ============================================================================

export const MESSAGE_STATUS_CONFIG = {
  sent: { icon: 'checkmark' as const, color: 'textMuted' },
  delivered: { icon: 'checkmark-done' as const, color: 'textMuted' },
  read: { icon: 'checkmark-done' as const, color: 'accent' },
  sending: { icon: 'time-outline' as const, color: 'textMuted' },
  failed: { icon: 'alert-circle-outline' as const, color: 'error' },
} as const;

// ============================================================================
// Message Type Display Names
// ============================================================================

export const MESSAGE_TYPE_LABELS: Record<string, string> = {
  text: 'Message',
  image: '🖼️ Image',
  voice: '🎤 Voice note',
  pdf: '📄 Document',
  invoice: '🧾 Invoice',
  order: '📦 Order',
  location: '📍 Location',
  contact: '👤 Contact',
  event: 'Event',
  deleted: 'Deleted message',
};

// ============================================================================
// Chat Type Labels
// ============================================================================

export const CHAT_TYPE_LABELS: Record<string, string> = {
  client: 'Client',
  supplier: 'Supplier',
  internal: 'Internal',
};

// ============================================================================
// Filter Labels
// ============================================================================

export const CHAT_FILTER_LABELS: Record<string, string> = {
  all: 'All',
  unread: 'Unread',
  direct: 'Direct',
  group: 'Groups',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get order status color with fallback
 */
export function getOrderStatusColor(status: string, fallback = theme.colors.neutral): string {
  return ORDER_STATUS_COLORS[status] || fallback;
}

/**
 * Get payment status color with fallback
 */
export function getPaymentStatusColor(status: string, fallback = theme.colors.error): string {
  return PAYMENT_STATUS_COLORS[status] || fallback;
}

/**
 * Get message type display label
 */
export function getMessageTypeLabel(type: string): string {
  return MESSAGE_TYPE_LABELS[type] || type;
}

