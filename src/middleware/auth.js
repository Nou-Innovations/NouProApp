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
 *     console.log(req.user.id); // User ID from token
 *   });
 *   
 *   // Optional authentication (continues even without token)
 *   app.get('/api/products', optionalAuth, (req, res) => {
 *     if (req.user) { ... } // User is authenticated
 *   });
 */

const jwt = require('jsonwebtoken');

/**
 * Extract and verify JWT token from Authorization header
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
    console.error('[Auth] JWT_SECRET is not configured');
    return { error: 'JWT_SECRET_MISSING' };
  }

  try {
    const payload = jwt.verify(token, secret);
    
    // Support multiple claim formats for user ID
    const userId = payload.sub || payload.userId || payload.id;
    
    if (!userId) {
      return { error: 'INVALID_TOKEN_PAYLOAD' };
    }

    return {
      user: {
        id: userId,
        email: payload.email || null,
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
    expiresIn: '7d', // Default 7 days
    ...options,
  };
  
  return jwt.sign(payload, secret, defaultOptions);
}

module.exports = {
  requireAuth,
  optionalAuth,
  verifyToken,
  generateToken,
};
