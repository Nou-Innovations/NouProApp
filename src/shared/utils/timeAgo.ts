/**
 * timeAgo - Compute a human-readable relative timestamp from an ISO date string.
 *
 * Returns strings like "Just now", "5m ago", "2h ago", "3d ago", "2w ago", etc.
 * Falls back gracefully to the raw input when parsing fails.
 */

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function timeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const now = Date.now();
    const diffSec = Math.floor((now - date.getTime()) / 1000);

    if (diffSec < 0) return 'Just now'; // future date
    if (diffSec < MINUTE) return 'Just now';
    if (diffSec < HOUR) return `${Math.floor(diffSec / MINUTE)}m ago`;
    if (diffSec < DAY) return `${Math.floor(diffSec / HOUR)}h ago`;
    if (diffSec < WEEK) return `${Math.floor(diffSec / DAY)}d ago`;
    if (diffSec < MONTH) return `${Math.floor(diffSec / WEEK)}w ago`;
    if (diffSec < YEAR) return `${Math.floor(diffSec / MONTH)}mo ago`;
    return `${Math.floor(diffSec / YEAR)}y ago`;
  } catch {
    return dateString;
  }
}

export default timeAgo;
