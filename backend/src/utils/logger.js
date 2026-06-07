/**
 * Minimal leveled logger for the backend.
 *
 * Goal (P3 cleanup): keep all warnings/errors, but silence noisy debug/info
 * logging in production so the logs stay readable. This is intentionally tiny —
 * no extra dependencies — and preserves the existing "[Tag] message" call style,
 * so `logger.debug('[Login] ...')` reads exactly like the old console calls.
 *
 * Levels (low → high): debug < info < warn < error. Only messages at or above
 * the active threshold are emitted.
 *
 * Threshold resolution:
 *   1. If LOG_LEVEL is set to one of debug|info|warn|error|silent, use it.
 *   2. Otherwise default to `warn` in production and `debug` everywhere else.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

function resolveThreshold() {
  const explicit = String(process.env.LOG_LEVEL || '').toLowerCase();
  if (explicit && LEVELS[explicit] != null) return LEVELS[explicit];
  return process.env.NODE_ENV === 'production' ? LEVELS.warn : LEVELS.debug;
}

const threshold = resolveThreshold();

const logger = {
  debug: (...args) => { if (LEVELS.debug >= threshold) console.log(...args); },
  info: (...args) => { if (LEVELS.info >= threshold) console.log(...args); },
  warn: (...args) => { if (LEVELS.warn >= threshold) console.warn(...args); },
  error: (...args) => { if (LEVELS.error >= threshold) console.error(...args); },
};

module.exports = logger;
