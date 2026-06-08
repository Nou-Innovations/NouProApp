/**
 * Explore Service
 *
 * Thin wrappers over existing backend endpoints for B2B discovery:
 * - business directory / recommended / nearby  → GET /companies/search (q/category/city)
 * - business connect / disconnect              → /companies/:id/connections (same endpoints the
 *   feed's optimistic connect uses)
 */
import { get, post, del } from '@/shared/services/api';

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

interface RawConnection {
  id: string;
  requesterBusinessId?: string;
  targetBusinessId?: string;
  status?: string;
}

/** Set of business ids my business is connected to (the "other side" of each connection). */
export async function getConnectedBusinessIds(myBusinessId: string): Promise<Set<string>> {
  try {
    const conns = await get<RawConnection[]>(`/companies/${myBusinessId}/connections`);
    const ids = new Set<string>();
    (conns || []).forEach((c) => {
      const other = c.requesterBusinessId === myBusinessId ? c.targetBusinessId : c.requesterBusinessId;
      if (other) ids.add(other);
    });
    return ids;
  } catch {
    return new Set();
  }
}

export async function connectToBusiness(targetBusinessId: string): Promise<void> {
  await post(`/companies/${targetBusinessId}/connections`, {});
}

export async function disconnectFromBusiness(targetBusinessId: string, myBusinessId: string): Promise<void> {
  const conns = await get<RawConnection[]>(`/companies/${targetBusinessId}/connections`);
  const mine = (conns || []).find(
    (c) => c.requesterBusinessId === myBusinessId || c.targetBusinessId === myBusinessId,
  );
  if (mine) await del(`/companies/${targetBusinessId}/connections/${mine.id}`);
}
