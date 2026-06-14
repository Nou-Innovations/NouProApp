/**
 * Return (RMA) types — goods returned against an order.
 * Mirrors the backend Return model.
 */
import { theme } from '@/shared/theme';

export type ReturnStatus =
  | 'Requested'
  | 'Scheduled'
  | 'PickedUp'
  | 'Received'
  | 'Completed'
  | 'Rejected';

export interface ReturnItem {
  productId: string;
  name: string;
  quantity: number;
  condition?: 'resellable' | 'damaged';
  disposition?: 'restock' | 'writeoff';
}

export interface Return {
  id: string;
  businessId: string;
  orderId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  locationId?: string | null;
  status: ReturnStatus;
  reason?: string | null;
  items: ReturnItem[];
  creditNoteId?: string | null;
  stockAppliedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReturnData {
  orderId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  locationId?: string | null;
  reason?: string | null;
  items: ReturnItem[];
}

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  Requested: 'Requested',
  Scheduled: 'Scheduled',
  PickedUp: 'Picked up',
  Received: 'Received',
  Completed: 'Completed',
  Rejected: 'Rejected',
};

export const RETURN_STATUS_COLORS: Record<ReturnStatus, string> = {
  Requested: theme.colors.neutral,
  Scheduled: theme.colors.info,
  PickedUp: theme.colors.warning,
  Received: theme.colors.statusInReview,
  Completed: theme.colors.success,
  Rejected: theme.colors.error,
};
