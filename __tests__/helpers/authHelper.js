const jwt = require('jsonwebtoken');

const TEST_SECRET = 'test-secret-key-for-jest';

/**
 * Generate a valid JWT token for testing.
 * @param {Object} overrides - Override default claims
 * @returns {string} Signed JWT
 */
function generateTestToken(overrides = {}) {
  const payload = {
    sub: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    ...overrides,
  };
  return jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
}

/**
 * Generate an expired JWT token for testing.
 */
function generateExpiredToken(overrides = {}) {
  const payload = {
    sub: 'test-user-id',
    email: 'test@example.com',
    ...overrides,
  };
  return jwt.sign(payload, TEST_SECRET, { expiresIn: '-1s' });
}

/**
 * Return the Authorization header value for a test token.
 */
function authHeader(overrides = {}) {
  return `Bearer ${generateTestToken(overrides)}`;
}

module.exports = {
  TEST_SECRET,
  generateTestToken,
  generateExpiredToken,
  authHeader,
};
