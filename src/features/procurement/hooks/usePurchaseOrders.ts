/**
 * usePurchaseOrders Hook
 *
 * Fetches purchase orders, handles status filtering, status update actions.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useProfileStore } from '@/shared/store/profileStore';
import { useProcurementStore } from '../store/procurement.store';
import * as procurementService from '../services/procurement.service';
import type { PurchaseOrder, PurchaseOrderFilterTab, PurchaseOrderStatus } from '@/shared/types/procurement';
import { PO_FILTER_TAB_STATUSES } from '@/shared/types/procurement';
import { ApiError } from '@/shared/services/api';

export function usePurchaseOrders() {
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id || '';

  const purchaseOrders = useProcurementStore((s) => s.purchaseOrders);
  const isLoading = useProcurementStore((s) => s.isLoading);
  const isRefreshing = useProcurementStore((s) => s.isRefreshing);
  const error = useProcurementStore((s) => s.error);
  const { setPurchaseOrders, updatePurchaseOrder, setLoading, setRefreshing, setError } = useProcurementStore.getState();

  const [statusFilter, setStatusFilter] = useState<PurchaseOrderFilterTab>('all');
  const [search, setSearch] = useState('');

  const fetchPurchaseOrders = useCallback(async (isRefresh = false) => {
    if (!businessId) return;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await procurementService.getPurchaseOrders(businessId);
      setPurchaseOrders(data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load purchase orders';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  const filteredOrders = useMemo(() => {
    let result = purchaseOrders;

    // Status filter
    const statusValue = PO_FILTER_TAB_STATUSES[statusFilter];
    if (statusValue) {
      if (Array.isArray(statusValue)) {
        result = result.filter((po) => (statusValue as PurchaseOrderStatus[]).includes(po.status));
      } else {
        result = result.filter((po) => po.status === statusValue);
      }
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (po) =>
          po.id.toLowerCase().includes(q) ||
          (po.poNumber || '').toLowerCase().includes(q) ||
          (po.supplier?.name || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [purchaseOrders, statusFilter, search]);

  const refresh = useCallback(() => fetchPurchaseOrders(true), [fetchPurchaseOrders]);

  const handleStatusChange = useCallback(async (poId: string, nextStatus: string, reason?: string) => {
    const result = await procurementService.updatePurchaseOrderStatus(businessId, poId, nextStatus, reason);
    updatePurchaseOrder(poId, result);
    return result;
  }, [businessId]);

  return {
    purchaseOrders: filteredOrders,
    allPurchaseOrders: purchaseOrders,
    loading: isLoading,
    refreshing: isRefreshing,
    error,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    refresh,
    handleStatusChange,
  };
}
