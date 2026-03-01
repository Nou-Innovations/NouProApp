const request = require('supertest');
const bcrypt = require('bcryptjs');

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
const { generateTestToken, authHeader } = require('../helpers/authHelper');

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================================
// POST /api/auth/login
// ============================================================================

describe('POST /api/auth/login', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'Test1234!' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when user is not found', async () => {
    mockRepos.userRepo.getByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'Test1234!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when password is incorrect', async () => {
    const passwordHash = await bcrypt.hash('CorrectPassword1!', 12);
    mockRepos.userRepo.getByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPassword1!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns token on successful login', async () => {
    const passwordHash = await bcrypt.hash('Test1234!', 12);
    mockRepos.userRepo.getByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash,
      twoFactorEnabled: false,
    });
    mockRepos.memberRepo.getByUserId.mockResolvedValue([]);
    mockRepos.userRepo.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Test1234!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('user');
  });
});

// ============================================================================
// POST /api/auth/register
// ============================================================================

describe('POST /api/auth/register', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 409 when phone already exists', async () => {
    mockRepos.userRepo.getByPhone.mockResolvedValue({ id: 'existing-user' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        phone: '12345678',
        password: 'Test1234!',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================================
// GET /api/auth/me
// ============================================================================

describe('GET /api/auth/me', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('returns user profile with valid token', async () => {
    const token = generateTestToken({ sub: 'user-1' });
    mockRepos.userRepo.getById.mockResolvedValue({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
    });
    mockRepos.memberRepo.getByUserId.mockResolvedValue([]);
    mockRepos.connectionRepo.countByUserId.mockResolvedValue(5);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toHaveProperty('id', 'user-1');
    expect(res.body.data.user).toHaveProperty('connectionsCount', 5);
  });

  it('returns 404 when user is not found in database', async () => {
    const token = generateTestToken({ sub: 'deleted-user' });
    mockRepos.userRepo.getById.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
