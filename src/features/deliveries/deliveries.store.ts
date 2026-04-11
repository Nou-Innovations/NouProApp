/**
 * Deliveries Store (Feature-scoped)
 *
 * Single source of truth for delivery state:
 * - deliveries list (HTTP API + future real-time/push updates)
 * - delivery counts for badges
 * - loading/error states
 *
 * Contract:
 * - Store is state + pure state transitions (no network calls)
 * - IO lives in services (deliveries.service.ts)
 * - Hooks orchestrate fetches and write to store
 *
 * Why this store exists:
 * - Delivery badges shown in multiple tabs
 * - Push notifications can update deliveries
 * - Staff assignments may update in real-time
 * - Consistent state across DeliveryScreen and other views
 */

import { create } from 'zustand';
import type { Delivery, DeliveryStatus, DeliveryStaffAssignment } from '@/shared/types/delivery';

// ============================================================================
// State Types
// ============================================================================

export interface DeliveriesState {
  // Delivery list (source of truth)
  deliveries: Delivery[];
  
  // Selected delivery for detail view
  selectedDeliveryId: string | null;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  
  // Last fetch timestamp (for staleness checks)
  lastFetchedAt: number | null;
}

export interface DeliveriesActions {
  // Delivery list actions
  setDeliveries: (deliveries: Delivery[]) => void;
  addDelivery: (delivery: Delivery) => void;
  updateDelivery: (deliveryId: string, updates: Partial<Delivery>) => void;
  removeDelivery: (deliveryId: string) => void;
  
  // Status updates
  updateDeliveryStatus: (deliveryId: string, status: DeliveryStatus) => void;
  assignDelivery: (deliveryId: string, staffId: string, staffName: string) => void;

  // Multi-staff assignment actions
  addStaffAssignment: (deliveryId: string, assignment: DeliveryStaffAssignment) => void;
  removeStaffAssignment: (deliveryId: string, userId: string) => void;
  setStaffAssignments: (deliveryId: string, assignments: DeliveryStaffAssignment[]) => void;
  updateStaffRole: (deliveryId: string, userId: string, role: DeliveryStaffAssignment['role']) => void;

  // Selection
  setSelectedDelivery: (deliveryId: string | null) => void;
  
  // Loading/error state
  setLoading: (isLoading: boolean) => void;
  setRefreshing: (isRefreshing: boolean) => void;
  setError: (error: string | null) => void;
  
  // Reset
  resetDeliveries: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: DeliveriesState = {
  deliveries: [],
  selectedDeliveryId: null,
  isLoading: true,
  isRefreshing: false,
  error: null,
  lastFetchedAt: null,
};

// ============================================================================
// Store
// ============================================================================

export const useDeliveriesStore = create<DeliveriesState & DeliveriesActions>((set, get) => ({
  ...initialState,

  // ========== Delivery List Actions ==========
  
  setDeliveries: (deliveries) => set({ 
    deliveries, 
    lastFetchedAt: Date.now() 
  }),

  addDelivery: (delivery) => set((state) => ({
    deliveries: [delivery, ...state.deliveries],
  })),

  updateDelivery: (deliveryId, updates) => set((state) => ({
    deliveries: state.deliveries.map((d) =>
      d.id === deliveryId ? { ...d, ...updates } : d
    ),
  })),

  removeDelivery: (deliveryId) => set((state) => ({
    deliveries: state.deliveries.filter((d) => d.id !== deliveryId),
    // Clear selection if removed delivery was selected
    selectedDeliveryId: state.selectedDeliveryId === deliveryId 
      ? null 
      : state.selectedDeliveryId,
  })),

  // ========== Status Updates ==========
  
  updateDeliveryStatus: (deliveryId, status) => set((state) => ({
    deliveries: state.deliveries.map((d) =>
      d.id === deliveryId ? { ...d, deliveryStatus: status } : d
    ),
  })),

  assignDelivery: (deliveryId, staffId, staffName) => set((state) => ({
    deliveries: state.deliveries.map((d) =>
      d.id === deliveryId
        ? {
            ...d,
            assignedStaffId: staffId,
            assignedTo: staffName,
            deliveryStatus: d.deliveryStatus === 'NOT_ASSIGNED' ? 'ASSIGNED' : d.deliveryStatus,
          }
        : d
    ),
  })),

  addStaffAssignment: (deliveryId, assignment) => set((state) => ({
    deliveries: state.deliveries.map((d) =>
      d.id === deliveryId
        ? {
            ...d,
            staffAssignments: [...(d.staffAssignments || []), assignment],
            deliveryStatus: d.deliveryStatus === 'NOT_ASSIGNED' ? 'ASSIGNED' : d.deliveryStatus,
          }
        : d
    ),
  })),

  removeStaffAssignment: (deliveryId, userId) => set((state) => ({
    deliveries: state.deliveries.map((d) => {
      if (d.id !== deliveryId) return d;
      const remaining = (d.staffAssignments || []).filter(sa => sa.userId !== userId);
      return {
        ...d,
        staffAssignments: remaining,
        deliveryStatus: remaining.length === 0 && d.deliveryStatus === 'ASSIGNED' ? 'NOT_ASSIGNED' : d.deliveryStatus,
      };
    }),
  })),

  setStaffAssignments: (deliveryId, assignments) => set((state) => ({
    deliveries: state.deliveries.map((d) =>
      d.id === deliveryId ? { ...d, staffAssignments: assignments } : d
    ),
  })),

  updateStaffRole: (deliveryId, userId, role) => set((state) => ({
    deliveries: state.deliveries.map((d) =>
      d.id === deliveryId
        ? {
            ...d,
            staffAssignments: (d.staffAssignments || []).map(sa =>
              sa.userId === userId ? { ...sa, role } : sa
            ),
          }
        : d
    ),
  })),

  // ========== Selection ==========
  
  setSelectedDelivery: (deliveryId) => set({ selectedDeliveryId: deliveryId }),

  // ========== Loading/Error State ==========
  
  setLoading: (isLoading) => set({ isLoading }),
  setRefreshing: (isRefreshing) => set({ isRefreshing }),
  setError: (error) => set({ error }),

  // ========== Reset ==========
  
  resetDeliveries: () => set(initialState),
}));

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get delivery by ID
 */
export const selectDeliveryById = (deliveryId: string) => (state: DeliveriesState) =>
  state.deliveries.find((d) => d.id === deliveryId);

/**
 * Get selected delivery
 */
export const selectSelectedDelivery = (state: DeliveriesState) => {
  if (!state.selectedDeliveryId) return null;
  return state.deliveries.find((d) => d.id === state.selectedDeliveryId) || null;
};

/**
 * Get deliveries by status
 */
export const selectDeliveriesByStatus = (status: DeliveryStatus) => (state: DeliveriesState) =>
  state.deliveries.filter((d) => d.deliveryStatus === status);

/**
 * Get new deliveries count (for badge) - NOT_ASSIGNED status
 */
export const selectNewDeliveriesCount = (state: DeliveriesState) =>
  state.deliveries.filter((d) => d.deliveryStatus === 'NOT_ASSIGNED').length;

/**
 * Get pending deliveries count (NOT_ASSIGNED + ASSIGNED + PACKED + OUT_FOR_DELIVERY)
 */
export const selectPendingDeliveriesCount = (state: DeliveriesState) =>
  state.deliveries.filter((d) => 
    d.deliveryStatus === 'NOT_ASSIGNED' || 
    d.deliveryStatus === 'ASSIGNED' ||
    d.deliveryStatus === 'PACKED' ||
    d.deliveryStatus === 'OUT_FOR_DELIVERY'
  ).length;

/**
 * Get outgoing deliveries
 */
export const selectOutgoingDeliveries = (state: DeliveriesState) =>
  state.deliveries.filter((d) => d.direction === 'outgoing');

/**
 * Get incoming deliveries
 */
export const selectIncomingDeliveries = (state: DeliveriesState) =>
  state.deliveries.filter((d) => d.direction === 'incoming');

/**
 * Get transfers
 */
export const selectTransfers = (state: DeliveriesState) =>
  state.deliveries.filter((d) => d.type === 'transfer');

/**
 * Check if data is stale (older than 5 minutes)
 */
export const selectIsDataStale = (state: DeliveriesState) => {
  if (!state.lastFetchedAt) return true;
  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() - state.lastFetchedAt > fiveMinutes;
};

/**
 * Get deliveries for a specific location
 */
export const selectDeliveriesForLocation = (locationId: string) => (state: DeliveriesState) =>
  state.deliveries.filter((d) => d.locationId === locationId);

