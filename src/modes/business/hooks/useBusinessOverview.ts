/**
 * useBusinessOverview
 *
 * Lazily fetches the Business Overview analytics block (revenue trend,
 * orders-by-status, invoice collection) for the active business/location.
 * Only fetches when `enabled` (Business+ entitlement). Owns the period range
 * (7d/30d) and refetches on focus and whenever business/location/range change.
 *
 * Data: API → dashboard.service → this hook → BusinessOverviewSection.
 */

import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { useProfileStore } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';
import {
  getBusinessOverview,
  type BusinessOverview,
  type OverviewRange,
} from '@/features/business';
import { buildMockOverview, USE_MOCK_DASHBOARD_FALLBACK } from './mockDashboard';

export interface UseBusinessOverviewResult {
  overview: BusinessOverview | null;
  range: OverviewRange;
  setRange: (range: OverviewRange) => void;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBusinessOverview(opts?: { enabled?: boolean }): UseBusinessOverviewResult {
  const enabled = opts?.enabled ?? true;

  const activeBusinessId = useProfileStore((s) => s.activeBusinessId);
  const currentLocationId = useBusinessStore((s) => s.currentLocationId);
  const locationCount = useBusinessStore((s) => s.locations.length);
  // Single-location businesses always view business-wide (see useBusinessDashboard).
  const effectiveLocationId = locationCount >= 2 ? currentLocationId : null;

  const [range, setRangeState] = useState<OverviewRange>('7d');
  const [overview, setOverview] = useState<BusinessOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !activeBusinessId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getBusinessOverview(activeBusinessId, {
        range,
        locationId: effectiveLocationId ?? undefined,
      });
      setOverview(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load overview');
    } finally {
      setLoading(false);
    }
  }, [enabled, activeBusinessId, effectiveLocationId, range]);

  // Refetch on focus and whenever business/location/range change (only when enabled).
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const setRange = useCallback((r: OverviewRange) => setRangeState(r), []);
  const refresh = useCallback(() => fetchData(), [fetchData]);

  // Preview fallback: if the analytics endpoint isn't deployed yet (fetch
  // errors), show realistic mock charts instead of an error. Auto-disables once
  // the endpoint responds successfully.
  const useMock = USE_MOCK_DASHBOARD_FALLBACK && error !== null;
  if (useMock) {
    return { overview: buildMockOverview(range), range, setRange, loading: false, error: null, refresh };
  }

  return { overview, range, setRange, loading, error, refresh };
}

export default useBusinessOverview;
