/**
 * Delivery SLA / on-time helpers
 *
 * SLA state is DERIVED, never stored — a delivery silently becomes "late" as
 * the clock passes its ETA, with no write to trigger an update. Computing on
 * read keeps it correct and cheap.
 */

import { Delivery, DeliveryStatus } from '@/shared/types/delivery';
import { theme } from '@/shared/theme';

/** Statuses that represent an in-flight delivery (not yet finished/canceled). */
export const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = [
  'NOT_ASSIGNED',
  'ASSIGNED',
  'PACKED',
  'OUT_FOR_DELIVERY',
];

const parseTime = (value?: string | null): number | null => {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

export function isDeliveryActive(d: Delivery): boolean {
  return !!d.deliveryStatus && ACTIVE_DELIVERY_STATUSES.includes(d.deliveryStatus);
}

/** Active delivery whose ETA is already in the past. */
export function isDeliveryLate(d: Delivery, now: number = Date.now()): boolean {
  if (!isDeliveryActive(d)) return false;
  const eta = parseTime(d.expectedDeliveryDateTime);
  return eta != null && eta < now;
}

/** Delivered on or before its ETA. */
export function isDeliveryOnTime(d: Delivery): boolean {
  if (d.deliveryStatus !== 'DELIVERED') return false;
  const eta = parseTime(d.expectedDeliveryDateTime);
  const delivered = parseTime(d.deliveredAt);
  if (eta == null || delivered == null) return false;
  return delivered <= eta;
}

/** Delivered, but after its ETA. */
export function isDeliveredLate(d: Delivery): boolean {
  if (d.deliveryStatus !== 'DELIVERED') return false;
  const eta = parseTime(d.expectedDeliveryDateTime);
  const delivered = parseTime(d.deliveredAt);
  if (eta == null || delivered == null) return false;
  return delivered > eta;
}

/**
 * A delivery "needs attention" if it is unassigned, failed, late, or has a
 * problematic payment status. Powers the hub's "Needs attention" segment.
 */
export function needsAttention(d: Delivery, now: number = Date.now()): boolean {
  if (d.deliveryStatus === 'NOT_ASSIGNED' || d.deliveryStatus === 'FAILED') return true;
  if (isDeliveryLate(d, now)) return true;
  if (d.paymentStatus === 'OVERDUE' || d.paymentStatus === 'DUE_TODAY') return true;
  return false;
}

export interface SlaBadge {
  label: string;
  color: string;
}

/**
 * Compact SLA badge for a delivery card, or null when there's nothing to flag.
 *  - active + past ETA  → "Late" (error)
 *  - delivered late     → "Delivered late" (warning)
 *  - delivered on time  → "On time" (success)
 */
export function getDeliverySlaBadge(d: Delivery, now: number = Date.now()): SlaBadge | null {
  if (isDeliveryLate(d, now)) return { label: 'Late', color: theme.colors.error };
  if (isDeliveredLate(d)) return { label: 'Delivered late', color: theme.colors.warning };
  if (isDeliveryOnTime(d)) return { label: 'On time', color: theme.colors.success };
  return null;
}
