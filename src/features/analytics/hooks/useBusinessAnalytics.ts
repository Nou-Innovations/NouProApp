/**
 * useBusinessAnalytics / useVariance — mirror useDeliveriesAnalytics
 * (loading/refreshing/error/refresh) and read company + location from the stores.
 */
import { useState, useEffect, useCallback } from 'react';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';
import {
  getBusinessAnalytics, getVariance,
  BusinessAnalytics, VarianceReport, AnalyticsRange,
} from '../analytics.service';

export function useBusinessAnalytics() {
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';
  const currentLocation = useBusinessStore((s) => s.currentLocation);
  const locationId = currentLocation?.id;

  const [range, setRange] = useState<AnalyticsRange>('7d');
  const [data, setData] = useState<BusinessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!companyId) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      setData(await getBusinessAnalytics(companyId, { range, locationId }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, locationId, range]);

  const refresh = useCallback(() => load(true), [load]);
  useEffect(() => { load(); }, [load]);

  return { data, loading, refreshing, error, refresh, range, setRange };
}

export function useVariance() {
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const companyId = activeBusiness?.id || '';
  const currentLocation = useBusinessStore((s) => s.currentLocation);
  const locationId = currentLocation?.id;

  const [data, setData] = useState<VarianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!companyId) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      setData(await getVariance(companyId, { locationId }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load variance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, locationId]);

  const refresh = useCallback(() => load(true), [load]);
  useEffect(() => { load(); }, [load]);

  return { data, loading, refreshing, error, refresh };
}
