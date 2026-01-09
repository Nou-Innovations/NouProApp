/**
 * Invoice Types
 * 
 * Shared types for invoices and estimates.
 * Used by invoices.service.ts, useInvoices.ts, and invoice screens.
 * 
 * Based on backend API response shapes.
 */

// ============================================================================
// Status Types
// ============================================================================

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export type InvoiceType = 'invoice' | 'estimate';

// ============================================================================
// Invoice Item
// ============================================================================

export interface InvoiceItem {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// ============================================================================
// Invoice Entity
// ============================================================================

export interface Invoice {
  id: string;
  companyId: string;
  locationId: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  type: InvoiceType;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  deliveryId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// API Payloads
// ============================================================================

export interface InvoiceFilters {
  locationId?: string;
  status?: InvoiceStatus;
  type?: InvoiceType;
}

export interface CreateInvoiceData {
  locationId: string;
  clientName: string;
  clientEmail: string;
  items: Omit<InvoiceItem, 'totalPrice'>[];
  type: InvoiceType;
  dueDate: string;
  notes?: string;
  deliveryId?: string;
}

export interface UpdateInvoiceData {
  status?: InvoiceStatus;
  notes?: string;
  dueDate?: string;
}

// ============================================================================
// UI Display Types
// ============================================================================

/**
 * Invoice with computed display properties
 */
export interface InvoiceWithDisplay extends Invoice {
  /** Formatted total amount (e.g., "$1,234.56") */
  formattedTotal: string;
  /** Formatted due date (e.g., "Jan 15, 2025") */
  formattedDueDate: string;
  /** Days until due (negative if overdue) */
  daysUntilDue: number;
  /** Is this invoice overdue */
  isOverdue: boolean;
  /** Status badge color */
  statusColor: string;
}

// ============================================================================
// Status Colors
// ============================================================================

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: '#6B7280',     // Gray
  sent: '#3B82F6',      // Blue
  paid: '#22C55E',      // Green
  overdue: '#EF4444',   // Red
  cancelled: '#9CA3AF', // Light Gray
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get status color
 */
export function getInvoiceStatusColor(status: InvoiceStatus): string {
  return INVOICE_STATUS_COLORS[status] || '#6B7280';
}

/**
 * Get status label
 */
export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  return INVOICE_STATUS_LABELS[status] || status;
}

/**
 * Calculate if invoice is overdue
 */
export function isInvoiceOverdue(invoice: Invoice): boolean {
  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    return false;
  }
  const dueDate = new Date(invoice.dueDate);
  return dueDate < new Date();
}

/**
 * Calculate days until due (negative if overdue)
 */
export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
