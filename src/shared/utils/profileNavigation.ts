/**
 * Guarded navigation to profile screens.
 *
 * A deleted user or archived company still has a NAME that must render on past orders,
 * invoices and chat threads — but there is no profile left to open. Routing every
 * "tap through to profile" call through these helpers keeps that rule in one place
 * instead of relying on ~25 screens each remembering to check.
 *
 * The backend is the real safety net: an archived company returns only a tombstone
 * payload, so a stale deep link still lands somewhere sensible.
 */

type Navigator = { navigate: (screen: string, params?: object) => void };

/** Open a company profile, unless the company is archived or the id is missing. */
export function openBusinessProfile(
  navigation: Navigator,
  businessId?: string | null,
  isDeleted?: boolean,
): void {
  if (!businessId || isDeleted) return;
  navigation.navigate('ViewBusinessProfile', { businessId });
}

/** Open a user profile, unless the account is deleted or the id is missing. */
export function openUserProfile(
  navigation: Navigator,
  userId?: string | null,
  isDeleted?: boolean,
): void {
  if (!userId || isDeleted) return;
  navigation.navigate('ViewUserProfile', { userId });
}
