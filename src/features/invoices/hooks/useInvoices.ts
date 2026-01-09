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

// For MVP: fall back to mock data if API fails
import mockInvoicesData from '@/shared/data/mockInvoices';

interface UseInvoicesResult {
  /** List of invoices */
  invoices: Invoice[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether data came from mock (fallback) */
  isMockData: boolean;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMockData, setIsMockData] = useState(false);
  
  // Get company ID from profile store
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const companyId = activeBusiness?.id;

  const fetchInvoices = useCallback(async () => {
    if (!companyId) {
      // No company selected - use mock data for now
      if (__DEV__) {
        console.log('[useInvoices] No companyId, using mock data');
      }
      setInvoices(transformMockInvoices(mockInvoicesData));
      setIsMockData(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filters: InvoiceFilters = {};
      if (locationId) {
        filters.locationId = locationId;
      }

      const data = await invoicesService.getInvoices(companyId, filters);
      setInvoices(data);
      setIsMockData(false);
      
      if (__DEV__) {
        console.log(`[useInvoices] Fetched ${data.length} invoices from API`);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load invoices';
      setError(message);
      
      // Fallback to mock data for MVP
      if (__DEV__) {
        console.warn('[useInvoices] API failed, falling back to mock data:', message);
      }
      setInvoices(transformMockInvoices(mockInvoicesData));
      setIsMockData(true);
    } finally {
      setLoading(false);
    }
  }, [companyId, locationId]);

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
            inv.id.toLowerCase().includes(searchLower)
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
    isMockData,
    refetch: fetchInvoices,
    filteredInvoices,
  };
}

// ============================================================================
// Helper: Transform mock data to match API shape
// ============================================================================

function transformMockInvoices(mockData: typeof mockInvoicesData): Invoice[] {
  return mockData.map((mock) => ({
    id: mock.id,
    companyId: 'comp-1', // Default for mock
    locationId: mock.locationId || 'loc-1',
    clientName: mock.clientName,
    clientEmail: mock.clientContact.email,
    amount: mock.subtotal,
    taxAmount: mock.taxTotal,
    totalAmount: mock.total,
    status: mock.status as InvoiceStatus,
    type: mock.type.toLowerCase() as 'invoice' | 'estimate',
    issueDate: mock.date,
    dueDate: mock.dueDate,
    items: mock.items.map((item) => ({
      productId: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.total,
    })),
    notes: mock.notes,
    createdAt: mock.date,
    updatedAt: mock.date,
  }));
}

export default useInvoices;

