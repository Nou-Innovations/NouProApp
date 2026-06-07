/**
 * Order Status Configuration (Frontend Mirror)
 * 
 * IMPORTANT: The backend `backend/src/services/orderStatus.js` is the
 * SINGLE SOURCE OF TRUTH for order status logic. This file mirrors that
 * configuration for offline/client-side use.
 * 
 * The backend exposes this via: GET /api/order-status-meta
 * 
 * This file controls:
 * - Status labels and short labels for UI
 * - Sort order for list displays
 * - Behavioral flags (isFinal, requiresReason, blocksEdits)
 * - Color mappings for badges
 * 
 * When updating status rules, update BOTH:
 * 1. backend/src/services/orderStatus.js (authoritative)
 * 2. This file (client mirror)
 */

/**
 * Order status enum (uppercase to match Prisma schema)
 */
export type OrderStatus =
  | 'NEW'
  | 'ACCEPTED'
  | 'ONGOING'
  | 'PENDING'
  | 'IN_REVIEW'
  | 'DONE'
  | 'CANCELED'
  | 'REJECTED';

/**
 * All possible order statuses for iteration
 */
export const ORDER_STATUSES: OrderStatus[] = [
  'NEW',
  'ACCEPTED',
  'ONGOING',
  'PENDING',
  'IN_REVIEW',
  'DONE',
  'CANCELED',
  'REJECTED',
];

/**
 * Status metadata configuration
 */
export interface OrderStatusMeta {
  /** Full display label */
  label: string;
  /** Short label for compact displays */
  shortLabel?: string;
  /** Whether this is a terminal state (no further transitions) */
  isFinal: boolean;
  /** Whether transitioning to this status requires a reason */
  requiresReason?: boolean;
  /** Whether the order can be edited in this status */
  blocksEdits?: boolean;
  /** Sort rank for list displays (lower = shown first) */
  sortRank: number;
}

/**
 * Complete metadata for all order statuses
 */
export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  NEW: {
    label: 'New order',
    shortLabel: 'New',
    isFinal: false,
    blocksEdits: false,
    sortRank: 10,
  },
  ACCEPTED: {
    label: 'Accepted',
    isFinal: false,
    blocksEdits: true,
    sortRank: 20,
  },
  ONGOING: {
    label: 'Ongoing',
    isFinal: false,
    blocksEdits: true,
    sortRank: 30,
  },
  PENDING: {
    label: 'Pending',
    isFinal: false,
    requiresReason: true,
    blocksEdits: false,
    sortRank: 40,
  },
  IN_REVIEW: {
    label: 'In review',
    shortLabel: 'Review',
    isFinal: false,
    blocksEdits: true,
    sortRank: 50,
  },
  DONE: {
    label: 'Done',
    isFinal: true,
    blocksEdits: true,
    sortRank: 60,
  },
  CANCELED: {
    label: 'Canceled',
    isFinal: true,
    requiresReason: true,
    blocksEdits: true,
    sortRank: 70,
  },
  REJECTED: {
    label: 'Rejected',
    isFinal: true,
    requiresReason: true,
    blocksEdits: true,
    sortRank: 80,
  },
};

/**
 * Badge tone types for color mapping
 */
export type BadgeTone = 
  | 'info' 
  | 'warning' 
  | 'success' 
  | 'neutral' 
  | 'purple' 
  | 'danger'
  | 'error';

/**
 * Maps each status to its badge tone for consistent styling
 */
export const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  NEW: 'info',
  ACCEPTED: 'info',
  ONGOING: 'warning',
  PENDING: 'neutral',
  IN_REVIEW: 'purple',
  DONE: 'success',
  CANCELED: 'danger',
  REJECTED: 'error',
};

/**
 * ALLOWED_TRANSITIONS - State machine for order workflow
 * 
 * Key: current status
 * Value: array of statuses that can be transitioned to
 * 
 * NOTE: This mirrors backend/src/services/orderStatus.js
 * The backend enforces this; the frontend uses it for UI hints.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['ACCEPTED', 'PENDING', 'CANCELED', 'REJECTED'],
  ACCEPTED: ['ONGOING', 'PENDING', 'CANCELED'],
  ONGOING: ['IN_REVIEW', 'DONE', 'PENDING', 'CANCELED'],
  PENDING: ['ACCEPTED', 'ONGOING', 'CANCELED'],
  IN_REVIEW: ['DONE', 'PENDING', 'CANCELED'],
  DONE: [],
  CANCELED: [],
  REJECTED: [],
};

/**
 * Statuses that require a reason when transitioning to them
 */
export const STATUSES_REQUIRING_REASON: OrderStatus[] = 
  ORDER_STATUSES.filter(status => ORDER_STATUS_META[status].requiresReason);

/**
 * Terminal statuses (no further transitions possible)
 */
export const FINAL_STATUSES: OrderStatus[] = 
  ORDER_STATUSES.filter(status => ORDER_STATUS_META[status].isFinal);

/**
 * Active (non-final) statuses
 */
export const ACTIVE_STATUSES: OrderStatus[] = 
  ORDER_STATUSES.filter(status => !ORDER_STATUS_META[status].isFinal);

/**
 * Helper functions
 */

/**
 * Get the display label for a status
 */
export function getStatusLabel(status: OrderStatus, short = false): string {
  const meta = ORDER_STATUS_META[status];
  return short && meta.shortLabel ? meta.shortLabel : meta.label;
}

/**
 * Check if a status requires a reason for transition
 */
export function statusRequiresReason(status: OrderStatus): boolean {
  return ORDER_STATUS_META[status].requiresReason ?? false;
}

/**
 * Check if an order can be edited in the given status
 */
export function canEditOrder(status: OrderStatus): boolean {
  return !ORDER_STATUS_META[status].blocksEdits;
}

/**
 * Check if a status is a final state
 */
export function isFinalStatus(status: OrderStatus): boolean {
  return ORDER_STATUS_META[status].isFinal;
}

/**
 * Sort orders by status rank (active first, then by sortRank)
 */
export function sortByStatusRank<T extends { status: OrderStatus }>(orders: T[]): T[] {
  return [...orders].sort((a, b) => {
    const rankA = ORDER_STATUS_META[a.status].sortRank;
    const rankB = ORDER_STATUS_META[b.status].sortRank;
    return rankA - rankB;
  });
}

/**
 * Sort orders by status rank, then by date (most recent first)
 */
export function sortOrdersByStatusAndDate<T extends { status: OrderStatus; createdAt?: string | Date }>(
  orders: T[]
): T[] {
  return [...orders].sort((a, b) => {
    const rankA = ORDER_STATUS_META[a.status].sortRank;
    const rankB = ORDER_STATUS_META[b.status].sortRank;
    
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    
    // Same status rank: sort by date descending
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Get valid next statuses from current status
 * NOTE: Backend enforces this - use for UI hints only
 */
export function getValidTransitions(currentStatus: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] ?? [];
}

/**
 * Check if a transition is valid
 * NOTE: Backend enforces this - use for UI hints only
 */
export function isValidTransition(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[fromStatus] ?? [];
  return allowed.includes(toStatus);
}

/**
 * Get valid transitions with their metadata
 * Useful for rendering status change options in UI
 */
export function getTransitionsWithMeta(currentStatus: OrderStatus): {
  status: OrderStatus;
  meta: OrderStatusMeta;
}[] {
  return getValidTransitions(currentStatus).map(status => ({
    status,
    meta: ORDER_STATUS_META[status],
  }));
}
