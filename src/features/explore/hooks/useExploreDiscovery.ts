/**
 * useExploreDiscovery
 *
 * Loads all Explore discovery sections (directory, recommended, nearby, products) for the
 * active business and exposes an optimistic connect/disconnect toggle. All data comes from
 * existing endpoints (companies/search + public products + connections).
 */
import { useCallback, useEffect, useState } from 'react';
import { useProfileStore } from '@/shared/store/profileStore';
import { followBusiness, unfollowBusiness, getFollowedBusinessIds } from '@/features/follow/follow.service';
import {
  searchBusinesses,
  getConnectedBusinessIds,
  connectToBusiness,
  disconnectFromBusiness,
  type ExploreBusiness,
} from '../explore.service';
import { getPublicProducts } from '@/features/products/products.service';
import type { UIProduct } from '@/shared/types/product';

/** Best-effort city token from a free-text address (no dedicated city column exists). */
function cityFromAddress(address?: string | null): string | undefined {
  if (!address) return undefined;
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;
  // Prefer the second-to-last segment (usually the city), else the last.
  return parts.length >= 2 ? parts[parts.length - 2] : parts[parts.length - 1];
}

export function useExploreDiscovery() {
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const activeMode = useProfileStore((s) => s.activeMode);
  const myId = activeBusiness?.id;
  /**
   * In personal mode the relationship with a business is FOLLOW, not connect — see
   * getRelationshipAction() and docs/PROFILES.md. Explore was the one surface that
   * ignored that rule: it always showed "Connect", and connecting requires a company,
   * so for a personal user with no company every tap hit `if (!myId) return` and did
   * nothing at all (audit N-1). This is the screen the empty-feed CTA sends brand-new
   * users to, so it was the first thing they touched.
   */
  const isFollowMode = activeMode !== 'business' || !myId;
  const myCategory = (activeBusiness as any)?.category as string | undefined;
  const myCity = cityFromAddress((activeBusiness as any)?.address as string | undefined);

  const [directory, setDirectory] = useState<ExploreBusiness[]>([]);
  const [recommended, setRecommended] = useState<ExploreBusiness[]>([]);
  const [nearby, setNearby] = useState<ExploreBusiness[]>([]);
  const [products, setProducts] = useState<UIProduct[]>([]);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [connectOverrides, setConnectOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [dir, rec, near, prods, conn] = await Promise.all([
          searchBusinesses({ limit: 30 }),
          myCategory ? searchBusinesses({ category: myCategory, limit: 20 }) : Promise.resolve([]),
          myCity ? searchBusinesses({ city: myCity, limit: 20 }) : Promise.resolve([]),
          getPublicProducts(myId).catch(() => [] as UIProduct[]),
          // Follow mode needs the followed set; connect mode needs the connected set.
          isFollowMode
            ? getFollowedBusinessIds().catch(() => new Set<string>())
            : (myId ? getConnectedBusinessIds(myId) : Promise.resolve(new Set<string>())),
        ]);
        const notMe = (b: ExploreBusiness) => b.id !== myId;
        setConnectedIds(conn);
        setDirectory(dir.filter(notMe));
        setRecommended(rec.filter(notMe).filter((b) => !conn.has(b.id)).slice(0, 10));
        setNearby(near.filter(notMe).slice(0, 10));
        setProducts((prods || []).slice(0, 20));
      } catch (e: any) {
        setError(e?.message || 'Failed to load discovery');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [myId, myCategory, myCity],
  );

  useEffect(() => {
    load();
  }, [load]);

  const isConnected = useCallback(
    (id: string) => connectOverrides[id] ?? connectedIds.has(id),
    [connectOverrides, connectedIds],
  );

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const toggleConnect = useCallback(
    async (id: string) => {
      // Follow works for anyone — it's user-level and needs no company. Only the
      // business-to-business connect path requires one, and in that mode it always
      // exists, so there is no longer a state where this silently does nothing.
      if (!isFollowMode && !myId) return;
      const current = connectOverrides[id] ?? connectedIds.has(id);
      const next = !current;
      setConnectOverrides((p) => ({ ...p, [id]: next }));
      setPendingIds((p) => new Set(p).add(id));
      try {
        if (isFollowMode) {
          if (current) await unfollowBusiness(id);
          else await followBusiness(id);
        } else if (current) {
          await disconnectFromBusiness(id, myId!);
        } else {
          await connectToBusiness(myId!, id);
        }
      } catch {
        setConnectOverrides((p) => ({ ...p, [id]: current }));
      } finally {
        setPendingIds((p) => {
          const nextSet = new Set(p);
          nextSet.delete(id);
          return nextSet;
        });
      }
    },
    [connectOverrides, connectedIds, myId, isFollowMode],
  );

  const isPending = useCallback((id: string) => pendingIds.has(id), [pendingIds]);

  return {
    directory,
    recommended,
    nearby,
    products,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
    isConnected,
    toggleConnect,
    isPending,
    /** 'follow' in personal mode, 'connect' in business mode — drives the button label. */
    action: (isFollowMode ? 'follow' : 'connect') as 'follow' | 'connect',
    myCity,
  };
}

export default useExploreDiscovery;
