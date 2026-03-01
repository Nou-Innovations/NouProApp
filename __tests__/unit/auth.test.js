const jwt = require('jsonwebtoken');
const { verifyToken, requireAuth, optionalAuth, generateToken } = require('../../src/middleware/auth');
const { TEST_SECRET, generateTestToken, generateExpiredToken } = require('../helpers/authHelper');

// ============================================================================
// verifyToken()
// ============================================================================

describe('verifyToken()', () => {
  it('returns user for a valid Bearer token', () => {
    const token = generateTestToken({ sub: 'user-123', email: 'a@b.com' });
    const result = verifyToken(`Bearer ${token}`);
    expect(result.user).toBeDefined();
    expect(result.user.id).toBe('user-123');
    expect(result.user.email).toBe('a@b.com');
  });

  it('returns NO_TOKEN when header is null', () => {
    expect(verifyToken(null)).toEqual({ error: 'NO_TOKEN' });
  });

  it('returns NO_TOKEN when header is empty string', () => {
    expect(verifyToken('')).toEqual({ error: 'NO_TOKEN' });
  });

  it('returns NO_TOKEN when header has no Bearer prefix', () => {
    const token = generateTestToken();
    expect(verifyToken(token)).toEqual({ error: 'NO_TOKEN' });
  });

  it('returns TOKEN_EXPIRED for an expired token', () => {
    const token = generateExpiredToken();
    const result = verifyToken(`Bearer ${token}`);
    expect(result.error).toBe('TOKEN_EXPIRED');
  });

  it('returns INVALID_TOKEN for a malformed token', () => {
    const result = verifyToken('Bearer not.a.valid.jwt');
    expect(result.error).toBe('INVALID_TOKEN');
  });

  it('returns INVALID_TOKEN_PAYLOAD when token has no user ID', () => {
    // Sign a token without sub, userId, or id
    const token = jwt.sign({ email: 'a@b.com' }, TEST_SECRET, { expiresIn: '1h' });
    const result = verifyToken(`Bearer ${token}`);
    expect(result.error).toBe('INVALID_TOKEN_PAYLOAD');
  });

  it('supports "sub" claim for user ID', () => {
    const token = jwt.sign({ sub: 'from-sub' }, TEST_SECRET, { expiresIn: '1h' });
    const result = verifyToken(`Bearer ${token}`);
    expect(result.user.id).toBe('from-sub');
  });

  it('supports "userId" claim for user ID', () => {
    const token = jwt.sign({ userId: 'from-userId' }, TEST_SECRET, { expiresIn: '1h' });
    const result = verifyToken(`Bearer ${token}`);
    expect(result.user.id).toBe('from-userId');
  });

  it('supports "id" claim for user ID', () => {
    const token = jwt.sign({ id: 'from-id' }, TEST_SECRET, { expiresIn: '1h' });
    const result = verifyToken(`Bearer ${token}`);
    expect(result.user.id).toBe('from-id');
  });

  it('returns JWT_SECRET_MISSING when env var is not set', () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      const result = verifyToken('Bearer some-token');
      expect(result.error).toBe('JWT_SECRET_MISSING');
    } finally {
      process.env.JWT_SECRET = originalSecret;
    }
  });
});

// ============================================================================
// requireAuth() middleware
// ============================================================================

describe('requireAuth()', () => {
  function createMockReqRes(authHeader) {
    const req = { headers: { authorization: authHeader || '' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
  }

  it('sets req.user and calls next() on valid token', () => {
    const token = generateTestToken({ sub: 'user-1' });
    const { req, res, next } = createMockReqRes(`Bearer ${token}`);

    requireAuth(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('user-1');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when no token is provided', () => {
    const { req, res, next } = createMockReqRes('');

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'NO_TOKEN' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired token', () => {
    const token = generateExpiredToken();
    const { req, res, next } = createMockReqRes(`Bearer ${token}`);

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'TOKEN_EXPIRED' }),
    );
  });

  it('returns 500 when JWT_SECRET is missing', () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      const { req, res, next } = createMockReqRes('Bearer some-token');
      requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    } finally {
      process.env.JWT_SECRET = originalSecret;
    }
  });
});

// ============================================================================
// optionalAuth() middleware
// ============================================================================

describe('optionalAuth()', () => {
  function createMockReqRes(authHeader) {
    const req = { headers: { authorization: authHeader || '' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
  }

  it('sets req.user when valid token is provided', () => {
    const token = generateTestToken({ sub: 'user-1' });
    const { req, res, next } = createMockReqRes(`Bearer ${token}`);

    optionalAuth(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('user-1');
    expect(next).toHaveBeenCalled();
  });

  it('sets req.user = null when no header is provided', () => {
    const { req, res, next } = createMockReqRes('');

    optionalAuth(req, res, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('sets req.user = null on invalid token (no error response)', () => {
    const { req, res, next } = createMockReqRes('Bearer invalid-jwt');

    optionalAuth(req, res, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ============================================================================
// generateToken()
// ============================================================================

describe('generateToken()', () => {
  it('returns a valid JWT string', () => {
    const token = generateToken({ sub: 'user-1', email: 'a@b.com' });
    expect(typeof token).toBe('string');
    const decoded = jwt.verify(token, TEST_SECRET);
    expect(decoded.sub).toBe('user-1');
  });

  it('defaults to 30m expiry', () => {
    const token = generateToken({ sub: 'user-1' });
    const decoded = jwt.decode(token);
    // exp - iat should be approximately 1800 seconds (30 min)
    expect(decoded.exp - decoded.iat).toBe(1800);
  });

  it('respects custom expiresIn option', () => {
    const token = generateToken({ sub: 'user-1' }, { expiresIn: '1h' });
    const decoded = jwt.decode(token);
    expect(decoded.exp - decoded.iat).toBe(3600);
  });

  it('throws when JWT_SECRET is not set', () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      expect(() => generateToken({ sub: 'user-1' })).toThrow('JWT_SECRET is not configured');
    } finally {
      process.env.JWT_SECRET = originalSecret;
    }
  });
});
