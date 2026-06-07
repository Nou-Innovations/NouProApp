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
    const apiKey = req.headers['x-automation-key'] || req.query.key;
    if (apiKey !== AUTOMATION_API_KEY) {
      res.status(401).json(errorResponse('Unauthorized', 'UNAUTHORIZED'));
      return false;
    }
    return true;
  }

  return requireAutomationAuth;
};
