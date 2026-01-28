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
 * - Fallback to mock data if API fails
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Delivery, DeliveryStatus, DeliveryViewType } from '@/shared/types/delivery';
import { getDeliveries, updateDeliveryStatus, assignDelivery } from '../deliveries.service';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';
import mockDeliveries from '@/shared/data/mockDeliveries';

interface UseDeliveriesOptions {
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Initial location filter */
  locationId?: string;
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
  /** Whether data came from mock (fallback) */
  isMockData: boolean;
  /** Current status filter */
  statusFilter: DeliveryStatus | 'all';
  /** Current view type (all/outgoing/incoming/transfers) */
  viewType: DeliveryViewType;
  /** Current search query */
  search: string;
  /** Current location filter */
  selectedLocationId: string | null;
  /** Count of new deliveries */
  newDeliveriesCount: number;
  /** Set the status filter */
  setStatusFilter: (status: DeliveryStatus | 'all') => void;
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
  const { autoFetch = true, locationId: initialLocationId } = options;
  
  // Use canonical source: useProfileStore.activeBusiness for company context
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const companyId = activeBusiness?.id || 'biz-001';
  // Location data comes from businessStore - persisted across sessions
  const { currentLocation, setLocation } = useBusinessStore();
  
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
  
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMockData, setIsMockData] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  const [viewType, setViewType] = useState<DeliveryViewType>('all');
  const [search, setSearch] = useState('');
  
  // Fetch deliveries
  const fetchDeliveries = useCallback(async (isRefresh = false) => {
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
      setIsMockData(false);
      
      if (__DEV__) {
        console.log(`[useDeliveries] Loaded ${result.length} deliveries from API`);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load deliveries';
      setError(message);
      
      // Fallback to mock data
      if (__DEV__) {
        console.warn('[useDeliveries] API failed, using mock data:', message);
      }
      
      // Filter mock data by location if specified
      let mockData = [...mockDeliveries] as Delivery[];
      if (selectedLocationId) {
        mockData = mockData.filter(d => d.locationId === selectedLocationId);
      }
      setDeliveries(mockData);
      setIsMockData(true);
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
        result = result.filter(d => d.direction === 'outgoing' || !d.direction);
        break;
      case 'incoming':
        result = result.filter(d => d.direction === 'incoming');
        break;
      case 'transfers':
        result = result.filter(d => d.type === 'transfer');
        break;
      // 'all' shows everything
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(d => d.deliveryStatus === statusFilter);
    }
    
    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(d =>
        d.clientCompanyName.toLowerCase().includes(searchLower) ||
        d.id.toLowerCase().includes(searchLower) ||
        d.clientAddress?.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [deliveries, viewType, statusFilter, search]);
  
  // Count new deliveries (NOT_ASSIGNED status)
  const newDeliveriesCount = useMemo(() => {
    return filteredDeliveries.filter(d => d.deliveryStatus === 'NOT_ASSIGNED').length;
  }, [filteredDeliveries]);
  
  // Update delivery status
  const updateStatus = useCallback(async (deliveryId: string, status: DeliveryStatus) => {
    if (isMockData) {
      // Update local state for mock data
      setDeliveries(prev => prev.map(d => 
        d.id === deliveryId ? { ...d, deliveryStatus: status } : d
      ));
      return;
    }
    
    try {
      await updateDeliveryStatus(companyId, deliveryId, status);
      // Update local state
      setDeliveries(prev => prev.map(d => 
        d.id === deliveryId ? { ...d, deliveryStatus: status } : d
      ));
    } catch (err) {
      if (__DEV__) {
        console.error('[useDeliveries] Failed to update status:', err);
      }
      throw err;
    }
  }, [companyId, isMockData]);
  
  // Assign delivery
  const assign = useCallback(async (deliveryId: string, staffId: string, staffName: string) => {
    if (isMockData) {
      // Update local state for mock data
      setDeliveries(prev => prev.map(d => 
        d.id === deliveryId ? { ...d, assignedStaffId: staffId, assignedTo: staffName } : d
      ));
      return;
    }
    
    try {
      await assignDelivery(companyId, deliveryId, staffId, staffName);
      // Update local state
      setDeliveries(prev => prev.map(d => 
        d.id === deliveryId ? { ...d, assignedStaffId: staffId, assignedTo: staffName } : d
      ));
    } catch (err) {
      if (__DEV__) {
        console.error('[useDeliveries] Failed to assign delivery:', err);
      }
      throw err;
    }
  }, [companyId, isMockData]);
  
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
    isMockData,
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

