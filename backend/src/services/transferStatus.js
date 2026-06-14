/**
 * Transfer Status Service
 *
 * SINGLE SOURCE OF TRUTH for the internal-transfer approval lifecycle.
 * Mirrors deliveryStatus.js. Drives the multi-stage stock moves via stockService.
 *
 *   Requested → Approved   (reserve at source)
 *   Approved  → Preparing | InTransit
 *   Preparing → InTransit  (dispatch: source reserved-, onHand-, inTransit+)
 *   InTransit → Received   (source inTransit-, destination onHand+)
 *   Received  → Completed  (terminal)
 *   + Rejected / Canceled  (release source reservation, or return in-transit goods)
 */

const { getRepos } = require('../repositories');
const { v4: uuidv4 } = require('uuid');

const TRANSFER_STATUS = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  PREPARING: 'Preparing',
  IN_TRANSIT: 'InTransit',
  RECEIVED: 'Received',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELED: 'Canceled',
};

const TRANSFER_STATUS_VALUES = Object.values(TRANSFER_STATUS);

const TRANSFER_STATUS_META = {
  Requested: { label: 'Requested', isFinal: false, sortRank: 10 },
  Approved: { label: 'Approved', isFinal: false, sortRank: 20 },
  Preparing: { label: 'Preparing', isFinal: false, sortRank: 30 },
  InTransit: { label: 'In transit', isFinal: false, sortRank: 40 },
  Received: { label: 'Received', isFinal: false, sortRank: 50 },
  Completed: { label: 'Completed', isFinal: true, sortRank: 60 },
  Rejected: { label: 'Rejected', isFinal: true, sortRank: 70 },
  Canceled: { label: 'Canceled', isFinal: true, sortRank: 80 },
};

const ALLOWED_TRANSITIONS = {
  Requested: ['Approved', 'Rejected', 'Canceled'],
  Approved: ['Preparing', 'InTransit', 'Canceled'],
  Preparing: ['InTransit', 'Canceled'],
  InTransit: ['Received', 'Canceled'],
  Received: ['Completed', 'Canceled'],
  Completed: [],
  Rejected: [],
  Canceled: [],
};

function isValidTransferTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

function getValidNextStatuses(status) {
  return ALLOWED_TRANSITIONS[status] ?? [];
}

/**
 * Change a transfer's status with validation, audit history, and the
 * multi-stage stock moves. Stock never blocks the status change.
 */
async function changeTransferStatus({ transferId, nextStatus, changedBy = null, reason = null }) {
  if (!TRANSFER_STATUS_VALUES.includes(nextStatus)) {
    const e = new Error(`Invalid transfer status: ${nextStatus}`);
    e.code = 'INVALID_STATUS';
    throw e;
  }

  const repos = getRepos();
  const transfer = await repos.transferRepo.getById(transferId);
  if (!transfer) {
    const e = new Error('Transfer not found');
    e.code = 'TRANSFER_NOT_FOUND';
    throw e;
  }

  const fromStatus = transfer.status;
  if (fromStatus === nextStatus) return transfer;

  if (!isValidTransferTransition(fromStatus, nextStatus)) {
    const e = new Error(
      `Cannot transition transfer from ${fromStatus} to ${nextStatus}. ` +
      `Allowed: ${getValidNextStatuses(fromStatus).join(', ') || 'none'}`
    );
    e.code = 'INVALID_STATUS_TRANSITION';
    throw e;
  }

  const now = new Date();
  const statusFields = { status: nextStatus };
  if (nextStatus === TRANSFER_STATUS.APPROVED) statusFields.approvedBy = changedBy || null;
  if (nextStatus === TRANSFER_STATUS.IN_TRANSIT) statusFields.dispatchedAt = now;
  if (nextStatus === TRANSFER_STATUS.RECEIVED) statusFields.receivedAt = now;
  if (nextStatus === TRANSFER_STATUS.REJECTED) statusFields.rejectedReason = reason ? String(reason).trim() : null;

  await repos.transferRepo.changeStatusWithHistory(
    transferId,
    statusFields,
    {
      id: uuidv4(),
      transferId,
      from: fromStatus,
      to: nextStatus,
      reason: reason ? String(reason).trim() : null,
      changedBy: changedBy || null,
    }
  );

  // Stock side-effects (idempotent via the StockMovement ledger). Never blocks.
  try {
    const stockService = require('./stockService');
    const items = Array.isArray(transfer.items) ? transfer.items : [];
    const srcArgs = {
      businessId: transfer.businessId,
      locationId: transfer.fromLocationId,
      items,
      refId: transferId,
      createdBy: changedBy || null,
    };

    if (transfer.fromLocationId) {
      if (nextStatus === TRANSFER_STATUS.APPROVED) {
        await stockService.transferReserve(srcArgs);
      } else if (nextStatus === TRANSFER_STATUS.IN_TRANSIT) {
        await stockService.transferDispatch(srcArgs);
      } else if (nextStatus === TRANSFER_STATUS.RECEIVED) {
        await stockService.transferClearInTransit(srcArgs);
      } else if (nextStatus === TRANSFER_STATUS.CANCELED || nextStatus === TRANSFER_STATUS.REJECTED) {
        if (fromStatus === TRANSFER_STATUS.APPROVED || fromStatus === TRANSFER_STATUS.PREPARING) {
          await stockService.transferRelease(srcArgs);
        } else if (fromStatus === TRANSFER_STATUS.IN_TRANSIT) {
          await stockService.transferCancelInTransit(srcArgs);
        }
      }
    }

    if (nextStatus === TRANSFER_STATUS.RECEIVED && transfer.toLocationId) {
      // Destination receives the ACTUAL received quantity (partial receiving):
      // use quantityReceived when set, else the full shipped quantity.
      const receivedItems = items.map((it) => ({
        productId: it.productId,
        quantity: it.quantityReceived != null ? Number(it.quantityReceived) : Number(it.quantity ?? it.quantityOrdered ?? 0),
      }));
      await stockService.receiveGoods({
        businessId: transfer.businessId,
        locationId: transfer.toLocationId,
        items: receivedItems,
        refType: 'transfer',
        refId: transferId,
        phase: 'transfer_receive',
        createdBy: changedBy || null,
      });
    }
  } catch (stockErr) {
    console.warn('[transferStatus] stock side-effect failed:', stockErr.message);
  }

  return repos.transferRepo.getById(transferId);
}

async function getTransferStatusHistory(transferId) {
  const repos = getRepos();
  return repos.transferRepo.getStatusHistory(transferId);
}

module.exports = {
  TRANSFER_STATUS,
  TRANSFER_STATUS_VALUES,
  TRANSFER_STATUS_META,
  ALLOWED_TRANSITIONS,
  isValidTransferTransition,
  getValidNextStatuses,
  changeTransferStatus,
  getTransferStatusHistory,
};
