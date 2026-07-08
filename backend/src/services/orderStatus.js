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
 * Order stock handling (Logistics v2, multi-stage inventory).
 *
 * New model: ACCEPTED reserves (available drops, onHand unchanged); the physical
 * onHand decrement happens at delivery dispatch, or — for orders completed with
 * NO delivery — at order DONE (fulfillDirect). All mutations go through
 * stockService (transactional + ledgered).
 *
 * Forward-only safety: orders ACCEPTED under the OLD model already had onHand
 * decremented at accept-time and have no `order_reserve` ledger entry. We detect
 * that via the ledger and fall back to legacy behavior so we never double-count.
 */
async function orderWasReserved(repos, orderId) {
  try {
    const moves = await repos.stockMovementRepo.getByRef('order', orderId);
    return moves.some((m) => m.reason === 'order_reserve');
  } catch {
    return false;
  }
}

/** Legacy restore: directly add onHand back for a pre-reservation-model order on cancel. */
async function legacyRestoreOnHand(repos, order) {
  const stockService = require('./stockService');
  const locationId = order.fulfillmentLocationId;
  if (!locationId) return;
  for (const item of order.items || []) {
    const productId = item.productId || item.product?.id;
    const qty = Number(item.quantity) || 0;
    if (!productId || qty <= 0) continue;
    await stockService.manualAdjust({ businessId: order.businessId, locationId, productId, delta: +qty, createdBy: 'system-legacy-cancel' });
  }
}

/** Emit low-stock alerts based on AVAILABLE (onHand - reserved) after a change. */
async function emitLowStockAlerts(repos, order) {
  const stockService = require('./stockService');
  const locationId = order.fulfillmentLocationId;
  if (!locationId) return;
  for (const item of order.items || []) {
    const productId = item.productId || item.product?.id;
    if (!productId) continue;
    try {
      const available = await stockService.getAvailable(locationId, productId);
      if (available <= LOW_STOCK_THRESHOLD) {
        const eventMessages = require('./eventMessages');
        const product = await repos.productRepo.getById(productId);
        await eventMessages.postProcurementEvent({
          businessId: order.businessId,
          type: 'stock_alert',
          entityId: productId,
          actorId: 'system',
          actorName: 'System',
          metadata: { productName: product?.name, currentStock: available, locationId },
        });
      }
    } catch (err) {
      logger.error('[orderStatus] Failed to create low-stock alert:', err.message);
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

  // Inventory side-effects (multi-stage). Wrapped so a stock hiccup never blocks
  // a status change. The order object has items/fulfillmentLocationId/businessId.
  try {
    const stockService = require('./stockService');
    const stockArgs = {
      businessId: order.businessId,
      locationId: order.fulfillmentLocationId,
      items: order.items || [],
      refId: order.id,
      createdBy: userId || null,
    };

    if (nextStatus === ORDER_STATUS.ACCEPTED) {
      // Reserve (available drops; onHand untouched).
      await stockService.reserve(stockArgs);
      await emitLowStockAlerts(repos, order);
    } else if (
      nextStatus === ORDER_STATUS.CANCELED &&
      [ORDER_STATUS.ACCEPTED, ORDER_STATUS.ONGOING, ORDER_STATUS.PENDING, ORDER_STATUS.IN_REVIEW].includes(fromStatus)
    ) {
      // New-model orders: release the reservation. Legacy (pre-reservation)
      // orders had onHand decremented at accept → restore it instead.
      if (await orderWasReserved(repos, order.id)) {
        await stockService.release(stockArgs);
      } else {
        await legacyRestoreOnHand(repos, order);
      }
    } else if (nextStatus === ORDER_STATUS.DONE) {
      // If a delivery handles the physical move, it owns the onHand decrement.
      // Otherwise consume the reservation directly — but only for new-model
      // orders (legacy orders already decremented onHand at accept-time).
      const existingDelivery = await repos.deliveryRepo.getByOrderId(order.id);
      if (!existingDelivery && (await orderWasReserved(repos, order.id))) {
        await stockService.fulfillDirect(stockArgs);
        await emitLowStockAlerts(repos, order);
      }
    }
  } catch (stockErr) {
    logger.error('[orderStatus] stock side-effect failed:', stockErr.message);
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
