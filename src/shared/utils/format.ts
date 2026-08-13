/**
 * Dates, times and money — one place, locale-aware.
 *
 * Before this there were six separate `formatCurrency` definitions with four different
 * default currencies (`Rs`, `$` in deliveries and procurement, `EUR` in invoices, and the
 * literal string `MUR` in chat), two rival `formatRelativeTime` implementations with
 * different output, and 28 hand-rolled `formatDate` helpers scattered through screens —
 * 43 of which pinned `toLocaleDateString` to `'en-US'`, and one to `'en-GB'`.
 *
 * That was already wrong in an app that trades in rupees. It becomes unfixable once the
 * UI is translated, because the locale has to reach every one of those call sites.
 *
 * ── The font trap ────────────────────────────────────────────────────────────────
 * `Intl.NumberFormat('fr-FR')` groups thousands with U+202F (narrow no-break space).
 * The bundled Inter is subsetted to 230 codepoints and **does not contain U+202F** — it
 * would render as a missing-glyph box in the middle of every French amount. U+00A0 is
 * present, so `normalizeSpaces` swaps it on the way out. Checked against the actual
 * font's cmap table, not assumed.
 *
 * ── What Hermes gives us ─────────────────────────────────────────────────────────
 * `Intl.DateTimeFormat` and `Intl.NumberFormat` are present with real system locale
 * data. `Intl.RelativeTimeFormat` is NOT, which is why relative time is hand-written
 * below rather than delegated.
 */

import { CURRENCY } from '@/shared/types/subscription';

/** BCP 47 tag for each supported app language. */
const LOCALE_TAGS: Record<string, string> = {
  EN: 'en-GB',
  FR: 'fr-FR',
};

/**
 * The locale to format in. Read lazily from the store so callers don't each have to
 * thread it through — a lazy require avoids a circular import at module load, the same
 * pattern profileStore itself uses for its cross-store calls.
 */
function activeLocale(): string {
  try {
    const lang = require('@/shared/store/profileStore').useProfileStore.getState().language;
    return LOCALE_TAGS[lang] || LOCALE_TAGS.EN;
  } catch {
    return LOCALE_TAGS.EN;
  }
}

/**
 * Replace separators the bundled font can't draw. See the font trap above — without
 * this, every French amount over 999 shows a box where the thousands separator belongs.
 */
function normalizeSpaces(text: string): string {
  return text.replace(/ /g, ' ');
}

/** Parse anything the API might hand us. Returns null rather than an Invalid Date. */
function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ── Money ──────────────────────────────────────────────────────────────────────

/**
 * The symbol to draw for a currency code.
 *
 * Deliberately not `Intl`'s: `Intl.NumberFormat(..., {currency:'MUR'})` renders the code
 * "MUR", not "Rs", in every locale — using currency style would have silently changed
 * the symbol on all ~100 money call sites in the app.
 */
export function currencySymbol(currency: string = CURRENCY.code): string {
  return currency === CURRENCY.code ? CURRENCY.symbol : currency;
}

/**
 * Format an amount as money.
 *
 * The NUMBER is formatted by `Intl` (so grouping and the decimal mark follow the
 * locale — `1,500.50` in English, `1 500,50` in French) and the app's own symbol is
 * placed around it, before in English and after in French, as each convention expects.
 *
 * @param amount   the value; null/undefined/NaN render as zero rather than "NaN"
 * @param currency ISO code. Defaults to the app's currency — deliberately NOT `'$'`,
 *                 which the delivery and procurement screens used to fall back to.
 * @param decimals show cents. Defaults true: money is 2dp, and the old helper's bare
 *                 `toLocaleString()` rendered 1500.5 as "Rs 1,500.5".
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = CURRENCY.code,
  decimals: boolean = true,
): string {
  const value = Number(amount);
  const safe = Number.isFinite(value) ? value : 0;
  const locale = activeLocale();
  const symbol = currencySymbol(currency);

  let num: string;
  try {
    num = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    }).format(safe);
  } catch {
    num = decimals ? safe.toFixed(2) : String(Math.round(safe));
  }

  return normalizeSpaces(locale.startsWith('fr') ? `${num} ${symbol}` : `${symbol} ${num}`);
}

/** A plain number with locale grouping — counts, quantities, stock levels. */
export function formatNumber(value: number | null | undefined): string {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  try {
    return normalizeSpaces(new Intl.NumberFormat(activeLocale()).format(safe));
  } catch {
    return String(safe);
  }
}

// ── Dates ──────────────────────────────────────────────────────────────────────

/** e.g. "14 Aug 2026" (en-GB) / "14 août 2026" (fr-FR). Empty string for no date. */
export function formatDate(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  try {
    return normalizeSpaces(
      new Intl.DateTimeFormat(activeLocale(), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d),
    );
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** Day and month only — for lists where the year is obvious from context. */
export function formatDateShort(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  try {
    return normalizeSpaces(
      new Intl.DateTimeFormat(activeLocale(), { day: 'numeric', month: 'short' }).format(d),
    );
  } catch {
    return d.toISOString().slice(5, 10);
  }
}

/** Clock time, e.g. "14:30". */
export function formatTime(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  try {
    return normalizeSpaces(
      new Intl.DateTimeFormat(activeLocale(), { hour: '2-digit', minute: '2-digit' }).format(d),
    );
  } catch {
    return '';
  }
}

/** Date and time together. */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  const date = formatDate(d);
  const time = formatTime(d);
  return time ? `${date}, ${time}` : date;
}

// ── Relative time ──────────────────────────────────────────────────────────────

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 604800;

/**
 * "Just now", "5m ago", "3d ago".
 *
 * Hand-written because Hermes ships no `Intl.RelativeTimeFormat` — verified against the
 * shipped binary, which exposes only Collator, DateTimeFormat and NumberFormat. The
 * English forms live here rather than in a locale file because they are abbreviations,
 * not sentences; the French equivalents come from the translation layer once the units
 * are keyed. Falls back to an absolute date beyond a month, which needs no translation.
 */
export function formatRelativeTime(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';

  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < MINUTE) return 'Just now';
  if (diffSec < HOUR) return `${Math.floor(diffSec / MINUTE)}m ago`;
  if (diffSec < DAY) return `${Math.floor(diffSec / HOUR)}h ago`;
  if (diffSec < WEEK) return `${Math.floor(diffSec / DAY)}d ago`;

  // Older than a week: an actual date is more useful than "5w ago", and it localises
  // for free through formatDate.
  return formatDate(d);
}
