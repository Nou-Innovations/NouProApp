/**
 * useSuppliers Hook
 *
 * Fetches suppliers for the active business, handles search filtering.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useProfileStore } from '@/shared/store/profileStore';
import { useProcurementStore } from '../store/procurement.store';
import * as procurementService from '../services/procurement.service';
import type { Supplier } from '@/shared/types/procurement';
import { ApiError } from '@/shared/services/api';

export function useSuppliers() {
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id || '';

  const suppliers = useProcurementStore((s) => s.suppliers);
  const isLoading = useProcurementStore((s) => s.isLoading);
  const isRefreshing = useProcurementStore((s) => s.isRefreshing);
  const error = useProcurementStore((s) => s.error);
  const { setSuppliers, setLoading, setRefreshing, setError } = useProcurementStore.getState();

  const [search, setSearch] = useState('');

  const fetchSuppliers = useCallback(async (isRefresh = false) => {
    if (!businessId) return;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await procurementService.getSuppliers(businessId);
      setSuppliers(data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load suppliers';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contactName || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const refresh = useCallback(() => fetchSuppliers(true), [fetchSuppliers]);

  return {
    suppliers: filteredSuppliers,
    allSuppliers: suppliers,
    loading: isLoading,
    refreshing: isRefreshing,
    error,
    search,
    setSearch,
    refresh,
  };
}
