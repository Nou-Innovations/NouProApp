const logger = require('../utils/logger');
/**
 * Peach Payments Service
 *
 * Handles all communication with the Peach Payments API.
 * Docs: https://developer.peachpayments.com/
 *
 * Environment variables required:
 * - PEACH_ENTITY_ID
 * - PEACH_SECRET_TOKEN
 * - PEACH_MERCHANT_ID
 * - PEACH_API_URL (sandbox: https://testsecure.peachpayments.com)
 */

const PEACH_API_URL = process.env.PEACH_API_URL || 'https://testsecure.peachpayments.com';
const PEACH_ENTITY_ID = process.env.PEACH_ENTITY_ID || '';
const PEACH_SECRET_TOKEN = process.env.PEACH_SECRET_TOKEN || '';
const PEACH_MERCHANT_ID = process.env.PEACH_MERCHANT_ID || '';
const PEACH_RECURRING_ENTITY_ID = process.env.PEACH_RECURRING_ENTITY_ID || '';

/**
 * Create a Peach Payments Checkout session
 * @param {Object} params
 * @param {number} params.amount - Amount in MUR (e.g., 899.00)
 * @param {string} params.currency - Currency code (default: MUR)
 * @param {string} params.orderId - Unique order/reference ID
 * @param {boolean} params.tokenizeCard - Whether to store the card for recurring
 * @param {string} [params.shopperResultUrl] - URL to redirect after payment (for hosted checkout)
 * @returns {Promise<{ checkoutId: string }>}
 */
async function createCheckout({ amount, currency = 'MUR', orderId, tokenizeCard = false, shopperResultUrl }) {
  const body = new URLSearchParams();
  body.append('entityId', PEACH_ENTITY_ID);
  body.append('amount', amount.toFixed(2));
  body.append('currency', currency);
  body.append('paymentType', 'DB'); // Debit (immediate charge)
  body.append('merchantTransactionId', orderId);

  if (tokenizeCard) {
    body.append('createRegistration', 'true');
  }

  if (shopperResultUrl) {
    body.append('shopperResultUrl', shopperResultUrl);
  }

  const response = await fetch(`${PEACH_API_URL}/v1/checkouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PEACH_SECRET_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json();

  if (!response.ok || !data.id) {
    logger.error('[PeachPayments] Checkout creation failed:', data);
    throw new Error(data.result?.description || 'Failed to create checkout');
  }

  return { checkoutId: data.id };
}

/**
 * Get the result/status of a checkout
 * @param {string} checkoutId
 * @returns {Promise<Object>} - Payment result object
 */
async function getCheckoutResult(checkoutId) {
  const url = `${PEACH_API_URL}/v1/checkouts/${checkoutId}/payment?entityId=${PEACH_ENTITY_ID}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PEACH_SECRET_TOKEN}`,
    },
  });

  const data = await response.json();
  return data;
}

/**
 * Check if a Peach Payments result code indicates success
 * @param {string} code - Result code from Peach (e.g., "000.100.110")
 * @returns {boolean}
 */
function isSuccessResult(code) {
  if (!code) return false;
  // Success pattern: 000.000.xxx, 000.100.1xx, 000.300.xxx, 000.600.xxx
  return /^(000\.000\.|000\.100\.1|000\.[36]00\.)/.test(code);
}

/**
 * Check if a result is pending (3DS redirect, etc.)
 * @param {string} code
 * @returns {boolean}
 */
function isPendingResult(code) {
  if (!code) return false;
  return /^(000\.200\.)/.test(code);
}

/**
 * Classify a Peach result code into a terminal outcome, using the same success/pending
 * patterns as isSuccessResult/isPendingResult. Shared so the webhook and the client
 * checkout-result poll classify a payment identically. A missing/unknown code → FAILED.
 * @param {string} code - Result code from Peach (e.g. "000.100.110")
 * @returns {'SUCCEEDED'|'PENDING'|'FAILED'}
 */
function decidePaymentOutcome(code) {
  if (isSuccessResult(code)) return 'SUCCEEDED';
  if (isPendingResult(code)) return 'PENDING';
  return 'FAILED';
}

/**
 * Charge a stored card (for recurring/subscription billing)
 * Uses the recurring entity ID which bypasses 3DS for merchant-initiated transactions
 * @param {Object} params
 * @param {string} params.registrationId - Stored card token
 * @param {number} params.amount
 * @param {string} params.currency
 * @param {string} params.orderId
 * @returns {Promise<Object>} - Payment result
 */
async function chargeStoredCard({ registrationId, amount, currency = 'MUR', orderId }) {
  const entityId = PEACH_RECURRING_ENTITY_ID || PEACH_ENTITY_ID;

  const body = new URLSearchParams();
  body.append('entityId', entityId);
  body.append('amount', amount.toFixed(2));
  body.append('currency', currency);
  body.append('paymentType', 'DB');
  body.append('merchantTransactionId', orderId);
  body.append('standingInstruction.mode', 'REPEATED');
  body.append('standingInstruction.type', 'UNSCHEDULED');
  body.append('standingInstruction.source', 'MIT');

  const response = await fetch(`${PEACH_API_URL}/v1/registrations/${registrationId}/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PEACH_SECRET_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json();
  return data;
}

/**
 * SECURITY (INJ-1): a Peach checkout id is an opaque token — alphanumerics with at most
 * `.`, `_` and `-`. Anything else is an injection attempt, not a checkout.
 *
 * The id arrives as a URL path param on an UNAUTHENTICATED route and is interpolated into
 * both a <script src> attribute and a JS string literal, so an unvalidated value was a
 * reflected XSS that executed on the API's own origin — the same origin the payment page
 * runs on. Validated at the route AND here, so this function is safe regardless of caller.
 */
const CHECKOUT_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

function isValidCheckoutId(checkoutId) {
  return typeof checkoutId === 'string' && CHECKOUT_ID_PATTERN.test(checkoutId);
}

/**
 * Generate the checkout HTML page content for embedding in a WebView
 * @param {string} checkoutId
 * @param {object} [opts]
 * @param {string} [opts.nonce] - CSP nonce for the inline script (see INJ-4 at the route)
 * @returns {string} - HTML string
 * @throws {Error} if checkoutId fails validation
 */
function generateCheckoutHtml(checkoutId, { nonce = '' } = {}) {
  if (!isValidCheckoutId(checkoutId)) {
    throw new Error('INVALID_CHECKOUT_ID');
  }
  // Belt and braces on top of the pattern check: encodeURIComponent for the URL context,
  // JSON.stringify for the JS-literal context. Never hand-quote either.
  const idForUrl = encodeURIComponent(checkoutId);
  const idForJs = JSON.stringify(checkoutId);
  const nonceAttr = nonce ? ` nonce="${encodeURIComponent(nonce)}"` : '';
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 16px; background: #000; font-family: -apple-system, sans-serif; }
    #checkout-container { min-height: 400px; }
    .loading { color: #fff; text-align: center; padding: 40px; }
  </style>
</head>
<body>
  <div id="checkout-container">
    <p class="loading">Loading payment form...</p>
  </div>
  <script src="${PEACH_API_URL}/v1/paymentWidgets.js?checkoutId=${idForUrl}"></script>
  <script${nonceAttr}>
    var checkout = new window.wpwl.Checkout({
      checkoutId: ${idForJs},
      entityId: ${JSON.stringify(PEACH_ENTITY_ID)},
      element: '#checkout-container',
      onCompleted: function(data) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          event: 'onCompleted',
          data: data
        }));
      },
      onCancelled: function() {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          event: 'onCancelled'
        }));
      },
      onExpired: function() {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          event: 'onExpired'
        }));
      },
      onError: function(error) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          event: 'onError',
          data: error
        }));
      }
    });
  </script>
</body>
</html>`;
}

module.exports = {
  createCheckout,
  getCheckoutResult,
  isSuccessResult,
  isPendingResult,
  decidePaymentOutcome,
  chargeStoredCard,
  generateCheckoutHtml,
  isValidCheckoutId,
  PEACH_API_URL,
};
