/**
 * Standard API response formatters.
 *
 * Extracted verbatim from server.js (Phase 1 modularization). Pure functions —
 * no runtime dependencies. The backend response contract is:
 *   { success: boolean, data?: T, error?: {...}, message: string }
 */

// Success envelope: { success: true, data, message }
const successResponse = (data, message = 'Success') => ({
  success: true,
  data,
  message,
});

// Error envelope: { success: false, error: { code, message }, message }
const errorResponse = (message, code = 'ERROR') => ({
  success: false,
  error: { code, message },
  message,
});

// Standardized paywall/plan-gated error response
const paywallResponse = (message, triggerId, requiredPlan = 'pro') => ({
  success: false,
  error: { code: 'PAYWALL', triggerId, requiredPlan, message },
  message,
});

// Error wrapper for try/catch handlers — writes the response directly.
function sendError(res, err) {
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message || 'Server error' });
}

module.exports = {
  successResponse,
  errorResponse,
  paywallResponse,
  sendError,
};
