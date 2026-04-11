/**
 * Procurement Feature Module
 *
 * Manages suppliers, purchase requests, purchase orders, and goods receipts.
 */

// Store + Selectors
export {
  useProcurementStore,
  selectSupplierById,
  selectPurchaseOrderById,
  selectPurchaseOrdersByStatus,
  selectOpenPRCount,
  selectActivePOCount,
  selectAwaitingReceiptCount,
  selectPendingProcurementCount,
  selectIsDataStale,
} from './store/procurement.store';

// Hooks
export { useSuppliers } from './hooks/useSuppliers';
export { usePurchaseRequests } from './hooks/usePurchaseRequests';
export { usePurchaseOrders } from './hooks/usePurchaseOrders';
export { useGoodsReceipt } from './hooks/useGoodsReceipt';

// Service
export { default as procurementService } from './services/procurement.service';
