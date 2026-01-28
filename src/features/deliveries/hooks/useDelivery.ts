/**
 * useDelivery Hook
 * 
 * Fetches a single delivery by ID.
 * Tries API first, falls back to mock data if unavailable.
 */

import { useState, useEffect, useCallback } from 'react';
import { Delivery } from '@/shared/types/delivery';
import { getDelivery } from '../deliveries.service';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';
import mockDeliveries from '@/shared/data/mockDeliveries';

interface UseDeliveryResult {
  /** The delivery data */
  delivery: Delivery | null;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether data came from mock (fallback) */
  isMockData: boolean;
  /** Refresh the delivery data */
  refresh: () => Promise<void>;
}

export function useDelivery(deliveryId: string): UseDeliveryResult {
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const companyId = activeBusiness?.id || 'biz-001';

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMockData, setIsMockData] = useState(false);

  const fetchDelivery = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getDelivery(companyId, deliveryId);
      setDelivery(result);
      setIsMockData(false);

      if (__DEV__) {
        console.log(`[useDelivery] Loaded delivery ${deliveryId} from API`);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load delivery';
      setError(message);

      // Fallback to mock data
      if (__DEV__) {
        console.warn('[useDelivery] API failed, using mock data:', message);
      }

      const mockDelivery = (mockDeliveries as Delivery[]).find(d => d.id === deliveryId);
      if (mockDelivery) {
        setDelivery(mockDelivery);
        setIsMockData(true);
      } else {
        // If no mock data found either, use first mock delivery as fallback
        setDelivery((mockDeliveries as Delivery[])[0] || null);
        setIsMockData(true);
      }
    } finally {
      setLoading(false);
    }
  }, [companyId, deliveryId]);

  // Fetch on mount and when deliveryId changes
  useEffect(() => {
    fetchDelivery();
  }, [fetchDelivery]);

  return {
    delivery,
    loading,
    error,
    isMockData,
    refresh: fetchDelivery,
  };
}

export default useDelivery;
