/**
 * useDeliveries Hook
 * 
 * ARCHITECTURE: React hook that connects DeliveryScreen to delivery data.
 * 
 * Features:
 * - Fetches deliveries for current company/location
 * - Client-side filtering by status, view type, search
 * - Pull-to-refresh
 * - Count of new deliveries for badge
 * - Error handling if API fails
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Delivery, DeliveryStatus, DeliveryViewType, DeliveryFilterTab, DELIVERY_FILTER_TAB_STATUSES } from '@/shared/types/delivery';
import { getDeliveries, updateDeliveryStatus, assignDelivery } from '../deliveries.service';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useDeliveriesStore } from '../deliveries.store';

interface UseDeliveriesOptions {
  /** Auto-fetch on mount */
  autoFetch?: boolean;
}

interface UseDeliveriesResult {
  /** All deliveries from API */
  deliveries: Delivery[];
  /** Filtered deliveries based on current filters */
  filteredDeliveries: Delivery[];
  /** Loading state */
  loading: boolean;
  /** Refreshing state (pull-to-refresh) */
  refreshing: boolean;
  /** Error message if any */
  error: string | null;
  /** Current status filter tab */
  statusFilter: DeliveryFilterTab;
  /** Current view type (all/outgoing/incoming/transfers) */
  viewType: DeliveryViewType;
  /** Current search query */
  search: string;
  /** Current location filter */
  selectedLocationId: string | null;
  /** Count of new deliveries */
  newDeliveriesCount: number;
  /** Set the status filter tab */
  setStatusFilter: (tab: DeliveryFilterTab) => void;
  /** Set the view type */
  setViewType: (type: DeliveryViewType) => void;
  /** Set the search query */
  setSearch: (search: string) => void;
  /** Set the location filter */
  setSelectedLocationId: (locationId: string | null) => void;
  /** Refresh deliveries */
  refresh: () => Promise<void>;
  /** Update a delivery's status */
  updateStatus: (deliveryId: string, status: DeliveryStatus) => Promise<void>;
  /** Assign a delivery to staff */
  assign: (deliveryId: string, staffId: string, staffName: string) => Promise<void>;
}

export function useDeliveries(options: UseDeliveriesOptions = {}): UseDeliveriesResult {
  const { autoFetch = true } = options;
  
  // Use canonical source: useProfileStore.activeBusiness for company context
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const companyId = activeBusiness?.id || '';
  // Location data comes from businessStore - persisted across sessions (use selectors to avoid full-store re-renders)
  const currentLocation = useBusinessStore((state) => state.currentLocation);
  const setLocation = useBusinessStore((state) => state.setLocation);
  
  // selectedLocationId is derived from store's currentLocation (persisted)
  const selectedLocationId = currentLocation?.id || null;
  // Wrapper to update store
  const setSelectedLocationId = useCallback((locationId: string | null) => {
    if (locationId === null) {
      setLocation(null);
    } else {
      // We need locations array to find the location object
      const locations = useBusinessStore.getState().locations;
      const location = locations?.find(loc => loc.id === locationId);
      setLocation(location || null);
    }
  }, [setLocation]);
  
  // Use Zustand store as the source of truth for deliveries
  const store = useDeliveriesStore();
  const deliveries = store.deliveries;
  const loading = store.isLoading;
  const refreshing = store.isRefreshing;
  const error = store.error;

  const setDeliveries = store.setDeliveries;
  const setLoading = store.setLoading;
  const setRefreshing = store.setRefreshing;
  const setError = store.setError;
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<DeliveryFilterTab>('all');
  const [viewType, setViewType] = useState<DeliveryViewType>('all');
  const [search, setSearch] = useState('');
  
  // Fetch deliveries
  const fetchDeliveries = useCallback(async (isRefresh = false) => {
    if (!companyId) return; // No business selected, skip fetch

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const result = await getDeliveries({
        companyId,
        locationId: selectedLocationId || undefined,
      });
      setDeliveries(result);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load deliveries';
      setError(message);
      setDeliveries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, selectedLocationId]);
  
  // Apply client-side filters
  const filteredDeliveries = useMemo(() => {
    let result = deliveries;
    
    // Filter by view type
    switch (viewType) {
      case 'outgoing':
        result = result.filter(d => d.direction === 'outgoing');
        break;
      case 'incoming':
        result = result.filter(d => d.direction === 'incoming');
        break;
      case 'transfers':
        result = result.filter(d => d.type === 'transfer');
        break;
      // 'all' shows everything
    }
    
    // Filter by status tab (each tab maps to one or more DeliveryStatus values)
    if (statusFilter !== 'all') {
      const allowedStatuses = DELIVERY_FILTER_TAB_STATUSES[statusFilter];
      result = result.filter(d => allowedStatuses.includes(d.deliveryStatus));
    }
    
    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(d =>
        (d.clientCompanyName || '').toLowerCase().includes(searchLower) ||
        d.id.toLowerCase().includes(searchLower) ||
        (d.clientAddress || '').toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [deliveries, viewType, statusFilter, search]);
  
  // Count new deliveries (NOT_ASSIGNED status) -- uses unfiltered list for accurate badge
  const newDeliveriesCount = useMemo(() => {
    return deliveries.filter(d => d.deliveryStatus === 'NOT_ASSIGNED').length;
  }, [deliveries]);
  
  // Update delivery status
  const updateStatus = useCallback(async (deliveryId: string, status: DeliveryStatus) => {
    try {
      await updateDeliveryStatus(companyId, deliveryId, status);
      store.updateDeliveryStatus(deliveryId, status);
    } catch (err) {
      if (__DEV__) {
        console.error('[useDeliveries] Failed to update status:', err);
      }
      throw err;
    }
  }, [companyId, store]);

  // Assign delivery
  const assign = useCallback(async (deliveryId: string, staffId: string, staffName: string) => {
    try {
      await assignDelivery(companyId, deliveryId, staffId, staffName);
      store.assignDelivery(deliveryId, staffId, staffName);
    } catch (err) {
      if (__DEV__) {
        console.error('[useDeliveries] Failed to assign delivery:', err);
      }
      throw err;
    }
  }, [companyId, store]);
  
  // Refresh function
  const refresh = useCallback(() => fetchDeliveries(true), [fetchDeliveries]);
  
  // Re-fetch when location changes
  useEffect(() => {
    if (autoFetch) {
      fetchDeliveries();
    }
  }, [autoFetch, fetchDeliveries]);
  
  return {
    deliveries,
    filteredDeliveries,
    loading,
    refreshing,
    error,
    statusFilter,
    viewType,
    search,
    selectedLocationId,
    newDeliveriesCount,
    setStatusFilter,
    setViewType,
    setSearch,
    setSelectedLocationId,
    refresh,
    updateStatus,
    assign,
  };
}

export default useDeliveries;

