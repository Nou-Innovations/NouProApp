const logger = require('../utils/logger');
/**
 * Authentication Middleware
 * 
 * Provides JWT-based authentication for protected routes.
 * 
 * Usage:
 *   const { requireAuth, optionalAuth } = require('./src/middleware/auth');
 *   
 *   // Require authentication (returns 401 if no valid token)
 *   app.post('/api/orders', requireAuth, (req, res) => {
 *     logger.debug(req.user.id); // User ID from token
 *   });
 *   
 *   // Optional authentication (continues even without token)
 *   app.get('/api/products', optionalAuth, (req, res) => {
 *     if (req.user) { ... } // User is authenticated
 *   });
 */

const jwt = require('jsonwebtoken');

/**
 * SECURITY (AUTH-1): token types that must NEVER authenticate an ordinary request.
 *
 * Every token kind is signed with the same JWT_SECRET and carries the real user id in
 * `sub`, so without this check any of them works as an access token. That made 2FA
 * worthless (the pre-TOTP `2fa_pending` ticket authenticated everything), turned a
 * password-reset link into a 15-minute API key, and let a 30-day refresh token bypass
 * the session/tokenVersion revocation that only runs on /api/auth/refresh.
 *
 * This is the deny-list half of a two-phase rollout. A token with NO `type` claim is
 * still accepted, because access tokens minted before this shipped have no `type` and
 * rejecting them would sign out every logged-in user. That is safe: all four confusable
 * kinds set `type` explicitly, so denying them blocks the whole attack.
 *
 * PHASE 2 (deploy >= 24h after this one): access tokens now carry `type: 'access'` at
 * all three mint sites, and they live 30 minutes, so untyped tokens are extinct shortly
 * after this deploys. Swap the three `isNonAccessToken()` call sites for a strict
 * `claims.type === 'access'` allow-list. Sites: requireAuth and optionalAuth below, plus
 * the Socket.IO handshake in server.js.
 */
const NON_ACCESS_TOKEN_TYPES = new Set([
  'refresh',
  'password_reset',
  '2fa_pending',
  'contact_verified',
]);

/**
 * True if these claims belong to a special-purpose token that must not authenticate
 * a normal request. Each such flow validates its own `type` at its own endpoint.
 */
function isNonAccessToken(claims) {
  return !!claims && NON_ACCESS_TOKEN_TYPES.has(claims.type);
}

/**
 * Extract and verify JWT token from Authorization header
 *
 * NOTE: deliberately does NOT check the token `type`. Five flows share this primitive
 * and each asserts its own expected type at its endpoint (password reset, refresh, 2FA
 * verify, contact verification, socket handshake). Enforcing a type here would break
 * all of them at once. Callers that need an ACCESS token must use isNonAccessToken().
 *
 * @param {string} authHeader - Authorization header value
 * @returns {{ user: object } | { error: string }}
 */
function verifyToken(authHeader) {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return { error: 'NO_TOKEN' };
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error('[Auth] JWT_SECRET is not configured');
    return { error: 'JWT_SECRET_MISSING' };
  }

  try {
    // SECURITY (AUTH-13): pin the algorithm. jsonwebtoken 9 already rejects `alg: none`
    // when a key is supplied, so this is not exploitable today — it removes the whole
    // algorithm-confusion class rather than relying on a library default staying put.
    // generateToken() below signs with the HS256 default, so this matches.
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    
    // Support multiple claim formats for user ID
    const userId = payload.sub || payload.userId || payload.id;
    
    if (!userId) {
      return { error: 'INVALID_TOKEN_PAYLOAD' };
    }

    return {
      user: {
        id: userId,
        email: payload.email || null,
        name: payload.name || null,
        role: payload.role || null,
        // Include full payload for extensibility
        claims: payload,
      },
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { error: 'TOKEN_EXPIRED' };
    }
    if (err.name === 'JsonWebTokenError') {
      return { error: 'INVALID_TOKEN' };
    }
    return { error: 'UNAUTHORIZED' };
  }
}

/**
 * Middleware that requires valid JWT authentication.
 * Returns 401 Unauthorized if token is missing or invalid.
 * 
 * On success, sets req.user with:
 *   - id: User ID from token
 *   - email: User email (if present in token)
 *   - role: User role (if present in token)
 *   - claims: Full token payload
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const result = verifyToken(authHeader);

  if (result.error) {
    const statusCode = result.error === 'JWT_SECRET_MISSING' ? 500 : 401;
    return res.status(statusCode).json({
      error: result.error,
      message: getErrorMessage(result.error),
    });
  }

  // SECURITY (AUTH-1): a special-purpose token (refresh / password reset / 2FA-pending /
  // contact-verified) must never authenticate a normal request. PHASE 2: replace with a
  // strict `result.user.claims?.type !== 'access'` allow-list.
  if (isNonAccessToken(result.user.claims)) {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: getErrorMessage('INVALID_TOKEN'),
    });
  }

  req.user = result.user;
  next();
}

/**
 * Middleware that optionally extracts user from JWT.
 * Does NOT return error if token is missing - allows anonymous access.
 * If token is present but invalid, still continues (req.user will be null).
 * 
 * Useful for routes that behave differently for authenticated vs anonymous users.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  
  if (!authHeader) {
    req.user = null;
    return next();
  }

  const result = verifyToken(authHeader);
  // SECURITY (AUTH-1): same rule as requireAuth, but this middleware must not throw —
  // it gates routes that legitimately serve anonymous callers, so a special-purpose
  // token degrades to anonymous rather than 401.
  // PHASE 2: replace with a strict `claims?.type === 'access'` allow-list.
  if (result.user && isNonAccessToken(result.user.claims)) {
    req.user = null;
    return next();
  }
  req.user = result.user || null;
  next();
}

/**
 * Get human-readable error message for auth errors
 */
function getErrorMessage(errorCode) {
  const messages = {
    NO_TOKEN: 'Authentication required. Please provide a valid Bearer token.',
    JWT_SECRET_MISSING: 'Server configuration error. Please contact support.',
    INVALID_TOKEN_PAYLOAD: 'Token is missing required user information.',
    TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
    INVALID_TOKEN: 'Invalid authentication token.',
    UNAUTHORIZED: 'Authentication failed.',
  };
  return messages[errorCode] || 'Authentication failed.';
}

/**
 * Helper to generate JWT tokens (for testing or login endpoints)
 * 
 * @param {object} payload - Token payload (must include sub or userId or id)
 * @param {object} options - JWT sign options (e.g., expiresIn)
 * @returns {string} Signed JWT token
 */
function generateToken(payload, options = {}) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  const defaultOptions = {
    expiresIn: '30m', // 30 minutes -- refresh token handles long sessions
    ...options,
  };
  
  return jwt.sign(payload, secret, defaultOptions);
}

module.exports = {
  requireAuth,
  optionalAuth,
  verifyToken,
  generateToken,
  isNonAccessToken,
  NON_ACCESS_TOKEN_TYPES,
};
