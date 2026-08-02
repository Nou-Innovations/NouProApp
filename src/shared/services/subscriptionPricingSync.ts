/**
 * Subscription Pricing Sync
 *
 * Fetches the backend's authoritative subscription prices
 * (GET /api/subscription-pricing → { currency, monthly, yearly }) and folds them into the
 * frontend defaults in `src/shared/types/subscription.ts` via `hydrateSubscriptionPricing()`.
 *
 * Called once at app start (see App.tsx). Cache-first: the first paint uses the last-known-good
 * server prices even offline, then it refreshes from the network. Never throws — the pricing UI
 * always has the bundled defaults to fall back on. The endpoint is public (no auth), so this is
 * safe to run before the user signs in.
 *
 * NOTE: this only affects DISPLAY prices. The amount actually charged is always computed
 * server-side from the same PLAN_PRICES (backend create-checkout), so this can never change what
 * a card is billed — it only keeps what the app SHOWS in sync with what the backend charges.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get } from './api';
import { hydrateSubscriptionPricing } from '@/shared/types/subscription';
import type { ServerSubscriptionPricing } from '@/shared/types/subscription';

const CACHE_KEY = 'subscriptionPricing:v1';

/** Apply the last-known-good server prices from cache (instant, offline-safe). */
async function applyCached(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) hydrateSubscriptionPricing(JSON.parse(raw) as ServerSubscriptionPricing);
  } catch {
    // Corrupt/absent cache is fine — bundled defaults remain in effect.
  }
}

/** Fetch the authoritative prices from the backend and cache them. */
async function refreshFromServer(): Promise<void> {
  const pricing = await get<ServerSubscriptionPricing>('/subscription-pricing');
  hydrateSubscriptionPricing(pricing);
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(pricing));
  } catch {
    // Non-fatal: prices are already applied in memory for this session.
  }
}

/**
 * Sync subscription pricing from the backend. Safe to call fire-and-forget; resolves (never
 * rejects) once the network refresh settles.
 */
export async function syncSubscriptionPricing(): Promise<void> {
  await applyCached();
  try {
    await refreshFromServer();
  } catch {
    // Offline / server down / cold start — keep cached-or-bundled defaults.
  }
}
