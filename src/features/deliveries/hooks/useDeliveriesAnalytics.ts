/**
 * useDeliveriesAnalytics Hook
 *
 * Loads aggregated delivery analytics for the current company/location.
 * Mirrors the loading/error/refresh shape of useBusinessDashboard.
 */

import { useState, useEffect, useCallback } from 'react';
import { DeliveriesAnalytics } from '@/shared/types/delivery';
import { getDeliveriesAnalytics } from '../deliveriesAnalytics.service';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';

interface UseDeliveriesAnalyticsResult {
  data: DeliveriesAnalytics | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDeliveriesAnalytics(): UseDeliveriesAnalyticsResult {
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const companyId = activeBusiness?.id || '';
  const currentLocation = useBusinessStore((state) => state.currentLocation);
  const locationId = currentLocation?.id;

  const [data, setData] = useState<DeliveriesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!companyId) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const result = await getDeliveriesAnalytics({ companyId, locationId });
      setData(result);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load analytics';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, locationId]);

  const refresh = useCallback(() => load(true), [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, refreshing, error, refresh };
}

export default useDeliveriesAnalytics;
