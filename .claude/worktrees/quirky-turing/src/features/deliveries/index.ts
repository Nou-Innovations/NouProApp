/**
 * Deliveries Feature Module
 * 
 * Exports for screens, components, hooks, and services.
 */

// Screens
export * from './screens';

// Components
export * from './components';

// Hooks
export { useDeliveries } from './hooks/useDeliveries';

// Store (feature-scoped - single source of truth for delivery state)
export { 
  useDeliveriesStore,
  selectDeliveryById,
  selectSelectedDelivery,
  selectDeliveriesByStatus,
  selectNewDeliveriesCount,
  selectPendingDeliveriesCount,
  selectOutgoingDeliveries,
  selectIncomingDeliveries,
  selectTransfers,
  selectIsDataStale,
  selectDeliveriesForLocation,
} from './deliveries.store';
export type { DeliveriesState, DeliveriesActions } from './deliveries.store';

// Service
export { 
  default as deliveriesService, 
  getDeliveries, 
  getDelivery,
  createDelivery,
  updateDelivery,
  updateDeliveryStatus,
  assignDelivery,
  unassignDelivery,
} from './deliveries.service';

// Types are exported from @/shared/types/delivery

