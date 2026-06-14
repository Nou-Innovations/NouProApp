/**
 * Issue types — problems reported against a delivery / transfer / route.
 * Mirrors the backend Issue model.
 */
import { theme } from '@/shared/theme';

export type IssueStatus = 'open' | 'investigating' | 'resolved';
export type IssueEntityType = 'delivery' | 'transfer' | 'route';
export type IssueType =
  | 'damaged'
  | 'missing'
  | 'wrong_qty'
  | 'customer_unavailable'
  | 'wrong_address'
  | 'vehicle'
  | 'late'
  | 'payment'
  | 'other';

export interface Issue {
  id: string;
  businessId: string;
  entityType: IssueEntityType;
  entityId: string;
  type: IssueType;
  priority: string;
  status: IssueStatus;
  photoUrl?: string | null;
  note?: string | null;
  reportedBy?: string | null;
  assignedTo?: string | null;
  resolution?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueData {
  entityType: IssueEntityType;
  entityId: string;
  type: IssueType;
  priority?: string;
  photoUrl?: string | null;
  note?: string | null;
  assignedTo?: string | null;
}

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  damaged: 'Damaged goods',
  missing: 'Missing goods',
  wrong_qty: 'Wrong quantity',
  customer_unavailable: 'Customer unavailable',
  wrong_address: 'Wrong address',
  vehicle: 'Vehicle issue',
  late: 'Late delivery',
  payment: 'Payment issue',
  other: 'Other',
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  open: 'Open',
  investigating: 'Investigating',
  resolved: 'Resolved',
};

export const ISSUE_STATUS_COLORS: Record<IssueStatus, string> = {
  open: theme.colors.error,
  investigating: theme.colors.warning,
  resolved: theme.colors.success,
};
