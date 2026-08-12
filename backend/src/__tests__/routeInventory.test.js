'use strict';

/**
 * Route inventory guard (audit Batch F).
 *
 * The audit's whole coverage problem was that nobody could say which routes were public.
 * Answering it took a full manual sweep of 353 handlers — and the answer goes stale the
 * moment someone adds a route.
 *
 * This pins it. Every route with no auth middleware on its definition line must appear in
 * ALLOWED_UNAUTHENTICATED below. Adding a public route is then a deliberate act with a
 * written justification, instead of something that slips in and is found by the next audit.
 *
 * It parses the source rather than introspecting the Express router, because the router
 * cannot tell you *why* a route is public — and the reason is the part worth reviewing.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SERVER = path.resolve(__dirname, '..', '..', 'server.js');
const AUTH_TOKENS = ['requireAuth', 'optionalAuth', 'requireAutomationAuth'];

/**
 * Routes that are intentionally reachable without auth middleware, and why.
 *
 * Removing an entry is fine. ADDING one means you are opening a new public surface —
 * check it cannot enumerate or return tenant data before you do.
 */
const ALLOWED_UNAUTHENTICATED = new Map([
  // Static pages, no data access.
  ['GET /legal/privacy', 'static legal page linked from the store listings'],
  ['GET /legal/terms', 'static legal page'],
  ['GET /legal/delete-account', 'static page required by the app stores'],
  ['GET /reset-password', 'static page; the token is consumed by the POST, not this'],
  ['GET /join/:companyId', 'static invite landing page'],
  ['GET /p/:productId', 'static product share page'],
  ['GET /u/:idOrSlug', 'static profile share page; renders nothing server-side'],

  // Authentication itself — cannot require a token to obtain a token. All rate-limited.
  ['POST /api/auth/login', 'authLimiter + per-account lockout'],
  ['POST /api/auth/register', 'authLimiter'],
  ['POST /api/auth/refresh', 'refreshLimiter, keyed per user'],
  ['POST /api/auth/forgot-password', 'authLimiter; response is account-independent'],
  ['POST /api/auth/reset-password', 'authLimiter; token is single-use (AUTH-3)'],
  ['POST /api/auth/2fa/verify', 'authLimiter + twoFactorVerifyLimiter keyed on the tempToken'],
  ['POST /api/auth/send-phone-otp', 'authLimiter + per-destination throttle (ABUSE-3)'],
  ['POST /api/auth/verify-phone', 'authLimiter'],
  ['POST /api/auth/send-email-otp', 'authLimiter + per-destination throttle (ABUSE-3)'],
  ['POST /api/auth/verify-email', 'authLimiter'],
  ['GET /api/auth/verification-capabilities', 'returns two booleans about server config'],

  // Public storefront — the product this app sells.
  ['GET /api/public/locations/:locationId', 'publicReadLimiter; published locations only'],
  ['GET /api/public/locations/:locationId/products', 'publicReadLimiter; listed products only'],
  ['POST /api/public/locations/:locationId/orders', 'publicOrderLimiter; prices are server-side'],
  ['GET /api/products', 'publicReadLimiter; listed-only, filtered in-query (ABUSE-7)'],
  ['GET /api/public/profile-card/:idOrSlug', 'publicReadLimiter; name/avatar/headline only, no contact fields, 404s deleted accounts (P-18)'],

  // Static metadata and infrastructure.
  ['GET /api/order-status-meta', 'static enum metadata, no tenant data'],
  ['GET /api/subscription-pricing', 'the public price list'],
  ['GET /api/health', 'uptime probe'],

  // Guarded inside the handler rather than on the definition line.
  ['POST /api/automation/orders', 'requireAutomationAuth called as the first statement'],
  ['GET /api/automation/orders/preview', 'requireAutomationAuth called as the first statement'],
  ['POST /api/automation/subscriptions/renew', 'requireAutomationAuth called as the first statement'],

  // Third-party callbacks.
  ['GET /api/payments/checkout-page/:checkoutId', 'WebView page; id validated, CSP set (INJ-1/INJ-4)'],
  ['POST /api/webhooks/peach', 'webhookLimiter; body is untrusted, status re-fetched from Peach'],
]);

/** Every `app.<method>('<path>', ...)` and whether its definition line carries auth. */
function parseRoutes() {
  const src = fs.readFileSync(SERVER, 'utf8').split('\n');
  const routes = [];
  const def = /^\s*app\.(get|post|put|patch|delete)\(\s*'([^']+)'(.*)$/;
  for (const line of src) {
    const m = line.match(def);
    if (!m) continue;
    const [, method, routePath, rest] = m;
    routes.push({
      key: `${method.toUpperCase()} ${routePath}`,
      authed: AUTH_TOKENS.some((t) => rest.includes(t)),
    });
  }
  return routes;
}

test('every route without auth middleware is on the reviewed allowlist', () => {
  const unauthenticated = parseRoutes().filter((r) => !r.authed).map((r) => r.key);
  const unexpected = unauthenticated.filter((k) => !ALLOWED_UNAUTHENTICATED.has(k));

  assert.deepEqual(
    unexpected,
    [],
    'New route(s) reachable without authentication:\n' +
    unexpected.map((k) => `  ${k}`).join('\n') +
    '\n\nIf that is deliberate, add it to ALLOWED_UNAUTHENTICATED with the reason it is ' +
    'safe — confirm first that it cannot enumerate accounts or return another tenant\'s ' +
    'data, and that it is rate-limited.',
  );
});

test('the allowlist has no stale entries', () => {
  // A route that was made private, or renamed, should not leave a permanent hole behind.
  const unauthenticated = new Set(parseRoutes().filter((r) => !r.authed).map((r) => r.key));
  const stale = [...ALLOWED_UNAUTHENTICATED.keys()].filter((k) => !unauthenticated.has(k));

  assert.deepEqual(
    stale,
    [],
    `Allowlist entries that no longer match any unauthenticated route:\n${stale.map((k) => `  ${k}`).join('\n')}\n\n` +
    'Remove them — a stale entry silently pre-approves a future route with the same name.',
  );
});

test('the route inventory is non-trivial (the parser still works)', () => {
  // Guards against a refactor that changes the route syntax and makes the checks above
  // pass by matching nothing at all.
  const routes = parseRoutes();
  assert.ok(routes.length > 300, `expected 300+ routes, parsed ${routes.length} — has the syntax changed?`);
  assert.ok(routes.some((r) => r.authed), 'no authenticated routes parsed — the auth detection is broken');
});
