/**
 * Purchase Order Status Service
 *
 * SINGLE SOURCE OF TRUTH for purchase order status logic.
 *
 * This module defines:
 * - Status metadata (labels, UI behavior, sort order)
 * - Allowed transitions (state machine)
 * - Validation and enforcement logic
 * - Status change service with audit logging
 * - Stock increment on goods received
 */

const { getRepos } = require('../repositories');

// ============================================================================
// PO STATUS - SINGLE SOURCE OF TRUTH
// ============================================================================

const PO_STATUS = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  CONFIRMED: 'CONFIRMED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CANCELED: 'CANCELED',
};

const PO_STATUS_META = {
  [PO_STATUS.DRAFT]: {
    label: 'Draft',
    isFinal: false,
    requiresReason: false,
    blocksEdits: false,
    sortRank: 10,
  },
  [PO_STATUS.SENT]: {
    label: 'Sent',
    isFinal: false,
    requiresReason: false,
    blocksEdits: true,
    sortRank: 20,
  },
  [PO_STATUS.CONFIRMED]: {
    label: 'Confirmed',
    isFinal: false,
    requiresReason: false,
    blocksEdits: true,
    sortRank: 30,
  },
  [PO_STATUS.PARTIALLY_RECEIVED]: {
    label: 'Partially received',
    isFinal: false,
    requiresReason: false,
    blocksEdits: true,
    sortRank: 40,
  },
  [PO_STATUS.RECEIVED]: {
    label: 'Received',
    isFinal: true,
    requiresReason: false,
    blocksEdits: true,
    sortRank: 50,
  },
  [PO_STATUS.CANCELED]: {
    label: 'Canceled',
    isFinal: true,
    requiresReason: true,
    blocksEdits: true,
    sortRank: 60,
  },
};

/**
 * PO Status Transitions:
 *   DRAFT              → SENT, CANCELED
 *   SENT               → CONFIRMED, CANCELED
 *   CONFIRMED          → PARTIALLY_RECEIVED, RECEIVED, CANCELED
 *   PARTIALLY_RECEIVED → RECEIVED, CANCELED
 *   RECEIVED           → [] (terminal)
 *   CANCELED           → [] (terminal)
 */
const ALLOWED_TRANSITIONS = {
  [PO_STATUS.DRAFT]: [PO_STATUS.SENT, PO_STATUS.CANCELED],
  [PO_STATUS.SENT]: [PO_STATUS.CONFIRMED, PO_STATUS.CANCELED],
  [PO_STATUS.CONFIRMED]: [PO_STATUS.PARTIALLY_RECEIVED, PO_STATUS.RECEIVED, PO_STATUS.CANCELED],
  [PO_STATUS.PARTIALLY_RECEIVED]: [PO_STATUS.RECEIVED, PO_STATUS.CANCELED],
  [PO_STATUS.RECEIVED]: [],
  [PO_STATUS.CANCELED]: [],
};

const MIN_REASON_LENGTH = 2;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function requiresReason(status) {
  const meta = PO_STATUS_META[status];
  return meta ? meta.requiresReason : false;
}

function isValidTransition(fromStatus, toStatus) {
  const allowed = ALLOWED_TRANSITIONS[fromStatus] ?? [];
  return allowed.includes(toStatus);
}

function getValidNextStatuses(currentStatus) {
  return ALLOWED_TRANSITIONS[currentStatus] ?? [];
}

function isFinalStatus(status) {
  const meta = PO_STATUS_META[status];
  return meta ? meta.isFinal : false;
}

function canEditInStatus(status) {
  const meta = PO_STATUS_META[status];
  return meta ? !meta.blocksEdits : true;
}

function getStatusLabel(status) {
  const meta = PO_STATUS_META[status];
  return meta ? meta.label : status;
}

// ============================================================================
// STOCK ADJUSTMENT — increment stock on goods received
// ============================================================================

/**
 * Increment stock for received items.
 * Called when a GoodsReceipt is created or when PO transitions to RECEIVED.
 *
 * @param {Object} repos - Repository instances
 * @param {string} businessId
 * @param {string} locationId - Receiving location
 * @param {Array} items - [{productId, receivedQty}]
 */
async function incrementStockForReceivedItems(repos, businessId, locationId, items) {
  if (!locationId || !items || items.length === 0) return;

  for (const item of items) {
    const productId = item.productId;
    if (!productId || !item.receivedQty) continue;

    const stock = await repos.stockRepo.getByLocationAndProduct(locationId, productId);
    const currentQty = stock?.qtyOnHand || 0;
    const newQty = currentQty + item.receivedQty;

    await repos.stockRepo.upsert(locationId, productId, newQty, businessId);
  }
}

// ============================================================================
// MAIN SERVICE FUNCTION
// ============================================================================

/**
 * Change purchase order status with validation and audit logging.
 *
 * @param {Object} params
 * @param {string} params.purchaseOrderId
 * @param {string} params.nextStatus
 * @param {string} [params.reason]
 * @param {string} [params.userId]
 * @returns {Promise<Object>} Updated purchase order
 * @throws {Error} With code for specific error types
 */
async function changePurchaseOrderStatus({ purchaseOrderId, nextStatus, reason, userId }) {
  if (!Object.values(PO_STATUS).includes(nextStatus)) {
    const error = new Error(`Invalid PO status: ${nextStatus}`);
    error.code = 'INVALID_STATUS';
    throw error;
  }

  const repos = getRepos();
  const po = await repos.procurementRepo.getPurchaseOrderById(purchaseOrderId);

  if (!po) {
    const error = new Error('Purchase order not found');
    error.code = 'PO_NOT_FOUND';
    throw error;
  }

  const fromStatus = po.status;

  if (!isValidTransition(fromStatus, nextStatus)) {
    const error = new Error(
      `Cannot transition PO from ${fromStatus} to ${nextStatus}. ` +
      `Allowed: ${getValidNextStatuses(fromStatus).join(', ') || 'none'}`
    );
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }

  if (requiresReason(nextStatus)) {
    if (!reason || reason.trim().length < MIN_REASON_LENGTH) {
      const error = new Error(
        `Reason is required when setting PO status to ${nextStatus} (minimum ${MIN_REASON_LENGTH} characters)`
      );
      error.code = 'STATUS_REASON_REQUIRED';
      throw error;
    }
  }

  const now = new Date();
  const trimmedReason = reason ? reason.trim() : null;

  const updatedPO = await repos.procurementRepo.changePOStatusWithHistory(
    purchaseOrderId,
    {
      status: nextStatus,
      statusChangedAt: now,
      statusChangedBy: userId || null,
      statusReason: trimmedReason,
      lastActivityAt: now,
      ...(nextStatus === PO_STATUS.SENT ? { sentAt: now } : {}),
    },
    {
      purchaseOrderId,
      from: fromStatus,
      to: nextStatus,
      reason: trimmedReason,
      changedBy: userId || null,
    }
  );

  return updatedPO;
}

/**
 * Get status history for a purchase order.
 */
async function getPurchaseOrderStatusHistory(purchaseOrderId) {
  const repos = getRepos();
  return repos.procurementRepo.getPOStatusHistory(purchaseOrderId);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  PO_STATUS,
  PO_STATUS_META,
  ALLOWED_TRANSITIONS,
  MIN_REASON_LENGTH,

  requiresReason,
  isValidTransition,
  getValidNextStatuses,
  isFinalStatus,
  canEditInStatus,
  getStatusLabel,

  incrementStockForReceivedItems,
  changePurchaseOrderStatus,
  getPurchaseOrderStatusHistory,
};
