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

describe('GET /api/health', () => {
  it('returns 200 with status OK', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('status', 'OK');
    expect(res.body.data).toHaveProperty('timestamp');
  });
});
