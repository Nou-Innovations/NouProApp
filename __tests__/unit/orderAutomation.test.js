// Set DATA_SOURCE to 'prisma' BEFORE the module loads so it initializes the prisma variable
const originalDataSource = process.env.DATA_SOURCE;
process.env.DATA_SOURCE = 'prisma';

// Mock prisma to prevent real DB calls (must be before requiring the module)
jest.mock('../../src/db/prisma', () => ({
  prisma: {
    order: {
      findMany: jest.fn(),
    },
  },
}));

// Mock changeOrderStatus to prevent real repo calls
jest.mock('../../src/services/orderStatus', () => {
  const actual = jest.requireActual('../../src/services/orderStatus');
  return {
    ...actual,
    changeOrderStatus: jest.fn(),
  };
});

// Mock repositories (required by orderStatus)
jest.mock('../../src/repositories', () => ({
  getRepos: () => ({}),
}));

const {
  DEFAULT_SETTINGS,
  getActiveStatuses,
  autoCancelStaleOrders,
  getStuckPendingReport,
} = require('../../src/services/orderAutomation');

const { changeOrderStatus } = require('../../src/services/orderStatus');
const { prisma } = require('../../src/db/prisma');

afterAll(() => {
  process.env.DATA_SOURCE = originalDataSource;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================================
// getActiveStatuses()
// ============================================================================

describe('getActiveStatuses()', () => {
  it('returns only non-final statuses', () => {
    const active = getActiveStatuses();
    expect(active).toContain('NEW');
    expect(active).toContain('ACCEPTED');
    expect(active).toContain('ONGOING');
    expect(active).toContain('PENDING');
    expect(active).toContain('IN_REVIEW');
    expect(active).not.toContain('DONE');
    expect(active).not.toContain('CANCELED');
    expect(active).not.toContain('REJECTED');
  });

  it('returns exactly 5 active statuses', () => {
    expect(getActiveStatuses()).toHaveLength(5);
  });
});

// ============================================================================
// DEFAULT_SETTINGS
// ============================================================================

describe('DEFAULT_SETTINGS', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_SETTINGS.autoCancelNewAfterHours).toBe(48);
    expect(DEFAULT_SETTINGS.pendingReminderAfterHours).toBe(72);
    expect(DEFAULT_SETTINGS.systemUserId).toBe('SYSTEM');
  });
});

// ============================================================================
// autoCancelStaleOrders()
// ============================================================================

describe('autoCancelStaleOrders()', () => {
  it('dry run returns stale orders without canceling', async () => {
    prisma.order.findMany.mockResolvedValue([
      { id: 'order-1', businessId: 'biz-1', customerName: 'Alice' },
      { id: 'order-2', businessId: 'biz-1', customerName: 'Bob' },
    ]);

    const result = await autoCancelStaleOrders({ dryRun: true });

    expect(result.total).toBe(2);
    expect(result.canceled).toBe(0);
    expect(result.orders).toHaveLength(2);
    expect(changeOrderStatus).not.toHaveBeenCalled();
  });

  it('cancels stale orders and reports results', async () => {
    prisma.order.findMany.mockResolvedValue([
      { id: 'order-1', businessId: 'biz-1', customerName: 'Alice' },
    ]);
    changeOrderStatus.mockResolvedValue({ id: 'order-1', status: 'CANCELED' });

    const result = await autoCancelStaleOrders();

    expect(result.canceled).toBe(1);
    expect(result.failed).toBe(0);
    expect(changeOrderStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        nextStatus: 'CANCELED',
        userId: 'SYSTEM',
      }),
    );
  });

  it('handles cancellation failures gracefully', async () => {
    prisma.order.findMany.mockResolvedValue([
      { id: 'order-1', businessId: 'biz-1', customerName: 'Alice' },
    ]);
    changeOrderStatus.mockRejectedValue(new Error('DB connection failed'));

    const result = await autoCancelStaleOrders();

    expect(result.canceled).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      orderId: 'order-1',
      error: 'DB connection failed',
    });
  });

  it('returns empty results when no stale orders exist', async () => {
    prisma.order.findMany.mockResolvedValue([]);

    const result = await autoCancelStaleOrders();

    expect(result.total).toBe(0);
    expect(result.canceled).toBe(0);
  });
});

// ============================================================================
// getStuckPendingReport()
// ============================================================================

describe('getStuckPendingReport()', () => {
  it('groups stuck orders by business', async () => {
    prisma.order.findMany.mockResolvedValue([
      { id: 'order-1', businessId: 'biz-1', customerName: 'Alice' },
      { id: 'order-2', businessId: 'biz-2', customerName: 'Bob' },
      { id: 'order-3', businessId: 'biz-1', customerName: 'Charlie' },
    ]);

    const result = await getStuckPendingReport();

    expect(result.total).toBe(3);
    expect(result.byBusiness['biz-1']).toHaveLength(2);
    expect(result.byBusiness['biz-2']).toHaveLength(1);
  });

  it('returns empty when no stuck orders', async () => {
    prisma.order.findMany.mockResolvedValue([]);

    const result = await getStuckPendingReport();

    expect(result.total).toBe(0);
    expect(result.byBusiness).toEqual({});
  });
});
