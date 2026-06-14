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

// Logistics v2 remodel (P3): a faithful 1:1 rename of the old enum.
//   NOT_ASSIGNED→Draft  ASSIGNED→Scheduled  PACKED→Ready
//   OUT_FOR_DELIVERY→InTransit  DELIVERED→Delivered  FAILED→Issue  CANCELED→Canceled
// New-named keys (DRAFT/SCHEDULED/...) are the canonical ones for new code.
// The old key names are kept as DEPRECATED aliases pointing at the new values so
// every existing `DS.NOT_ASSIGNED`-style reference in server.js keeps working
// without edits (the P0 prep means these are the only references).
const DELIVERY_STATUS = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  READY: 'Ready',
  IN_TRANSIT: 'InTransit',
  DELIVERED: 'Delivered',
  ISSUE: 'Issue',
  CANCELED: 'Canceled',
  // Deprecated aliases (old key names → new values):
  NOT_ASSIGNED: 'Draft',
  ASSIGNED: 'Scheduled',
  PACKED: 'Ready',
  OUT_FOR_DELIVERY: 'InTransit',
  FAILED: 'Issue',
};

// Canonical set of status values (deduped — aliases share values).
const DELIVERY_STATUS_VALUES = ['Draft', 'Scheduled', 'Ready', 'InTransit', 'Delivered', 'Issue', 'Canceled'];

const DELIVERY_STATUS_META = {
  Draft: { label: 'Draft', isFinal: false, sortRank: 10 },
  Scheduled: { label: 'Scheduled', isFinal: false, sortRank: 20 },
  Ready: { label: 'Ready', isFinal: false, sortRank: 30 },
  InTransit: { label: 'In transit', isFinal: false, sortRank: 40 },
  Delivered: { label: 'Delivered', isFinal: true, sortRank: 50 },
  Issue: { label: 'Issue', isFinal: false, sortRank: 60 },
  Canceled: { label: 'Canceled', isFinal: true, sortRank: 70 },
};

/**
 * Delivery Status Transitions (same graph as before, renamed nodes):
 *   Draft     → Scheduled, Canceled
 *   Scheduled → Ready, InTransit, Draft, Canceled
 *   Ready     → InTransit, Canceled
 *   InTransit → Delivered, Issue
 *   Delivered → [] (terminal)
 *   Issue     → Draft, Canceled
 *   Canceled  → [] (terminal)
 */
const ALLOWED_TRANSITIONS = {
  Draft: ['Scheduled', 'Canceled'],
  Scheduled: ['Ready', 'InTransit', 'Draft', 'Canceled'],
  Ready: ['InTransit', 'Canceled'],
  InTransit: ['Delivered', 'Issue'],
  Delivered: [],
  Issue: ['Draft', 'Canceled'],
  Canceled: [],
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
  if (!DELIVERY_STATUS_VALUES.includes(nextStatus)) {
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
  // Never blocks the delivery on stock bookkeeping. (Superseded by the Transfer
  // entity in P5; kept here while transfers are still Delivery rows.)
  if (delivery.type === 'transfer' && nextStatus === DELIVERY_STATUS.DELIVERED) {
    try {
      await applyTransferStock(repos, delivery);
    } catch (stockErr) {
      console.warn('[deliveryStatus] transfer stock move failed:', stockErr.message);
    }
  }

  // Outgoing (non-transfer) delivery physical stock moves:
  //   InTransit  → dispatch  (reserved-, onHand-, inTransit+)
  //   Delivered  → deliver   (inTransit-)
  // Idempotent via the StockMovement ledger. Incoming deliveries don't move our
  // stock here (their goods are received via the PO goods-receipt flow).
  if (delivery.type !== 'transfer' && delivery.direction === 'outgoing' && delivery.locationId) {
    try {
      const stockService = require('./stockService');
      const stockArgs = {
        businessId: delivery.businessId,
        locationId: delivery.locationId,
        items: Array.isArray(delivery.items) ? delivery.items : [],
        refId: delivery.id,
        createdBy: changedBy || null,
      };
      if (nextStatus === DELIVERY_STATUS.IN_TRANSIT) {
        // Legacy order (accepted under the old model, no reservation) already
        // decremented onHand at accept — only track in-transit for it.
        const legacy = delivery.orderId && !(await orderHasReserveLedger(repos, delivery.orderId));
        if (legacy) {
          await stockService.dispatchVisibility(stockArgs);
        } else {
          await stockService.dispatch(stockArgs);
        }
      } else if (nextStatus === DELIVERY_STATUS.DELIVERED) {
        await stockService.deliver(stockArgs);
      }
    } catch (stockErr) {
      console.warn('[deliveryStatus] delivery stock move failed:', stockErr.message);
    }
  }

  return repos.deliveryRepo.getById(deliveryId);
}

/** True if the order was reserved under the new inventory model (has a reserve ledger row). */
async function orderHasReserveLedger(repos, orderId) {
  try {
    const moves = await repos.stockMovementRepo.getByRef('order', orderId);
    return moves.some((m) => m.reason === 'order_reserve');
  } catch {
    return false;
  }
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
  DELIVERY_STATUS_VALUES,
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
