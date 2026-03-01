const request = require('supertest');

// Mock Prisma before requiring the app
jest.mock('../../src/db/prisma', () => ({
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    order: { findMany: jest.fn() },
  },
}));

// Mock repositories
const { createMockRepos } = require('../mocks/repositories');
const mockRepos = createMockRepos();
jest.mock('../../src/repositories', () => ({
  getRepos: () => mockRepos,
  getDataSource: () => 'prisma',
}));

const { app } = require('../../server');
const { generateTestToken } = require('../helpers/authHelper');

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================================
// GET /api/companies/:companyId/orders
// ============================================================================

describe('GET /api/companies/:companyId/orders', () => {
  const companyId = 'company-1';
  const url = `/api/companies/${companyId}/orders`;

  it('returns 401 without auth token', async () => {
    const res = await request(app).get(url);
    expect(res.status).toBe(401);
  });

  it('returns orders for authenticated user who is a member', async () => {
    const token = generateTestToken({ sub: 'user-1' });

    // getUserFromRequest looks up user in DB
    mockRepos.userRepo.getById.mockResolvedValue({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
    });

    // isBusinessMember calls getBusinessMember
    mockRepos.memberRepo.getBusinessMember.mockResolvedValue({
      id: 'member-1',
      businessId: companyId,
      userId: 'user-1',
      role: 'admin',
      status: 'accepted',
    });

    // Orders for this company
    mockRepos.orderRepo.getByBusinessId.mockResolvedValue([
      { id: 'order-1', status: 'NEW', customerName: 'Alice', createdAt: '2024-01-01' },
      { id: 'order-2', status: 'DONE', customerName: 'Bob', createdAt: '2024-01-02' },
    ]);

    const res = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ============================================================================
// PATCH /api/companies/:companyId/orders/:orderId/status
// ============================================================================

describe('PATCH /api/companies/:companyId/orders/:orderId/status', () => {
  const companyId = 'company-1';
  const orderId = 'order-1';
  const url = `/api/companies/${companyId}/orders/${orderId}/status`;

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .patch(url)
      .send({ status: 'ACCEPTED' });
    expect(res.status).toBe(401);
  });
});
