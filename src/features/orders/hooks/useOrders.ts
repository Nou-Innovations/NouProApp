/**
 * useOrders Hook
 *
 * ARCHITECTURE: React hook that connects screens to order data.
 * Mirrors the useInvoices pattern (API → Service → Store → Hook → Screen).
 *
 * Pulls the active business id from the profile store, fetches both
 * incoming (we are the seller) and outgoing (we are the buyer) orders
 * via the order store, and exposes clean derived lists to screens.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOrderStore } from '@/shared/store/orderStore';
import { useProfileStore } from '@/shared/store/profileStore';

interface UseOrdersOptions {
  /** Auto-fetch on mount */
  autoFetch?: boolean;
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { autoFetch = true } = options;

  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const businessId = activeBusiness?.id;

  const orders = useOrderStore((state) => state.orders);
  const error = useOrderStore((state) => state.error);
  const fetchOrders = useOrderStore((state) => state.fetchOrders);
  const fetchPlacedOrders = useOrderStore((state) => state.fetchPlacedOrders);

  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Sequential to avoid the two merges racing on shared store state.
      await fetchOrders(businessId);
      await fetchPlacedOrders(businessId);
    } finally {
      setLoading(false);
    }
  }, [businessId, fetchOrders, fetchPlacedOrders]);

  useEffect(() => {
    if (autoFetch) {
      refetch();
    }
  }, [refetch, autoFetch]);

  // Incoming: orders placed TO this business (we are the seller)
  const incoming = useMemo(
    () => orders.filter((o) => o.businessId === businessId),
    [orders, businessId]
  );

  // Outgoing: orders placed BY this business (we are the buyer)
  const outgoing = useMemo(
    () => orders.filter((o) => o.buyerBusinessId === businessId),
    [orders, businessId]
  );

  return {
    orders,
    incoming,
    outgoing,
    loading,
    error,
    refetch,
  };
}

export default useOrders;
