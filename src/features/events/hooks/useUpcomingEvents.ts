import { useCallback, useEffect, useState } from 'react';
import { listUpcomingEvents, type BizEvent, type EventFilters } from '../events.service';

export function useUpcomingEvents(filters: EventFilters = {}) {
  const [items, setItems] = useState<BizEvent[]>([]);
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
        setItems(await listUpcomingEvents(filters));
      } catch (e: any) {
        setError(e?.message || 'Failed to load events');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, refreshing, error, refresh: () => load(true) };
}

export default useUpcomingEvents;
