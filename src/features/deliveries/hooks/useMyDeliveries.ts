/**
 * useMyDeliveries Hook
 *
 * Loads the deliveries assigned to the current user (driver view) and exposes
 * a status-advance action with optimistic local update.
 */

import { useState, useEffect, useCallback } from 'react';
import { Delivery, DeliveryStatus, UpdateDeliveryData } from '@/shared/types/delivery';
import { getMyDeliveries, updateDelivery } from '../deliveries.service';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';

interface UseMyDeliveriesResult {
  deliveries: Delivery[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  advance: (deliveryId: string, nextStatus: DeliveryStatus, extra?: UpdateDeliveryData) => Promise<void>;
}

export function useMyDeliveries(): UseMyDeliveriesResult {
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const companyId = activeBusiness?.id || '';

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!companyId) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const rows = await getMyDeliveries(companyId);
      setDeliveries(Array.isArray(rows) ? rows : []);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load your deliveries';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  const refresh = useCallback(() => load(true), [load]);

  const advance = useCallback(
    async (deliveryId: string, nextStatus: DeliveryStatus, extra?: UpdateDeliveryData) => {
      const updated = await updateDelivery(companyId, deliveryId, { deliveryStatus: nextStatus, ...extra });
      setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? { ...d, ...updated } : d)));
    },
    [companyId]
  );

  useEffect(() => {
    load();
  }, [load]);

  return { deliveries, loading, refreshing, error, refresh, advance };
}

export default useMyDeliveries;
