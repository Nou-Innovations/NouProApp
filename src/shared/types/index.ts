/**
 * Type Definitions Index
 * Central export for all app types aligned with app-logic.json
 */

// User types (Personal Profile)
export * from './user';

// Business types (Business Profile)
export * from './business';

// Product types
export * from './product';

// Product Details types (unified detail screen)
export * from './productDetails';

// Order types (including Delivery)
export * from './order';

// Invoice types
export * from './invoice';

// Subscription types
export * from './subscription';

// Roles & Permissions types
export * from './roles';

// Profile types (ProfileViewType)
export * from './profile';

// Re-export navigation types
export * from './navigation';

// Feed types
export * from './feed';

// Inbox/Chat types
export * from './inbox';

// Delivery types (UI-specific, extends order.ts).
// DeliveryStatus / PaymentStatus and their *_COLORS / *_LABELS are the single source of
// truth in ./order — only delivery-specific names are re-exported here, to avoid
// duplicate/ambiguous barrel exports (eslint import/export, tsc TS2308).
export type {
  ItemStatus,
  DeliveryType,
  DeliveryDirection,
  DeliveryItem,
  Delivery,
  Staff,
  DeliveryStaffRole,
  DeliveryStaffAssignment,
  TransportMode,
  DeliveriesResponse,
  DeliveryResponse,
  DeliveryFilters,
  DeliveryViewType,
  DeliveryFilterTab,
  CreateDeliveryData,
  UpdateDeliveryData,
} from './delivery';
export { DELIVERY_FILTER_TAB_STATUSES } from './delivery';

// Transport/Vehicle types
export * from './transport';






