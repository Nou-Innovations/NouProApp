const logger = require('../utils/logger');
/**
 * Order Status Service
 * 
 * SINGLE SOURCE OF TRUTH for order status logic.
 * 
 * This module defines:
 * - Status metadata (labels, UI behavior, sort order)
 * - Allowed transitions (state machine)
 * - Validation and enforcement logic
 * - Status change service with audit logging
 * 
 * Both frontend and backend should derive their logic from this.
 */

// Use the repository layer for all data access (single source of truth)
const { getRepos } = require('../repositories');

// ============================================================================
// ORDER STATUS - SINGLE SOURCE OF TRUTH
// ============================================================================

/**
 * All valid order statuses
 */
const ORDER_STATUS = {
  NEW: 'NEW',
  ACCEPTED: 'ACCEPTED',
  ONGOING: 'ONGOING',
  PENDING: 'PENDING',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  CANCELED: 'CANCELED',
  REJECTED: 'REJECTED',
};

/**
 * ORDER_STATUS_META - Complete metadata for each status
 * 
 * This is the SINGLE SOURCE OF TRUTH for status behavior.
 * Frontend and backend both read from this.
 * 
 * Properties:
 * - label: Display text for UI
 * - isFinal: Terminal state (no further transitions)
 * - requiresReason: Must provide reason when transitioning TO this status
 * - blocksEdits: Order cannot be modified (quantity, items, etc.) in this status
 * - sortRank: Order in lists (lower = shown first, active orders appear before completed)
 */
const ORDER_STATUS_META = {
  [ORDER_STATUS.NEW]: {
    label: 'New order',
    isFinal: false,
    requiresReason: false,
    blocksEdits: false,
    sortRank: 10,
  },
  [ORDER_STATUS.ACCEPTED]: {
    label: 'Accepted',
    isFinal: false,
    requiresReason: false,
    blocksEdits: true,
    sortRank: 20,
  },
  [ORDER_STATUS.ONGOING]: {
    label: 'Ongoing',
    isFinal: false,
    requiresReason: false,
    blocksEdits: true,
    sortRank: 30,
  },
  [ORDER_STATUS.PENDING]: {
    label: 'Pending',
    isFinal: false,
    requiresReason: true,
    blocksEdits: false,
    sortRank: 40,
  },
  [ORDER_STATUS.IN_REVIEW]: {
    label: 'In review',
    isFinal: false,
    requiresReason: false,
    blocksEdits: true,
    sortRank: 50,
  },
  [ORDER_STATUS.DONE]: {
    label: 'Done',
    isFinal: true,
    requiresReason: false,
    blocksEdits: true,
    sortRank: 60,
  },
  [ORDER_STATUS.CANCELED]: {
    label: 'Canceled',
    isFinal: true,
    requiresReason: true,
    blocksEdits: true,
    sortRank: 70,
  },
  [ORDER_STATUS.REJECTED]: {
    label: 'Rejected',
    isFinal: true,
    requiresReason: true,
    blocksEdits: true,
    sortRank: 80,
  },
};

/**
 * ALLOWED_TRANSITIONS - State machine for order workflow
 * 
 * Key: current status
 * Value: array of statuses that can be transitioned to
 * 
 * Rules:
 * - NEW can be accepted, put on hold (pending), canceled, or rejected
 * - ACCEPTED can progress to ongoing, be put on hold, or canceled
 * - ONGOING can go to review, be completed, put on hold, or canceled
 * - PENDING can resume to accepted/ongoing, or be canceled
 * - IN_REVIEW can be approved (done), put on hold, or canceled
 * - DONE, CANCELED, REJECTED are terminal states
 */
const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.NEW]: [
    ORDER_STATUS.ACCEPTED,
    ORDER_STATUS.PENDING,
    ORDER_STATUS.CANCELED,
    ORDER_STATUS.REJECTED,
  ],
  [ORDER_STATUS.ACCEPTED]: [
    ORDER_STATUS.ONGOING,
    ORDER_STATUS.PENDING,
    ORDER_STATUS.CANCELED,
  ],
  [ORDER_STATUS.ONGOING]: [
    ORDER_STATUS.IN_REVIEW,
    ORDER_STATUS.DONE,
    ORDER_STATUS.PENDING,
    ORDER_STATUS.CANCELED,
  ],
  [ORDER_STATUS.PENDING]: [
    ORDER_STATUS.ACCEPTED,
    ORDER_STATUS.ONGOING,
    ORDER_STATUS.CANCELED,
  ],
  [ORDER_STATUS.IN_REVIEW]: [
    ORDER_STATUS.DONE,
    ORDER_STATUS.PENDING,
    ORDER_STATUS.CANCELED,
  ],
  // Final states - no transitions allowed
  [ORDER_STATUS.DONE]: [],
  [ORDER_STATUS.CANCELED]: [],
  [ORDER_STATUS.REJECTED]: [],
};

/**
 * Minimum reason length for validation
 */
const MIN_REASON_LENGTH = 2;

// ============================================================================
// VALIDATION FUNCTIONS (derived from ORDER_STATUS_META)
// ============================================================================

/**
 * Check if a status requires a reason
 * Reads from ORDER_STATUS_META.requiresReason
 */
function requiresReason(status) {
  const meta = ORDER_STATUS_META[status];
  return meta ? meta.requiresReason : false;
}

/**
 * Check if a transition is valid
 */
function isValidTransition(fromStatus, toStatus) {
  const allowed = ALLOWED_TRANSITIONS[fromStatus] ?? [];
  return allowed.includes(toStatus);
}

/**
 * Get all valid next statuses from current status
 */
function getValidNextStatuses(currentStatus) {
  return ALLOWED_TRANSITIONS[currentStatus] ?? [];
}

/**
 * Check if status is final (no transitions allowed)
 * Reads from ORDER_STATUS_META.isFinal
 */
function isFinalStatus(status) {
  const meta = ORDER_STATUS_META[status];
  return meta ? meta.isFinal : false;
}

/**
 * Check if order can be edited in this status
 * Reads from ORDER_STATUS_META.blocksEdits
 */
function canEditInStatus(status) {
  const meta = ORDER_STATUS_META[status];
  return meta ? !meta.blocksEdits : true;
}

/**
 * Get status label for display
 */
function getStatusLabel(status) {
  const meta = ORDER_STATUS_META[status];
  return meta ? meta.label : status;
}

/**
 * Get sort rank for ordering
 */
function getStatusSortRank(status) {
  const meta = ORDER_STATUS_META[status];
  return meta ? meta.sortRank : 999;
}

/**
 * Get complete metadata for a status
 */
function getStatusMeta(status) {
  return ORDER_STATUS_META[status] || null;
}

// ============================================================================
// STOCK ADJUSTMENT HELPER
// ============================================================================

const LOW_STOCK_THRESHOLD = 10;

/**
 * Adjust stock levels for all items in an order.
 * Called automatically when an order transitions to ACCEPTED (decrement)
 * or when a previously-accepted order is CANCELED (increment / restore).
 *
 * @param {Object} repos - Repository instances
 * @param {Object} order - The order object (must include items, fulfillmentLocationId, businessId)
 * @param {'decrement'|'increment'} direction
 */
async function adjustStockForOrder(repos, order, direction) {
  const items = order.items || [];
  const locationId = order.fulfillmentLocationId;
  if (!locationId || items.length === 0) return;

  for (const item of items) {
    const productId = item.productId || item.product?.id;
    if (!productId) continue;

    const stock = await repos.stockRepo.getByLocationAndProduct(locationId, productId);
    const currentQty = stock?.qtyOnHand || 0;
    const delta = direction === 'decrement' ? -item.quantity : item.quantity;
    const newQty = Math.max(0, currentQty + delta);

    await repos.stockRepo.upsert(locationId, productId, newQty, order.businessId);

    // Create low-stock alert when stock drops below threshold
    if (direction === 'decrement' && newQty <= LOW_STOCK_THRESHOLD) {
      try {
        const eventMessages = require('./eventMessages');
        const product = await repos.productRepo.getById(productId);
        await eventMessages.createEventMessage({
          type: 'stock_alert',
          fromBusinessId: order.businessId,
          toBusinessId: null,
          entityId: productId,
          actorId: 'system',
          actorName: 'System',
          metadata: {
            productName: product?.name,
            currentStock: newQty,
            locationId,
          },
        });
      } catch (err) {
        logger.error('[orderStatus] Failed to create low-stock alert:', err.message);
      }
    }
  }
}

// ============================================================================
// MAIN SERVICE FUNCTION
// ============================================================================

/**
 * Change order status with validation and audit logging
 * 
 * @param {Object} params
 * @param {string} params.orderId - The order ID
 * @param {string} params.nextStatus - The target status
 * @param {string} [params.reason] - Reason for the transition (required for some statuses)
 * @param {string} [params.userId] - User ID making the change
 * @returns {Promise<Object>} Updated order
 * @throws {Error} With code for specific error types:
 *   - ORDER_NOT_FOUND: Order doesn't exist
 *   - INVALID_STATUS_TRANSITION: Transition not allowed
 *   - STATUS_REASON_REQUIRED: Reason required but not provided
 */
async function changeOrderStatus({ orderId, nextStatus, reason, userId }) {
  // Validate status value
  if (!Object.values(ORDER_STATUS).includes(nextStatus)) {
    const error = new Error(`Invalid status: ${nextStatus}`);
    error.code = 'INVALID_STATUS';
    throw error;
  }

  const repos = getRepos();

  // Get current order via repository
  const order = await repos.orderRepo.getById(orderId);

  if (!order) {
    const error = new Error('Order not found');
    error.code = 'ORDER_NOT_FOUND';
    throw error;
  }

  const fromStatus = order.status;

  // Check if transition is allowed
  if (!isValidTransition(fromStatus, nextStatus)) {
    const error = new Error(
      `Cannot transition from ${fromStatus} to ${nextStatus}. ` +
      `Allowed transitions: ${getValidNextStatuses(fromStatus).join(', ') || 'none'}`
    );
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }

  // Validate reason if required
  if (requiresReason(nextStatus)) {
    if (!reason || reason.trim().length < MIN_REASON_LENGTH) {
      const error = new Error(
        `Reason is required when setting status to ${nextStatus} (minimum ${MIN_REASON_LENGTH} characters)`
      );
      error.code = 'STATUS_REASON_REQUIRED';
      throw error;
    }
  }

  const now = new Date();
  const trimmedReason = reason ? reason.trim() : null;

  // Atomically update order status and create history record via repository
  const updatedOrder = await repos.orderRepo.changeStatusWithHistory(
    orderId,
    {
      status: nextStatus,
      statusChangedAt: now,
      statusChangedBy: userId || null,
      statusReason: trimmedReason,
      lastActivityAt: now,
    },
    {
      orderId,
      from: fromStatus,
      to: nextStatus,
      reason: trimmedReason,
      changedBy: userId || null,
    }
  );

  // Auto-decrement stock when order is accepted
  if (nextStatus === ORDER_STATUS.ACCEPTED) {
    await adjustStockForOrder(repos, order, 'decrement');
  }

  // Restore stock when order is canceled (if it was previously in an accepted/active state)
  if (
    nextStatus === ORDER_STATUS.CANCELED &&
    [ORDER_STATUS.ACCEPTED, ORDER_STATUS.ONGOING, ORDER_STATUS.PENDING, ORDER_STATUS.IN_REVIEW].includes(fromStatus)
  ) {
    await adjustStockForOrder(repos, order, 'increment');
  }

  return updatedOrder;
}

/**
 * Get status history for an order
 * 
 * @param {string} orderId - The order ID
 * @returns {Promise<Array>} Status history entries
 */
async function getOrderStatusHistory(orderId) {
  const repos = getRepos();
  return repos.orderRepo.getStatusHistory(orderId);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants - SINGLE SOURCE OF TRUTH
  ORDER_STATUS,
  ORDER_STATUS_META,
  ALLOWED_TRANSITIONS,
  MIN_REASON_LENGTH,
  
  // Validation functions (derived from ORDER_STATUS_META)
  requiresReason,
  isValidTransition,
  getValidNextStatuses,
  isFinalStatus,
  canEditInStatus,
  getStatusLabel,
  getStatusSortRank,
  getStatusMeta,
  
  // Service functions
  changeOrderStatus,
  getOrderStatusHistory,
};
