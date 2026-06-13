/**
 * Procurement Types
 *
 * Types for the procurement module: Suppliers, Purchase Requests,
 * Purchase Orders, and Goods Receipts.
 * These match the Prisma schema and backend response shapes.
 */

import { theme } from '@/shared/theme';

// ============================================================================
// Status Enums (match Prisma enums exactly)
// ============================================================================

export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export type PurchaseRequestStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONVERTED';

export type PurchaseRequestPriority = 'LOW' | 'NORMAL' | 'URGENT';

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'SENT'
  | 'CONFIRMED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELED';

export type GoodsReceiptStatus = 'PENDING' | 'COMPLETED' | 'DISPUTED';

export type PaymentStatus = import('./order').PaymentStatus;

// ============================================================================
// Status Colors (from design.json pills.statusColors)
// ============================================================================

export const SUPPLIER_STATUS_COLORS: Record<SupplierStatus, string> = {
  ACTIVE: theme.colors.success,
  INACTIVE: theme.colors.neutral,
  BLOCKED: theme.colors.error,
};

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  BLOCKED: 'Blocked',
};

export const PR_STATUS_COLORS: Record<PurchaseRequestStatus, string> = {
  DRAFT: theme.colors.neutral,
  SUBMITTED: theme.colors.info,
  APPROVED: theme.colors.success,
  REJECTED: theme.colors.error,
  CONVERTED: theme.colors.success,
};

export const PR_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CONVERTED: 'Converted',
};

export const PR_PRIORITY_COLORS: Record<PurchaseRequestPriority, string> = {
  LOW: theme.colors.neutral,
  NORMAL: theme.colors.info,
  URGENT: theme.colors.error,
};

export const PR_PRIORITY_LABELS: Record<PurchaseRequestPriority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  URGENT: 'Urgent',
};

export const PO_STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  DRAFT: theme.colors.neutral,
  SENT: theme.colors.info,
  CONFIRMED: theme.colors.success,
  PARTIALLY_RECEIVED: theme.colors.warning,
  RECEIVED: theme.colors.success,
  CANCELED: theme.colors.statusCanceled,
};

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  CONFIRMED: 'Confirmed',
  PARTIALLY_RECEIVED: 'Partially received',
  RECEIVED: 'Received',
  CANCELED: 'Canceled',
};

export const GRN_STATUS_COLORS: Record<GoodsReceiptStatus, string> = {
  PENDING: theme.colors.warning,
  COMPLETED: theme.colors.success,
  DISPUTED: theme.colors.error,
};

export const GRN_STATUS_LABELS: Record<GoodsReceiptStatus, string> = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  DISPUTED: 'Disputed',
};

// ============================================================================
// Filter Tabs
// ============================================================================

export type PurchaseRequestFilterTab = 'all' | 'draft' | 'submitted' | 'approved' | 'rejected' | 'converted';

export const PR_FILTER_TABS: PurchaseRequestFilterTab[] = ['all', 'draft', 'submitted', 'approved', 'rejected', 'converted'];

export const PR_FILTER_TAB_STATUSES: Record<PurchaseRequestFilterTab, PurchaseRequestStatus | null> = {
  all: null,
  draft: 'DRAFT',
  submitted: 'SUBMITTED',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  converted: 'CONVERTED',
};

export type PurchaseOrderFilterTab = 'all' | 'draft' | 'sent' | 'confirmed' | 'receiving' | 'done' | 'canceled';

export const PO_FILTER_TABS: PurchaseOrderFilterTab[] = ['all', 'draft', 'sent', 'confirmed', 'receiving', 'done', 'canceled'];

export const PO_FILTER_TAB_STATUSES: Record<PurchaseOrderFilterTab, PurchaseOrderStatus | PurchaseOrderStatus[] | null> = {
  all: null,
  draft: 'DRAFT',
  sent: 'SENT',
  confirmed: 'CONFIRMED',
  receiving: 'PARTIALLY_RECEIVED',
  done: 'RECEIVED',
  canceled: 'CANCELED',
};

// ============================================================================
// Data Models
// ============================================================================

export interface Supplier {
  id: string;
  businessId: string;
  supplierBusinessId?: string | null;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  paymentTerms?: string | null;
  leadTimeDays?: number | null;
  creditLimit?: number | null;
  rating?: number | null;
  status: SupplierStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  products?: SupplierProduct[];
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  productId: string;
  supplierPrice: number;
  minOrderQty?: number | null;
  bulkPrice?: number | null;
  bulkMinQty?: number | null;
  supplierSKU?: string | null;
  leadTimeDays?: number | null;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    price?: number | null;
    productPicture?: string | null;
    sku?: string | null;
  };
}

export interface PurchaseRequestItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
}

export interface PurchaseRequest {
  id: string;
  businessId: string;
  locationId?: string | null;
  supplierId?: string | null;
  requestedBy: string;
  priority: PurchaseRequestPriority;
  status: PurchaseRequestStatus;
  items: PurchaseRequestItem[];
  totalAmount?: number | null;
  notes?: string | null;
  requiredByDate?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  purchaseOrderId?: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier | null;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  businessId: string;
  supplierId: string;
  purchaseRequestId?: string | null;
  locationId?: string | null;
  poNumber?: string | null;
  items: PurchaseOrderItem[];
  totalAmount?: number | null;
  status: PurchaseOrderStatus;
  paymentStatus?: string | null;
  paymentTerms?: string | null;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  sentAt?: string | null;
  createdBy: string;
  approvedBy?: string | null;
  statusChangedAt?: string | null;
  statusChangedBy?: string | null;
  statusReason?: string | null;
  lastActivityAt?: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier | null;
  statusHistory?: PurchaseOrderStatusHistoryEntry[];
  goodsReceipts?: GoodsReceipt[];
}

export interface PurchaseOrderStatusHistoryEntry {
  id: string;
  purchaseOrderId: string;
  from: PurchaseOrderStatus;
  to: PurchaseOrderStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface GoodsReceiptItem {
  productId: string;
  productName: string;
  orderedQty: number;
  receivedQty: number;
  damagedQty?: number;
  notes?: string;
}

export interface GoodsReceipt {
  id: string;
  businessId: string;
  purchaseOrderId: string;
  locationId?: string | null;
  receivedBy: string;
  items: GoodsReceiptItem[];
  status: GoodsReceiptStatus;
  receivedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  purchaseOrder?: PurchaseOrder | null;
}

// ============================================================================
// Create/Update Payloads
// ============================================================================

export interface CreateSupplierData {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  leadTimeDays?: number;
  creditLimit?: number;
  notes?: string;
  supplierBusinessId?: string;
}

export interface UpdateSupplierData {
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  leadTimeDays?: number;
  creditLimit?: number;
  rating?: number;
  status?: SupplierStatus;
  notes?: string;
}

export interface CreatePurchaseRequestData {
  supplierId?: string;
  locationId?: string;
  items: PurchaseRequestItem[];
  totalAmount?: number;
  notes?: string;
  priority?: PurchaseRequestPriority;
  requiredByDate?: string;
}

export interface CreatePurchaseOrderData {
  supplierId: string;
  purchaseRequestId?: string;
  locationId?: string;
  items: PurchaseOrderItem[];
  totalAmount?: number;
  paymentTerms?: string;
  expectedDeliveryDate?: string;
  notes?: string;
}

export interface CreateGoodsReceiptData {
  items: GoodsReceiptItem[];
  notes?: string;
  locationId?: string;
}

// ============================================================================
// Dashboard Stats
// ============================================================================

export interface ProcurementStats {
  openPRCount: number;
  activePOCount: number;
  awaitingReceiptCount: number;
  totalSuppliers: number;
}
