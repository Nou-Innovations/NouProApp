/**
 * Delivery Status Service
 *
 * SINGLE SOURCE OF TRUTH for delivery/transfer status logic.
 *
 * This module defines:
 * - Status metadata (labels, finality, sort order)
 * - Allowed transitions (state machine)
 * - Validation and enforcement logic
 * - Status change service with audit logging (DeliveryStatusHistory)
 * - Proof-of-delivery + deliveredAt stamping on DELIVERED
 * - Transfer stock movement on completion (transactional + idempotent)
 *
 * NOTE: The Order<->Delivery sync and push notifications deliberately stay
 * in server.js (after this service returns) so the existing
 * `_orderDeliverySyncInProgress` loop guard is untouched. Do NOT trigger
 * order sync from here.
 */

const { getRepos } = require('../repositories');

// ============================================================================
// DELIVERY STATUS - SINGLE SOURCE OF TRUTH
// ============================================================================

const DELIVERY_STATUS = {
  NOT_ASSIGNED: 'NOT_ASSIGNED',
  ASSIGNED: 'ASSIGNED',
  PACKED: 'PACKED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
};

const DELIVERY_STATUS_META = {
  [DELIVERY_STATUS.NOT_ASSIGNED]: { label: 'Not assigned', isFinal: false, sortRank: 10 },
  [DELIVERY_STATUS.ASSIGNED]: { label: 'Assigned', isFinal: false, sortRank: 20 },
  [DELIVERY_STATUS.PACKED]: { label: 'Packed', isFinal: false, sortRank: 30 },
  [DELIVERY_STATUS.OUT_FOR_DELIVERY]: { label: 'Out for delivery', isFinal: false, sortRank: 40 },
  [DELIVERY_STATUS.DELIVERED]: { label: 'Delivered', isFinal: true, sortRank: 50 },
  [DELIVERY_STATUS.FAILED]: { label: 'Failed', isFinal: false, sortRank: 60 },
  [DELIVERY_STATUS.CANCELED]: { label: 'Canceled', isFinal: true, sortRank: 70 },
};

/**
 * Delivery Status Transitions:
 *   NOT_ASSIGNED     → ASSIGNED, CANCELED
 *   ASSIGNED         → PACKED, OUT_FOR_DELIVERY, NOT_ASSIGNED, CANCELED
 *   PACKED           → OUT_FOR_DELIVERY, CANCELED
 *   OUT_FOR_DELIVERY → DELIVERED, FAILED
 *   DELIVERED        → [] (terminal)
 *   FAILED           → NOT_ASSIGNED, CANCELED
 *   CANCELED         → [] (terminal)
 */
const ALLOWED_TRANSITIONS = {
  [DELIVERY_STATUS.NOT_ASSIGNED]: [DELIVERY_STATUS.ASSIGNED, DELIVERY_STATUS.CANCELED],
  [DELIVERY_STATUS.ASSIGNED]: [
    DELIVERY_STATUS.PACKED,
    DELIVERY_STATUS.OUT_FOR_DELIVERY,
    DELIVERY_STATUS.NOT_ASSIGNED,
    DELIVERY_STATUS.CANCELED,
  ],
  [DELIVERY_STATUS.PACKED]: [DELIVERY_STATUS.OUT_FOR_DELIVERY, DELIVERY_STATUS.CANCELED],
  [DELIVERY_STATUS.OUT_FOR_DELIVERY]: [DELIVERY_STATUS.DELIVERED, DELIVERY_STATUS.FAILED],
  [DELIVERY_STATUS.DELIVERED]: [],
  [DELIVERY_STATUS.FAILED]: [DELIVERY_STATUS.NOT_ASSIGNED, DELIVERY_STATUS.CANCELED],
  [DELIVERY_STATUS.CANCELED]: [],
};

// Back-compat alias for the name server.js historically used.
const DELIVERY_STATUS_TRANSITIONS = ALLOWED_TRANSITIONS;

// ============================================================================
// VALIDATION
// ============================================================================

function isValidDeliveryTransition(currentStatus, nextStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed) return false; // unknown current status
  return allowed.includes(nextStatus);
}

function getValidNextStatuses(currentStatus) {
  return ALLOWED_TRANSITIONS[currentStatus] ?? [];
}

function isFinalStatus(status) {
  const meta = DELIVERY_STATUS_META[status];
  return meta ? meta.isFinal : false;
}

function getStatusLabel(status) {
  const meta = DELIVERY_STATUS_META[status];
  return meta ? meta.label : status;
}

// ============================================================================
// TRANSFER STOCK MOVEMENT (transactional + idempotent)
// ============================================================================

/**
 * Move stock between the source and destination locations of a completed
 * transfer. Resolves location ids (prefers the FK columns, falls back to a
 * name lookup for legacy transfers). The actual decrement/increment + the
 * `stockAppliedAt` idempotency guard all run inside a single DB transaction
 * in the repository.
 *
 * Never throws to the caller in a way that blocks the delivery — callers
 * wrap this in try/catch; here we just resolve + delegate.
 */
async function applyTransferStock(repos, delivery) {
  let fromLocationId = delivery.fromLocationId || null;
  let toLocationId = delivery.toLocationId || null;

  // Legacy transfers stored only free-text location names — try to resolve them.
  if ((!fromLocationId || !toLocationId) && delivery.businessId) {
    const locations = await repos.locationRepo.getByBusinessId(delivery.businessId);
    const byName = (name) => {
      if (!name) return null;
      const target = String(name).trim().toLowerCase();
      const match = locations.find(
        (l) => l.name && l.name.trim().toLowerCase() === target
      );
      return match ? match.id : null;
    };
    if (!fromLocationId) fromLocationId = byName(delivery.fromLocation);
    if (!toLocationId) toLocationId = byName(delivery.toLocation);
  }

  if (!fromLocationId || !toLocationId) {
    console.warn(
      `[deliveryStatus] transfer ${delivery.id}: unresolved from/to location — stock move skipped`
    );
    return { applied: false, reason: 'unresolved_locations' };
  }

  return repos.deliveryRepo.applyTransferStock(delivery.id, {
    businessId: delivery.businessId,
    fromLocationId,
    toLocationId,
    items: Array.isArray(delivery.items) ? delivery.items : [],
  });
}

// ============================================================================
// MAIN SERVICE FUNCTION
// ============================================================================

/**
 * Change a delivery's status with validation, audit logging, and the
 * DELIVERED side-effects (deliveredAt/deliveredBy, proof-of-delivery,
 * transfer stock movement).
 *
 * @param {Object} params
 * @param {string} params.deliveryId
 * @param {string} params.nextStatus
 * @param {string} [params.changedBy]  userId performing the change
 * @param {string} [params.reason]
 * @param {Object} [params.pod]         { podPhotoUrl?, podSignatureUrl? }
 * @returns {Promise<Object>} Updated delivery (with staffAssignments)
 * @throws {Error} with `.code` INVALID_STATUS | DELIVERY_NOT_FOUND | INVALID_STATUS_TRANSITION
 */
async function changeDeliveryStatus({ deliveryId, nextStatus, changedBy = null, reason = null, pod = null }) {
  if (!Object.values(DELIVERY_STATUS).includes(nextStatus)) {
    const error = new Error(`Invalid delivery status: ${nextStatus}`);
    error.code = 'INVALID_STATUS';
    throw error;
  }

  const repos = getRepos();
  const delivery = await repos.deliveryRepo.getById(deliveryId);
  if (!delivery) {
    const error = new Error('Delivery not found');
    error.code = 'DELIVERY_NOT_FOUND';
    throw error;
  }

  const fromStatus = delivery.deliveryStatus || null;

  // Idempotent no-op: re-requesting the current status writes nothing.
  if (fromStatus === nextStatus) {
    return delivery;
  }

  if (!isValidDeliveryTransition(fromStatus, nextStatus)) {
    const error = new Error(
      `Cannot transition delivery from ${fromStatus} to ${nextStatus}. ` +
      `Allowed: ${getValidNextStatuses(fromStatus).join(', ') || 'none'}`
    );
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }

  const now = new Date();
  const statusFields = { deliveryStatus: nextStatus };

  if (nextStatus === DELIVERY_STATUS.DELIVERED) {
    statusFields.deliveredAt = now;
    statusFields.deliveredBy = changedBy || null;
    if (pod && typeof pod === 'object') {
      if (pod.podPhotoUrl !== undefined && pod.podPhotoUrl !== null) {
        statusFields.podPhotoUrl = pod.podPhotoUrl;
      }
      if (pod.podSignatureUrl !== undefined && pod.podSignatureUrl !== null) {
        statusFields.podSignatureUrl = pod.podSignatureUrl;
      }
    }
  }

  await repos.deliveryRepo.changeStatusWithHistory(
    deliveryId,
    statusFields,
    {
      deliveryId,
      from: fromStatus,
      to: nextStatus,
      reason: reason ? String(reason).trim() : null,
      changedBy: changedBy || null,
    }
  );

  // Transfer stock movement on completion (idempotent via stockAppliedAt).
  // Never blocks the delivery on stock bookkeeping.
  if (delivery.type === 'transfer' && nextStatus === DELIVERY_STATUS.DELIVERED) {
    try {
      await applyTransferStock(repos, delivery);
    } catch (stockErr) {
      console.warn('[deliveryStatus] transfer stock move failed:', stockErr.message);
    }
  }

  return repos.deliveryRepo.getById(deliveryId);
}

/**
 * Get the status-change audit trail for a delivery (newest first).
 */
async function getDeliveryStatusHistory(deliveryId) {
  const repos = getRepos();
  return repos.deliveryRepo.getStatusHistory(deliveryId);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  DELIVERY_STATUS,
  DELIVERY_STATUS_META,
  ALLOWED_TRANSITIONS,
  DELIVERY_STATUS_TRANSITIONS,

  isValidDeliveryTransition,
  getValidNextStatuses,
  isFinalStatus,
  getStatusLabel,

  changeDeliveryStatus,
  getDeliveryStatusHistory,
  applyTransferStock,
};
