/**
 * Transfer types — internal stock movement between the business's own locations,
 * with an approval lifecycle. Mirrors the backend Transfer model.
 */
import { theme } from '@/shared/theme';

export type TransferStatus =
  | 'Requested'
  | 'Approved'
  | 'Preparing'
  | 'InTransit'
  | 'Received'
  | 'Completed'
  | 'Rejected'
  | 'Canceled';

export interface TransferItem {
  productId: string;
  name: string;
  image?: string;
  price?: number;
  quantity: number;
  quantityReceived?: number;
}

export interface TransferStatusHistoryEntry {
  id: string;
  transferId: string;
  from?: TransferStatus | null;
  to: TransferStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface Transfer {
  id: string;
  businessId: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  fromLocationName?: string | null;
  toLocationName?: string | null;
  status: TransferStatus;
  requestedBy?: string | null;
  approvedBy?: string | null;
  rejectedReason?: string | null;
  items?: TransferItem[];
  itemCount?: number | null;
  totalAmount?: number | null;
  assignedStaffId?: string | null;
  transportId?: string | null;
  trackingNumber?: string | null;
  notes?: string | null;
  priority?: string;
  orderTime?: string | null;
  expectedAt?: string | null;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  stockAppliedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  statusHistory?: TransferStatusHistoryEntry[];
}

export interface CreateTransferData {
  fromLocationId: string;
  toLocationId: string;
  fromLocationName?: string;
  toLocationName?: string;
  items: Omit<TransferItem, 'quantityReceived'>[];
  itemCount?: number;
  totalAmount?: number;
  assignedStaffId?: string;
  transportId?: string;
  notes?: string;
  priority?: string;
  expectedAt?: string;
}

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  Requested: 'Requested',
  Approved: 'Approved',
  Preparing: 'Preparing',
  InTransit: 'In transit',
  Received: 'Received',
  Completed: 'Completed',
  Rejected: 'Rejected',
  Canceled: 'Canceled',
};

export const TRANSFER_STATUS_COLORS: Record<TransferStatus, string> = {
  Requested: theme.colors.neutral,
  Approved: theme.colors.info,
  Preparing: theme.colors.statusInReview,
  InTransit: theme.colors.info,
  Received: theme.colors.warning,
  Completed: theme.colors.success,
  Rejected: theme.colors.error,
  Canceled: theme.colors.neutral,
};
