/**
 * useInvoices Hook
 * 
 * ARCHITECTURE: React hook that connects screens to invoices data.
 * 
 * This hook:
 * - Manages loading/error states
 * - Calls invoices.service
 * - Exposes clean API to screens
 * 
 * Screens should use this hook, not call service directly.
 */

import { useState, useEffect, useCallback } from 'react';
import invoicesService, { Invoice, InvoiceFilters, InvoiceStatus } from '../invoices.service';
import { useProfileStore } from '@/shared/store/profileStore';
import { ApiError } from '@/shared/services/api';

interface UseInvoicesResult {
  /** List of invoices */
  invoices: Invoice[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refetch invoices */
  refetch: () => Promise<void>;
  /** Filter invoices client-side (for search/status) */
  filteredInvoices: (options: {
    search?: string;
    status?: InvoiceStatus | 'all';
    type?: 'invoice' | 'estimate';
  }) => Invoice[];
}

interface UseInvoicesOptions {
  /** Location ID to filter by */
  locationId?: string | null;
  /** Auto-fetch on mount */
  autoFetch?: boolean;
}

export function useInvoices(options: UseInvoicesOptions = {}): UseInvoicesResult {
  const { locationId, autoFetch = true } = options;
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Get business ID from profile store
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const businessId = activeBusiness?.id;

  const fetchInvoices = useCallback(async () => {
    if (!businessId) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filters: InvoiceFilters = {};
      if (locationId) {
        filters.locationId = locationId;
      }

      const data = await invoicesService.getInvoices(businessId, filters);
      // Normalize status and type to lowercase (backend returns UPPERCASE Prisma enums)
      const normalized = normalizeInvoices(data);
      setInvoices(normalized);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load invoices';
      setError(message);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, locationId]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchInvoices();
    }
  }, [fetchInvoices, autoFetch]);

  // Client-side filtering (search, status, type)
  const filteredInvoices = useCallback(
    ({ search, status, type }: { search?: string; status?: InvoiceStatus | 'all'; type?: 'invoice' | 'estimate' }) => {
      let result = [...invoices];

      // Filter by type
      if (type) {
        result = result.filter((inv) => inv.type === type);
      }

      // Filter by status
      if (status && status !== 'all') {
        result = result.filter((inv) => inv.status === status);
      }

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        result = result.filter(
          (inv) =>
            inv.clientName.toLowerCase().includes(searchLower) ||
            inv.id.toLowerCase().includes(searchLower) ||
            (inv.invoiceNumber || '').toLowerCase().includes(searchLower)
        );
      }

      return result;
    },
    [invoices]
  );

  return {
    invoices,
    loading,
    error,
    refetch: fetchInvoices,
    filteredInvoices,
  };
}

// ============================================================================
// Helper: Normalize API response (backend returns UPPERCASE enums)
// ============================================================================

function normalizeInvoices(invoices: Invoice[]): Invoice[] {
  return invoices.map((inv) => ({
    ...inv,
    status: ((inv.status || 'draft') as string).toLowerCase() as InvoiceStatus,
    type: ((inv.type || 'invoice') as string).toLowerCase() as 'invoice' | 'estimate',
  }));
}

export default useInvoices;

