const crypto = require('crypto');
const logger = require('../utils/logger');
/**
 * Automation-endpoint API-key guard.
 *
 * Extracted verbatim from server.js (Phase 1 modularization). Protects the
 * cron-callable automation endpoints (e.g. Render cron jobs) with a shared
 * API key. Fails CLOSED: if AUTOMATION_API_KEY is unset, every request is
 * rejected (503).
 *
 * Contract is preserved exactly: `requireAutomationAuth(req, res)` returns a
 * boolean and writes the error response itself — it is NOT (req,res,next)
 * middleware. Callers do: `if (!requireAutomationAuth(req, res)) return;`
 *
 * @param {(message: string, code?: string) => object} errorResponse
 */
/**
 * SECURITY (ABUSE-2): constant-time key comparison.
 *
 * `a !== b` on strings short-circuits at the first differing byte, so response time leaks
 * how much of the key an attacker has guessed — turning an infeasible search into a
 * byte-at-a-time one. Realistically hard to exploit across a network behind Cloudflare,
 * but it is a few lines to remove the class entirely.
 *
 * Both operands are hashed to a fixed 32 bytes first. timingSafeEqual throws on a length
 * mismatch, and comparing raw values would leak the key's length through that branch;
 * hashing makes every comparison the same shape regardless of what was supplied.
 */
function timingSafeMatch(supplied, expected) {
  if (typeof supplied !== 'string' || typeof expected !== 'string' || !supplied || !expected) {
    return false;
  }
  const a = crypto.createHash('sha256').update(supplied).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = (errorResponse) => {
  const AUTOMATION_API_KEY = process.env.AUTOMATION_API_KEY;
  if (!AUTOMATION_API_KEY) {
    logger.warn('[SECURITY] AUTOMATION_API_KEY not set -- automation endpoints will reject all requests');
  }

  function requireAutomationAuth(req, res) {
    // SECURITY: Fail closed if no API key is configured
    if (!AUTOMATION_API_KEY) {
      res.status(503).json(errorResponse('Automation endpoints are not configured', 'NOT_CONFIGURED'));
      return false;
    }
    const headerKey = req.headers['x-automation-key'];
    const queryKey = req.query?.key;

    // SECURITY (ABUSE-2 / ABUSE-6): a key in the query string lands in Render access logs,
    // Cloudflare analytics and any Referer — it should be header-only. It is still accepted
    // because the renewal cron may be configured this way and that job charges cards;
    // breaking it silently is worse than the log exposure. This warning is the signal to
    // remove the fallback: once it stops appearing in production logs, delete `queryKey`.
    if (!headerKey && queryKey) {
      logger.warn(
        `[SECURITY] automation key supplied via query string on ${req.method} ${req.path} — ` +
        'switch the caller to the x-automation-key header; this fallback will be removed.'
      );
    }

    const apiKey = headerKey || queryKey;
    if (!timingSafeMatch(apiKey, AUTOMATION_API_KEY)) {
      res.status(401).json(errorResponse('Unauthorized', 'UNAUTHORIZED'));
      return false;
    }
    return true;
  }

  return requireAutomationAuth;
};

// Exported for tests.
module.exports.timingSafeMatch = timingSafeMatch;
