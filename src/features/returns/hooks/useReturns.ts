/**
 * useReturns — loads returns for the current company with a status segment filter.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Return, ReturnStatus } from '@/shared/types/return';
import { getReturns, changeReturnStatus } from '../returns.service';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';

export type ReturnSegment = 'requested' | 'in_progress' | 'completed' | 'all';

const IN_PROGRESS: ReturnStatus[] = ['Scheduled', 'PickedUp', 'Received'];

export function useReturns() {
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const companyId = activeBusiness?.id || '';

  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<ReturnSegment>('requested');

  const load = useCallback(async (isRefresh = false) => {
    if (!companyId) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const rows = await getReturns(companyId);
      setReturns(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load returns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  const refresh = useCallback(() => load(true), [load]);

  const filtered = useMemo(() => {
    if (segment === 'all') return returns;
    if (segment === 'requested') return returns.filter((r) => r.status === 'Requested');
    if (segment === 'completed') return returns.filter((r) => r.status === 'Completed');
    return returns.filter((r) => IN_PROGRESS.includes(r.status));
  }, [returns, segment]);

  const activeCount = useMemo(
    () => returns.filter((r) => r.status !== 'Completed' && r.status !== 'Rejected').length,
    [returns]
  );

  const changeStatus = useCallback(async (returnId: string, status: ReturnStatus) => {
    const updated = await changeReturnStatus(companyId, returnId, status);
    setReturns((prev) => prev.map((r) => (r.id === returnId ? { ...r, ...updated } : r)));
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  return { returns, filtered, loading, refreshing, error, refresh, segment, setSegment, activeCount, changeStatus };
}

export default useReturns;
