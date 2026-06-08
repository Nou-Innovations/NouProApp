import { useCallback, useEffect, useState } from 'react';
import { useProfileStore } from '@/shared/store/profileStore';
import { listOpportunities, type Opportunity, type OpportunityFilters } from '../opportunities.service';

/** Discovery list of open opportunities (excludes the viewer's own business server-side). */
export function useOpportunities(filters: OpportunityFilters = {}) {
  const activeBusinessId = useProfileStore((s) => s.activeBusinessId);
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify(filters);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await listOpportunities({
          ...filters,
          viewerBusinessId: filters.viewerBusinessId ?? activeBusinessId ?? undefined,
        });
        setItems(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load opportunities');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, activeBusinessId],
  );

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, refreshing, error, refresh: () => load(true) };
}

export default useOpportunities;
