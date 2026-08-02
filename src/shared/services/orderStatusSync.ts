/**
 * Order Status Sync
 *
 * Fetches the backend's authoritative order-status config
 * (GET /api/order-status-meta → { statuses, meta, transitions }) and folds it
 * into the frontend defaults in `src/shared/constants/orderStatus.ts` via
 * `hydrateOrderStatusConfig()`.
 *
 * Called once at app start (see App.tsx). Cache-first: the first paint uses the
 * last-known-good server config even offline, then it refreshes from the
 * network. Never throws — order-status UI always has the bundled defaults to
 * fall back on. The endpoint is public (no auth), so this is safe to run before
 * the user signs in.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get } from './api';
import { hydrateOrderStatusConfig } from '@/shared/constants/orderStatus';
import type { ServerOrderStatusConfig } from '@/shared/constants/orderStatus';

const CACHE_KEY = 'orderStatusConfig:v1';

/** Apply the last-known-good server config from cache (instant, offline-safe). */
async function applyCached(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) hydrateOrderStatusConfig(JSON.parse(raw) as ServerOrderStatusConfig);
  } catch {
    // Corrupt/absent cache is fine — bundled defaults remain in effect.
  }
}

/** Fetch the authoritative config from the backend and cache it. */
async function refreshFromServer(): Promise<void> {
  const config = await get<ServerOrderStatusConfig>('/order-status-meta');
  hydrateOrderStatusConfig(config);
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(config));
  } catch {
    // Non-fatal: config is already applied in memory for this session.
  }
}

/**
 * Sync order-status config from the backend. Safe to call fire-and-forget;
 * resolves (never rejects) once the network refresh settles.
 */
export async function syncOrderStatusMeta(): Promise<void> {
  await applyCached();
  try {
    await refreshFromServer();
  } catch {
    // Offline / server down / cold start — keep cached-or-bundled defaults.
  }
}
