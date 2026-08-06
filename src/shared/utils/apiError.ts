/**
 * Reading error messages out of API failures.
 *
 * The trap this exists to fix: `ApiError.response` holds the response *body*, not an
 * axios response object (see `api.ts` — both throw sites pass `error.response?.data`).
 * So `err.response.data.message` and `err.response.status` are ALWAYS `undefined`, which
 * silently disables error branches all over the app. Status lives at `err.status`.
 *
 * The backend also emits several different error body shapes:
 *   { success, error: { code, message }, message }   <- errorResponse(), ~920 routes
 *   { success, error: { code: 'PAYWALL', ... }, message }
 *   { success: false, message }                      <- sendError()
 *   { error: '<CODE>', message }                     <- auth middleware (error is a STRING)
 *   { success: false, error: '<text>' }              <- rate limiters (NO message key)
 *
 * Note `body.error` is an object in most shapes — passing it straight to a <Text> or to
 * AppAlert crashes with "Objects are not valid as a React child". This helper only ever
 * returns a string.
 */

/** Friendly text for statuses whose bodies typically carry no usable message. */
const STATUS_FALLBACKS: Record<number, string> = {
  429: 'Too many attempts. Please wait a moment and try again.',
  502: 'The server is unavailable right now. Please try again.',
  503: 'The server is unavailable right now. Please try again.',
  504: 'The server took too long to respond. Please try again.',
};

/** True when the value is a non-empty, non-whitespace string. */
function isUsableString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Extract a human-readable message from any thrown API error.
 *
 * Duck-typed rather than `instanceof ApiError` on purpose — `imageService` throws a bare
 * `Error`, and hooks re-throw plain objects.
 *
 * @param err      the caught value (never trust its type)
 * @param fallback shown when the error carries nothing usable
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') {
    return isUsableString(err) ? err : fallback;
  }

  const e = err as {
    status?: number;
    message?: unknown;
    response?: { error?: unknown; message?: unknown };
  };

  // Network failures surface as status 0 with an unhelpful axios message.
  if (e.status === 0) {
    return 'No internet connection. Please check your network and try again.';
  }

  // 1) body.error.message — the most specific text the backend produces.
  const bodyError = e.response?.error;
  if (bodyError && typeof bodyError === 'object') {
    const nested = (bodyError as { message?: unknown }).message;
    if (isUsableString(nested)) return nested;
  }

  // 2) body.message — present on nearly every backend response.
  if (isUsableString(e.response?.message)) return e.response.message;

  // 3) body.error as a plain string. The auth middleware sends codes here
  //    ('TOKEN_EXPIRED'), so only use it when it reads like a sentence.
  if (isUsableString(bodyError) && bodyError.includes(' ')) return bodyError;

  // 4) Statuses whose bodies have no message at all (rate limiters, gateway errors).
  //    Checked before err.message, which would be axios's "Request failed with status code 429".
  if (typeof e.status === 'number' && STATUS_FALLBACKS[e.status]) {
    return STATUS_FALLBACKS[e.status];
  }

  // 5) err.message — already normalized to body.message by the interceptor when present.
  //    Reject axios's raw text so callers get their own fallback instead.
  if (isUsableString(e.message) && !e.message.startsWith('Request failed with status code')) {
    return e.message;
  }

  return fallback;
}

/**
 * True when a failure is a plan/paywall rejection.
 *
 * `ApiError.code` is the AXIOS code ('ERR_BAD_REQUEST'), never the backend's — so
 * `err.code === 'PAYWALL'` is always false. The backend code lives at body.error.code.
 */
export function isPaywallError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { response?: { error?: unknown } };
  const bodyError = e.response?.error;
  if (bodyError && typeof bodyError === 'object') {
    return (bodyError as { code?: unknown }).code === 'PAYWALL';
  }
  return false;
}
