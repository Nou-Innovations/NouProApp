/**
 * usePurchaseRequests Hook
 *
 * Fetches purchase requests, handles status filtering, submit/approve/reject actions.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useProfileStore } from '@/shared/store/profileStore';
import { useProcurementStore } from '../store/procurement.store';
import * as procurementService from '../services/procurement.service';
import type { PurchaseRequest, PurchaseRequestFilterTab, PurchaseRequestStatus } from '@/shared/types/procurement';
import { PR_FILTER_TAB_STATUSES } from '@/shared/types/procurement';
import { ApiError } from '@/shared/services/api';

export function usePurchaseRequests() {
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id || '';

  const purchaseRequests = useProcurementStore((s) => s.purchaseRequests);
  const isLoading = useProcurementStore((s) => s.isLoading);
  const isRefreshing = useProcurementStore((s) => s.isRefreshing);
  const error = useProcurementStore((s) => s.error);
  const { setPurchaseRequests, updatePurchaseRequest, setLoading, setRefreshing, setError } = useProcurementStore.getState();

  const [statusFilter, setStatusFilter] = useState<PurchaseRequestFilterTab>('all');
  const [search, setSearch] = useState('');

  const fetchPurchaseRequests = useCallback(async (isRefresh = false) => {
    if (!businessId) return;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await procurementService.getPurchaseRequests(businessId);
      setPurchaseRequests(data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load purchase requests';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchPurchaseRequests();
  }, [fetchPurchaseRequests]);

  const filteredRequests = useMemo(() => {
    let result = purchaseRequests;

    // Status filter
    const statusValue = PR_FILTER_TAB_STATUSES[statusFilter];
    if (statusValue) {
      result = result.filter((pr) => pr.status === statusValue);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (pr) =>
          pr.id.toLowerCase().includes(q) ||
          (pr.supplier?.name || '').toLowerCase().includes(q) ||
          pr.items.some((item) => item.productName.toLowerCase().includes(q))
      );
    }

    return result;
  }, [purchaseRequests, statusFilter, search]);

  const refresh = useCallback(() => fetchPurchaseRequests(true), [fetchPurchaseRequests]);

  const handleSubmit = useCallback(async (prId: string) => {
    const result = await procurementService.submitPurchaseRequest(businessId, prId);
    updatePurchaseRequest(prId, result);
    return result;
  }, [businessId]);

  const handleApprove = useCallback(async (prId: string) => {
    const result = await procurementService.approvePurchaseRequest(businessId, prId);
    updatePurchaseRequest(prId, result);
    return result;
  }, [businessId]);

  const handleReject = useCallback(async (prId: string, reason: string) => {
    const result = await procurementService.rejectPurchaseRequest(businessId, prId, reason);
    updatePurchaseRequest(prId, result);
    return result;
  }, [businessId]);

  const handleConvert = useCallback(async (prId: string) => {
    const po = await procurementService.convertPurchaseRequest(businessId, prId);
    updatePurchaseRequest(prId, { status: 'CONVERTED', purchaseOrderId: po.id });
    return po;
  }, [businessId]);

  return {
    purchaseRequests: filteredRequests,
    allPurchaseRequests: purchaseRequests,
    loading: isLoading,
    refreshing: isRefreshing,
    error,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    refresh,
    handleSubmit,
    handleApprove,
    handleReject,
    handleConvert,
  };
}
