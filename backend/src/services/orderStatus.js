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

// Conditionally load Prisma only if using database mode
const dataSource = process.env.DATA_SOURCE || 'memory';
let prisma = null;
if (dataSource === 'prisma') {
  prisma = require('../db/prisma').prisma;
}

// Import memory store for memory mode
const memoryStore = require('../data/memoryStore');

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

  // Get current order (memory or prisma)
  let order;
  if (dataSource === 'memory') {
    order = memoryStore.orders.find(o => o.id === orderId);
  } else {
    order = await prisma.order.findUnique({
      where: { id: orderId }
    });
  }

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

  // Memory mode: update in-memory array
  if (dataSource === 'memory') {
    const orderIndex = memoryStore.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      const error = new Error('Order not found');
      error.code = 'ORDER_NOT_FOUND';
      throw error;
    }
    
    // Update order
    memoryStore.orders[orderIndex] = {
      ...memoryStore.orders[orderIndex],
      status: nextStatus,
      statusChangedAt: now.toISOString(),
      statusChangedBy: userId || null,
      statusReason: trimmedReason,
      lastActivityAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    
    // Create history record in memory (if orderStatusHistory array exists)
    if (!memoryStore.orderStatusHistory) {
      memoryStore.orderStatusHistory = [];
    }
    memoryStore.orderStatusHistory.push({
      id: `osh-${Date.now()}`,
      orderId,
      from: fromStatus,
      to: nextStatus,
      reason: trimmedReason,
      changedBy: userId || null,
      createdAt: now.toISOString(),
    });
    
    return memoryStore.orders[orderIndex];
  }

  // Prisma mode: perform update and create history in a transaction
  return prisma.$transaction(async (tx) => {
    // Update order
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        statusChangedAt: now,
        statusChangedBy: userId || null,
        statusReason: trimmedReason,
        lastActivityAt: now,
      },
    });

    // Create history record
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        from: fromStatus,
        to: nextStatus,
        reason: trimmedReason,
        changedBy: userId || null,
      },
    });

    return updatedOrder;
  });
}

/**
 * Get status history for an order
 * 
 * @param {string} orderId - The order ID
 * @returns {Promise<Array>} Status history entries
 */
async function getOrderStatusHistory(orderId) {
  // Memory mode: return from in-memory array
  if (dataSource === 'memory') {
    if (!memoryStore.orderStatusHistory) {
      return [];
    }
    return memoryStore.orderStatusHistory
      .filter(h => h.orderId === orderId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  
  // Prisma mode: query database
  return prisma.orderStatusHistory.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  });
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
