const {
  ORDER_STATUS,
  ORDER_STATUS_META,
  ALLOWED_TRANSITIONS,
  MIN_REASON_LENGTH,
  requiresReason,
  isValidTransition,
  getValidNextStatuses,
  isFinalStatus,
  canEditInStatus,
  getStatusLabel,
  getStatusSortRank,
  getStatusMeta,
  changeOrderStatus,
} = require('../../src/services/orderStatus');

// Mock the repository layer
const { createMockRepos } = require('../mocks/repositories');

let mockRepos;
jest.mock('../../src/repositories', () => ({
  getRepos: () => mockRepos,
}));

beforeEach(() => {
  mockRepos = createMockRepos();
});

// ============================================================================
// CONSTANTS
// ============================================================================

describe('ORDER_STATUS', () => {
  it('contains all 8 expected statuses', () => {
    const expected = ['NEW', 'ACCEPTED', 'ONGOING', 'PENDING', 'IN_REVIEW', 'DONE', 'CANCELED', 'REJECTED'];
    expect(Object.keys(ORDER_STATUS)).toEqual(expect.arrayContaining(expected));
    expect(Object.keys(ORDER_STATUS)).toHaveLength(8);
  });

  it('every status has metadata defined', () => {
    for (const status of Object.values(ORDER_STATUS)) {
      expect(ORDER_STATUS_META[status]).toBeDefined();
      expect(ORDER_STATUS_META[status]).toHaveProperty('label');
      expect(ORDER_STATUS_META[status]).toHaveProperty('isFinal');
      expect(ORDER_STATUS_META[status]).toHaveProperty('requiresReason');
      expect(ORDER_STATUS_META[status]).toHaveProperty('blocksEdits');
      expect(ORDER_STATUS_META[status]).toHaveProperty('sortRank');
    }
  });
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

describe('requiresReason()', () => {
  it('returns true for PENDING', () => {
    expect(requiresReason('PENDING')).toBe(true);
  });

  it('returns true for CANCELED', () => {
    expect(requiresReason('CANCELED')).toBe(true);
  });

  it('returns true for REJECTED', () => {
    expect(requiresReason('REJECTED')).toBe(true);
  });

  it('returns false for NEW', () => {
    expect(requiresReason('NEW')).toBe(false);
  });

  it('returns false for ACCEPTED', () => {
    expect(requiresReason('ACCEPTED')).toBe(false);
  });

  it('returns false for unknown status', () => {
    expect(requiresReason('UNKNOWN')).toBe(false);
  });
});

describe('isValidTransition()', () => {
  // Valid transitions
  const validTransitions = [
    ['NEW', 'ACCEPTED'],
    ['NEW', 'PENDING'],
    ['NEW', 'CANCELED'],
    ['NEW', 'REJECTED'],
    ['ACCEPTED', 'ONGOING'],
    ['ACCEPTED', 'PENDING'],
    ['ACCEPTED', 'CANCELED'],
    ['ONGOING', 'IN_REVIEW'],
    ['ONGOING', 'DONE'],
    ['ONGOING', 'PENDING'],
    ['ONGOING', 'CANCELED'],
    ['PENDING', 'ACCEPTED'],
    ['PENDING', 'ONGOING'],
    ['PENDING', 'CANCELED'],
    ['IN_REVIEW', 'DONE'],
    ['IN_REVIEW', 'PENDING'],
    ['IN_REVIEW', 'CANCELED'],
  ];

  it.each(validTransitions)('allows %s → %s', (from, to) => {
    expect(isValidTransition(from, to)).toBe(true);
  });

  // Invalid transitions
  const invalidTransitions = [
    ['DONE', 'NEW'],
    ['DONE', 'ACCEPTED'],
    ['CANCELED', 'NEW'],
    ['CANCELED', 'ONGOING'],
    ['REJECTED', 'NEW'],
    ['REJECTED', 'ACCEPTED'],
    ['NEW', 'DONE'],
    ['NEW', 'ONGOING'],
    ['ACCEPTED', 'NEW'],
    ['ACCEPTED', 'REJECTED'],
  ];

  it.each(invalidTransitions)('rejects %s → %s', (from, to) => {
    expect(isValidTransition(from, to)).toBe(false);
  });

  it('returns false for unknown from-status', () => {
    expect(isValidTransition('UNKNOWN', 'NEW')).toBe(false);
  });
});

describe('getValidNextStatuses()', () => {
  it('returns 4 options for NEW', () => {
    const next = getValidNextStatuses('NEW');
    expect(next).toEqual(['ACCEPTED', 'PENDING', 'CANCELED', 'REJECTED']);
  });

  it('returns empty for DONE (terminal)', () => {
    expect(getValidNextStatuses('DONE')).toEqual([]);
  });

  it('returns empty for CANCELED (terminal)', () => {
    expect(getValidNextStatuses('CANCELED')).toEqual([]);
  });

  it('returns empty for REJECTED (terminal)', () => {
    expect(getValidNextStatuses('REJECTED')).toEqual([]);
  });

  it('returns empty for unknown status', () => {
    expect(getValidNextStatuses('UNKNOWN')).toEqual([]);
  });
});

describe('isFinalStatus()', () => {
  it('returns true for DONE', () => {
    expect(isFinalStatus('DONE')).toBe(true);
  });

  it('returns true for CANCELED', () => {
    expect(isFinalStatus('CANCELED')).toBe(true);
  });

  it('returns true for REJECTED', () => {
    expect(isFinalStatus('REJECTED')).toBe(true);
  });

  it('returns false for NEW', () => {
    expect(isFinalStatus('NEW')).toBe(false);
  });

  it('returns false for ONGOING', () => {
    expect(isFinalStatus('ONGOING')).toBe(false);
  });

  it('returns false for unknown status', () => {
    expect(isFinalStatus('UNKNOWN')).toBe(false);
  });
});

describe('canEditInStatus()', () => {
  it('allows edits in NEW', () => {
    expect(canEditInStatus('NEW')).toBe(true);
  });

  it('allows edits in PENDING', () => {
    expect(canEditInStatus('PENDING')).toBe(true);
  });

  it('blocks edits in ACCEPTED', () => {
    expect(canEditInStatus('ACCEPTED')).toBe(false);
  });

  it('blocks edits in ONGOING', () => {
    expect(canEditInStatus('ONGOING')).toBe(false);
  });

  it('blocks edits in DONE', () => {
    expect(canEditInStatus('DONE')).toBe(false);
  });

  it('returns true for unknown status (permissive default)', () => {
    expect(canEditInStatus('UNKNOWN')).toBe(true);
  });
});

describe('getStatusLabel()', () => {
  it('returns "New order" for NEW', () => {
    expect(getStatusLabel('NEW')).toBe('New order');
  });

  it('returns "Done" for DONE', () => {
    expect(getStatusLabel('DONE')).toBe('Done');
  });

  it('returns raw status for unknown status', () => {
    expect(getStatusLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});

describe('getStatusSortRank()', () => {
  it('NEW has lowest rank (appears first)', () => {
    expect(getStatusSortRank('NEW')).toBe(10);
  });

  it('REJECTED has highest rank (appears last)', () => {
    expect(getStatusSortRank('REJECTED')).toBe(80);
  });

  it('sort ranks are in ascending order from active to terminal', () => {
    const ranks = ['NEW', 'ACCEPTED', 'ONGOING', 'PENDING', 'IN_REVIEW', 'DONE', 'CANCELED', 'REJECTED']
      .map(getStatusSortRank);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThan(ranks[i - 1]);
    }
  });

  it('returns 999 for unknown status', () => {
    expect(getStatusSortRank('UNKNOWN')).toBe(999);
  });
});

describe('getStatusMeta()', () => {
  it('returns full metadata object for valid status', () => {
    const meta = getStatusMeta('NEW');
    expect(meta).toEqual({
      label: 'New order',
      isFinal: false,
      requiresReason: false,
      blocksEdits: false,
      sortRank: 10,
    });
  });

  it('returns null for unknown status', () => {
    expect(getStatusMeta('UNKNOWN')).toBeNull();
  });
});

// ============================================================================
// changeOrderStatus()
// ============================================================================

describe('changeOrderStatus()', () => {
  const baseOrder = {
    id: 'order-1',
    status: 'NEW',
    businessId: 'biz-1',
    fulfillmentLocationId: 'loc-1',
    items: [{ productId: 'prod-1', quantity: 5 }],
  };

  it('transitions order from NEW → ACCEPTED', async () => {
    mockRepos.orderRepo.getById.mockResolvedValue(baseOrder);
    mockRepos.orderRepo.changeStatusWithHistory.mockResolvedValue({
      ...baseOrder,
      status: 'ACCEPTED',
    });
    mockRepos.stockRepo.getByLocationAndProduct.mockResolvedValue({ qtyOnHand: 100 });
    mockRepos.stockRepo.upsert.mockResolvedValue({});

    const result = await changeOrderStatus({
      orderId: 'order-1',
      nextStatus: 'ACCEPTED',
      userId: 'user-1',
    });

    expect(result.status).toBe('ACCEPTED');
    expect(mockRepos.orderRepo.changeStatusWithHistory).toHaveBeenCalledWith(
      'order-1',
      expect.objectContaining({ status: 'ACCEPTED' }),
      expect.objectContaining({ from: 'NEW', to: 'ACCEPTED' }),
    );
  });

  it('decrements stock when transitioning to ACCEPTED', async () => {
    mockRepos.orderRepo.getById.mockResolvedValue(baseOrder);
    mockRepos.orderRepo.changeStatusWithHistory.mockResolvedValue({
      ...baseOrder,
      status: 'ACCEPTED',
    });
    mockRepos.stockRepo.getByLocationAndProduct.mockResolvedValue({ qtyOnHand: 100 });
    mockRepos.stockRepo.upsert.mockResolvedValue({});

    await changeOrderStatus({
      orderId: 'order-1',
      nextStatus: 'ACCEPTED',
      userId: 'user-1',
    });

    expect(mockRepos.stockRepo.getByLocationAndProduct).toHaveBeenCalledWith('loc-1', 'prod-1');
    expect(mockRepos.stockRepo.upsert).toHaveBeenCalledWith('loc-1', 'prod-1', 95, 'biz-1');
  });

  it('restores stock when canceling from an active state', async () => {
    const acceptedOrder = { ...baseOrder, status: 'ACCEPTED' };
    mockRepos.orderRepo.getById.mockResolvedValue(acceptedOrder);
    mockRepos.orderRepo.changeStatusWithHistory.mockResolvedValue({
      ...acceptedOrder,
      status: 'CANCELED',
    });
    mockRepos.stockRepo.getByLocationAndProduct.mockResolvedValue({ qtyOnHand: 95 });
    mockRepos.stockRepo.upsert.mockResolvedValue({});

    await changeOrderStatus({
      orderId: 'order-1',
      nextStatus: 'CANCELED',
      reason: 'Customer requested cancellation',
      userId: 'user-1',
    });

    // Stock should be restored: 95 + 5 = 100
    expect(mockRepos.stockRepo.upsert).toHaveBeenCalledWith('loc-1', 'prod-1', 100, 'biz-1');
  });

  it('does NOT restore stock when canceling from NEW (never decremented)', async () => {
    mockRepos.orderRepo.getById.mockResolvedValue(baseOrder);
    mockRepos.orderRepo.changeStatusWithHistory.mockResolvedValue({
      ...baseOrder,
      status: 'CANCELED',
    });

    await changeOrderStatus({
      orderId: 'order-1',
      nextStatus: 'CANCELED',
      reason: 'Changed my mind',
      userId: 'user-1',
    });

    expect(mockRepos.stockRepo.upsert).not.toHaveBeenCalled();
  });

  it('throws ORDER_NOT_FOUND for non-existent order', async () => {
    mockRepos.orderRepo.getById.mockResolvedValue(null);

    await expect(
      changeOrderStatus({ orderId: 'no-such-order', nextStatus: 'ACCEPTED' })
    ).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
  });

  it('throws INVALID_STATUS for unknown target status', async () => {
    await expect(
      changeOrderStatus({ orderId: 'order-1', nextStatus: 'FLYING' })
    ).rejects.toMatchObject({ code: 'INVALID_STATUS' });
  });

  it('throws INVALID_STATUS_TRANSITION for disallowed transition', async () => {
    mockRepos.orderRepo.getById.mockResolvedValue({ ...baseOrder, status: 'DONE' });

    await expect(
      changeOrderStatus({ orderId: 'order-1', nextStatus: 'NEW' })
    ).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
  });

  it('throws STATUS_REASON_REQUIRED when reason missing for CANCELED', async () => {
    mockRepos.orderRepo.getById.mockResolvedValue(baseOrder);

    await expect(
      changeOrderStatus({ orderId: 'order-1', nextStatus: 'CANCELED' })
    ).rejects.toMatchObject({ code: 'STATUS_REASON_REQUIRED' });
  });

  it('throws STATUS_REASON_REQUIRED when reason is too short', async () => {
    mockRepos.orderRepo.getById.mockResolvedValue(baseOrder);

    await expect(
      changeOrderStatus({ orderId: 'order-1', nextStatus: 'CANCELED', reason: 'x' })
    ).rejects.toMatchObject({ code: 'STATUS_REASON_REQUIRED' });
  });

  it('trims the reason string', async () => {
    mockRepos.orderRepo.getById.mockResolvedValue(baseOrder);
    mockRepos.orderRepo.changeStatusWithHistory.mockResolvedValue({
      ...baseOrder,
      status: 'CANCELED',
    });

    await changeOrderStatus({
      orderId: 'order-1',
      nextStatus: 'CANCELED',
      reason: '  Cancelled by customer  ',
      userId: 'user-1',
    });

    expect(mockRepos.orderRepo.changeStatusWithHistory).toHaveBeenCalledWith(
      'order-1',
      expect.objectContaining({ statusReason: 'Cancelled by customer' }),
      expect.objectContaining({ reason: 'Cancelled by customer' }),
    );
  });
});
