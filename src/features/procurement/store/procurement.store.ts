/**
 * Procurement Store (Feature-scoped)
 *
 * Single source of truth for procurement state:
 * - suppliers, purchase requests, purchase orders
 * - loading/error states
 * - staleness tracking
 *
 * Contract:
 * - Store is state + pure state transitions (no network calls)
 * - IO lives in services (procurement.service.ts)
 * - Hooks orchestrate fetches and write to store
 */

import { create } from 'zustand';
import type {
  Supplier,
  PurchaseRequest,
  PurchaseOrder,
  PurchaseOrderStatus,
} from '@/shared/types/procurement';

// ============================================================================
// State Types
// ============================================================================

export interface ProcurementState {
  suppliers: Supplier[];
  purchaseRequests: PurchaseRequest[];
  purchaseOrders: PurchaseOrder[];
  selectedOrderId: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

export interface ProcurementActions {
  // Suppliers
  setSuppliers: (suppliers: Supplier[]) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (supplierId: string, updates: Partial<Supplier>) => void;
  removeSupplier: (supplierId: string) => void;

  // Purchase Requests
  setPurchaseRequests: (prs: PurchaseRequest[]) => void;
  addPurchaseRequest: (pr: PurchaseRequest) => void;
  updatePurchaseRequest: (prId: string, updates: Partial<PurchaseRequest>) => void;

  // Purchase Orders
  setPurchaseOrders: (pos: PurchaseOrder[]) => void;
  addPurchaseOrder: (po: PurchaseOrder) => void;
  updatePurchaseOrder: (poId: string, updates: Partial<PurchaseOrder>) => void;
  updatePurchaseOrderStatus: (poId: string, status: PurchaseOrderStatus) => void;
  removePurchaseOrder: (poId: string) => void;

  // Selection
  setSelectedOrderId: (orderId: string | null) => void;

  // Loading/error
  setLoading: (isLoading: boolean) => void;
  setRefreshing: (isRefreshing: boolean) => void;
  setError: (error: string | null) => void;

  // Reset
  resetProcurement: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: ProcurementState = {
  suppliers: [],
  purchaseRequests: [],
  purchaseOrders: [],
  selectedOrderId: null,
  isLoading: true,
  isRefreshing: false,
  error: null,
  lastFetchedAt: null,
};

// ============================================================================
// Store
// ============================================================================

export const useProcurementStore = create<ProcurementState & ProcurementActions>((set) => ({
  ...initialState,

  // ========== Suppliers ==========

  setSuppliers: (suppliers) => set({ suppliers, lastFetchedAt: Date.now() }),

  addSupplier: (supplier) => set((state) => ({
    suppliers: [supplier, ...state.suppliers],
  })),

  updateSupplier: (supplierId, updates) => set((state) => ({
    suppliers: state.suppliers.map((s) =>
      s.id === supplierId ? { ...s, ...updates } : s
    ),
  })),

  removeSupplier: (supplierId) => set((state) => ({
    suppliers: state.suppliers.filter((s) => s.id !== supplierId),
  })),

  // ========== Purchase Requests ==========

  setPurchaseRequests: (purchaseRequests) => set({ purchaseRequests }),

  addPurchaseRequest: (pr) => set((state) => ({
    purchaseRequests: [pr, ...state.purchaseRequests],
  })),

  updatePurchaseRequest: (prId, updates) => set((state) => ({
    purchaseRequests: state.purchaseRequests.map((pr) =>
      pr.id === prId ? { ...pr, ...updates } : pr
    ),
  })),

  // ========== Purchase Orders ==========

  setPurchaseOrders: (purchaseOrders) => set({ purchaseOrders }),

  addPurchaseOrder: (po) => set((state) => ({
    purchaseOrders: [po, ...state.purchaseOrders],
  })),

  updatePurchaseOrder: (poId, updates) => set((state) => ({
    purchaseOrders: state.purchaseOrders.map((po) =>
      po.id === poId ? { ...po, ...updates } : po
    ),
  })),

  updatePurchaseOrderStatus: (poId, status) => set((state) => ({
    purchaseOrders: state.purchaseOrders.map((po) =>
      po.id === poId ? { ...po, status } : po
    ),
  })),

  removePurchaseOrder: (poId) => set((state) => ({
    purchaseOrders: state.purchaseOrders.filter((po) => po.id !== poId),
    selectedOrderId: state.selectedOrderId === poId ? null : state.selectedOrderId,
  })),

  // ========== Selection ==========

  setSelectedOrderId: (orderId) => set({ selectedOrderId: orderId }),

  // ========== Loading/Error ==========

  setLoading: (isLoading) => set({ isLoading }),
  setRefreshing: (isRefreshing) => set({ isRefreshing }),
  setError: (error) => set({ error }),

  // ========== Reset ==========

  resetProcurement: () => set(initialState),
}));

// ============================================================================
// Selectors
// ============================================================================

export const selectSupplierById = (supplierId: string) => (state: ProcurementState) =>
  state.suppliers.find((s) => s.id === supplierId);

export const selectPurchaseOrderById = (poId: string) => (state: ProcurementState) =>
  state.purchaseOrders.find((po) => po.id === poId);

export const selectPurchaseOrdersByStatus = (status: PurchaseOrderStatus) => (state: ProcurementState) =>
  state.purchaseOrders.filter((po) => po.status === status);

export const selectOpenPRCount = (state: ProcurementState) =>
  state.purchaseRequests.filter((pr) => pr.status === 'SUBMITTED').length;

export const selectActivePOCount = (state: ProcurementState) =>
  state.purchaseOrders.filter((po) =>
    po.status === 'SENT' || po.status === 'CONFIRMED' || po.status === 'PARTIALLY_RECEIVED'
  ).length;

export const selectAwaitingReceiptCount = (state: ProcurementState) =>
  state.purchaseOrders.filter((po) =>
    po.status === 'CONFIRMED' || po.status === 'PARTIALLY_RECEIVED'
  ).length;

export const selectPendingProcurementCount = (state: ProcurementState) =>
  selectOpenPRCount(state) + selectAwaitingReceiptCount(state);

export const selectIsDataStale = (state: ProcurementState) => {
  if (!state.lastFetchedAt) return true;
  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() - state.lastFetchedAt > fiveMinutes;
};
