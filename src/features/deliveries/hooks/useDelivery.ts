/**
 * useDelivery Hook
 * 
 * Returns a single delivery by ID from the Zustand store.
 * If not found in the store, fetches from API and writes to the store.
 * Subscribes to store changes so the detail view updates when actions modify the delivery.
 */

import { useState, useEffect, useCallback } from 'react';
import { Delivery } from '@/shared/types/delivery';
import { getDelivery } from '../deliveries.service';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';
import { useDeliveriesStore } from '../deliveries.store';

interface UseDeliveryResult {
  /** The delivery data */
  delivery: Delivery | null;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether data came from mock (fallback) */
  isMockData: boolean;
  /** Refresh the delivery data from the API */
  refresh: () => Promise<void>;
}

export function useDelivery(deliveryId: string): UseDeliveryResult {
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const companyId = activeBusiness?.id || '';

  // Read delivery from the Zustand store (reactive -- re-renders when store changes)
  const storeDelivery = useDeliveriesStore((state) =>
    state.deliveries.find((d) => d.id === deliveryId) || null
  );
  const updateDeliveryInStore = useDeliveriesStore((state) => state.updateDelivery);
  const addDeliveryToStore = useDeliveriesStore((state) => state.addDelivery);

  // Show loading only when there's no cached data at all
  const [loading, setLoading] = useState(!storeDelivery);
  const [error, setError] = useState<string | null>(null);
  const [isMockData, setIsMockData] = useState(false);

  const fetchDelivery = useCallback(async (background = false) => {
    if (!companyId) return;

    // Only show loading spinner when there's no cached data to display
    if (!background) setLoading(true);
    setError(null);

    try {
      const result = await getDelivery(companyId, deliveryId);

      // Write fetched delivery to the store
      const existing = useDeliveriesStore.getState().deliveries.find((d) => d.id === deliveryId);
      if (existing) {
        updateDeliveryInStore(deliveryId, result);
      } else {
        addDeliveryToStore(result);
      }

      setIsMockData(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load delivery';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [companyId, deliveryId, updateDeliveryInStore, addDeliveryToStore]);

  // Always fetch on mount to ensure fresh data.
  // If store already has the delivery, show it immediately (no loading flicker)
  // and refresh in the background.
  useEffect(() => {
    if (storeDelivery) {
      setLoading(false);
      // Background refresh to ensure data is fresh
      fetchDelivery(true);
    } else {
      fetchDelivery();
    }
  }, [deliveryId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    delivery: storeDelivery,
    loading,
    error,
    isMockData,
    refresh: fetchDelivery,
  };
}

export default useDelivery;
