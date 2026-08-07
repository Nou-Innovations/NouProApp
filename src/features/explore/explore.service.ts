/**
 * Explore Service
 *
 * Thin wrappers over existing backend endpoints for B2B discovery:
 * - business directory / recommended / nearby  → GET /companies/search (q/category/city)
 * - business connect / disconnect              → the canonical /business-connections/* routes
 *   (Group A: pushes the target's admins, strips sensitive fields, and lets a previously
 *   rejected pair reconnect). The old /companies/:id/connections calls here were inverted —
 *   they passed the TARGET id where the caller's own business id belonged, so every Connect
 *   403'd silently.
 */
import { get } from '@/shared/services/api';
import {
  getBusinessConnections,
  sendBusinessConnectionRequest,
  removeBusinessConnection,
} from '@/features/connections/connections.service';

export interface ExploreBusiness {
  id: string;
  name: string;
  logoUrl?: string | null;
  industry?: string | null;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  isVerified?: boolean;
  productsCount?: number;
}

export interface SearchBusinessesParams {
  q?: string;
  category?: string;
  city?: string;
  page?: number;
  limit?: number;
}

/** Search published businesses, optionally filtered by category and/or city (address match). */
export async function searchBusinesses(params: SearchBusinessesParams = {}): Promise<ExploreBusiness[]> {
  const query: Record<string, string | number> = {};
  if (params.q) query.q = params.q;
  if (params.category) query.category = params.category;
  if (params.city) query.city = params.city;
  if (params.page) query.page = params.page;
  if (params.limit) query.limit = params.limit;
  return get<ExploreBusiness[]>('/companies/search', query);
}

/**
 * Set of business ids my business is connected to. Group A returns ACCEPTED connections only,
 * so — unlike the old unfiltered Group-B call — pending/rejected pairs no longer show as
 * "Connected" in Explore.
 */
export async function getConnectedBusinessIds(myBusinessId: string): Promise<Set<string>> {
  try {
    const conns = await getBusinessConnections(myBusinessId);
    const ids = new Set<string>();
    (conns || []).forEach((c) => {
      if (c.business?.id) ids.add(c.business.id);
    });
    return ids;
  } catch {
    return new Set();
  }
}

/** Send a partner request from MY business to the target. */
export async function connectToBusiness(myBusinessId: string, targetBusinessId: string): Promise<void> {
  await sendBusinessConnectionRequest(myBusinessId, targetBusinessId);
}

export async function disconnectFromBusiness(targetBusinessId: string, myBusinessId: string): Promise<void> {
  const conns = await getBusinessConnections(myBusinessId);
  const mine = (conns || []).find((c) => c.business?.id === targetBusinessId);
  if (mine) await removeBusinessConnection(mine.connectionId);
}
