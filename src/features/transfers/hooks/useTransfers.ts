/**
 * useTransfers — loads transfers for the current company with lifecycle segments.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Transfer, TransferStatus } from '@/shared/types/transfer';
import { getTransfers, changeTransferStatus } from '../transfers.service';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';

export type TransferSegment = 'requests' | 'to_send' | 'to_receive' | 'completed' | 'all';

const SEGMENT_STATUSES: Record<Exclude<TransferSegment, 'all'>, TransferStatus[]> = {
  requests: ['Requested'],
  to_send: ['Approved', 'Preparing'],
  to_receive: ['InTransit', 'Received'],
  completed: ['Completed'],
};

export function useTransfers() {
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const companyId = activeBusiness?.id || '';

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<TransferSegment>('requests');

  const load = useCallback(async (isRefresh = false) => {
    if (!companyId) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const rows = await getTransfers(companyId);
      setTransfers(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load transfers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  const refresh = useCallback(() => load(true), [load]);

  const filtered = useMemo(() => {
    if (segment === 'all') return transfers;
    const statuses = SEGMENT_STATUSES[segment];
    return transfers.filter((t) => statuses.includes(t.status));
  }, [transfers, segment]);

  const requestsCount = useMemo(() => transfers.filter((t) => t.status === 'Requested').length, [transfers]);
  const toReceiveCount = useMemo(() => transfers.filter((t) => t.status === 'InTransit' || t.status === 'Received').length, [transfers]);

  const advance = useCallback(async (transferId: string, status: TransferStatus, reason?: string) => {
    const updated = await changeTransferStatus(companyId, transferId, status, reason);
    setTransfers((prev) => prev.map((t) => (t.id === transferId ? { ...t, ...updated } : t)));
    return updated;
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  return { transfers, filtered, loading, refreshing, error, refresh, segment, setSegment, requestsCount, toReceiveCount, advance };
}

export default useTransfers;
