/**
 * Return (RMA) Service
 *
 * Lifecycle: Requested → Scheduled → PickedUp → Received → Completed (+ Rejected).
 * On Received, items dispositioned 'restock' are added back to on-hand at the
 * return's location via stockService (idempotent via the ledger + stockAppliedAt).
 */

const { getRepos } = require('../repositories');

const RETURN_STATUS = {
  REQUESTED: 'Requested',
  SCHEDULED: 'Scheduled',
  PICKED_UP: 'PickedUp',
  RECEIVED: 'Received',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};
const RETURN_STATUS_VALUES = Object.values(RETURN_STATUS);

const ALLOWED_TRANSITIONS = {
  Requested: ['Scheduled', 'Rejected'],
  Scheduled: ['PickedUp', 'Rejected'],
  PickedUp: ['Received'],
  Received: ['Completed'],
  Completed: [],
  Rejected: [],
};

function isValidReturnTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

function getValidNextStatuses(status) {
  return ALLOWED_TRANSITIONS[status] ?? [];
}

async function changeReturnStatus({ returnId, nextStatus, changedBy = null, reason = null }) {
  if (!RETURN_STATUS_VALUES.includes(nextStatus)) {
    const e = new Error(`Invalid return status: ${nextStatus}`);
    e.code = 'INVALID_STATUS';
    throw e;
  }
  const repos = getRepos();
  const ret = await repos.returnRepo.getById(returnId);
  if (!ret) {
    const e = new Error('Return not found');
    e.code = 'RETURN_NOT_FOUND';
    throw e;
  }
  if (ret.status === nextStatus) return ret;
  if (!isValidReturnTransition(ret.status, nextStatus)) {
    const e = new Error(
      `Cannot transition return from ${ret.status} to ${nextStatus}. ` +
      `Allowed: ${getValidNextStatuses(ret.status).join(', ') || 'none'}`
    );
    e.code = 'INVALID_STATUS_TRANSITION';
    throw e;
  }

  const fields = { status: nextStatus };
  if (nextStatus === RETURN_STATUS.REJECTED && reason) fields.reason = String(reason).trim();
  await repos.returnRepo.update(returnId, fields);

  // Restock on Received (items with disposition 'restock').
  if (nextStatus === RETURN_STATUS.RECEIVED && ret.locationId && !ret.stockAppliedAt) {
    try {
      const stockService = require('./stockService');
      const restockItems = (Array.isArray(ret.items) ? ret.items : []).filter(
        (it) => (it.disposition || 'restock') === 'restock'
      );
      if (restockItems.length) {
        await stockService.restock({
          businessId: ret.businessId,
          locationId: ret.locationId,
          items: restockItems,
          refId: returnId,
          createdBy: changedBy || null,
        });
      }
      await repos.returnRepo.update(returnId, { stockAppliedAt: new Date() });
    } catch (stockErr) {
      console.warn('[returnService] restock failed:', stockErr.message);
    }
  }

  return repos.returnRepo.getById(returnId);
}

module.exports = {
  RETURN_STATUS,
  RETURN_STATUS_VALUES,
  ALLOWED_TRANSITIONS,
  isValidReturnTransition,
  getValidNextStatuses,
  changeReturnStatus,
};
