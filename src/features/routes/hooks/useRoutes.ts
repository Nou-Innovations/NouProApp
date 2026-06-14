/**
 * useRoutes — loads delivery routes for the current company with a status segment filter.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Route } from '@/shared/types/route';
import { getRoutes, updateRoute as updateRouteApi } from '../routes.service';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';

export type RouteSegment = 'active' | 'planned' | 'completed' | 'all';

export function useRoutes() {
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const companyId = activeBusiness?.id || '';

  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<RouteSegment>('active');

  const load = useCallback(async (isRefresh = false) => {
    if (!companyId) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const rows = await getRoutes(companyId);
      setRoutes(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load routes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  const refresh = useCallback(() => load(true), [load]);

  const filtered = useMemo(() => {
    if (segment === 'all') return routes;
    if (segment === 'active') return routes.filter((r) => r.status === 'Active');
    if (segment === 'planned') return routes.filter((r) => r.status === 'Planned');
    if (segment === 'completed') return routes.filter((r) => r.status === 'Completed');
    return routes;
  }, [routes, segment]);

  const activeCount = useMemo(() => routes.filter((r) => r.status === 'Active').length, [routes]);

  const updateRoute = useCallback(async (routeId: string, patch: Partial<Pick<Route, 'name' | 'date' | 'driverId' | 'transportId' | 'status' | 'stops'>>) => {
    const updated = await updateRouteApi(companyId, routeId, patch);
    setRoutes((prev) => prev.map((r) => (r.id === routeId ? { ...r, ...updated } : r)));
    return updated;
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  return { routes, filtered, loading, refreshing, error, refresh, segment, setSegment, activeCount, updateRoute };
}

export default useRoutes;
