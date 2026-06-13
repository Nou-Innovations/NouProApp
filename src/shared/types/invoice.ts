/**
 * Invoice Types
 * 
 * Shared types for invoices and estimates.
 * Used by invoices.service.ts, useInvoices.ts, and invoice screens.
 * 
 * Based on backend API response shapes.
 */

import { theme } from '@/shared/theme';

// ============================================================================
// Status Types
// ============================================================================

/**
 * Invoice status values (lowercase, normalized from backend UPPERCASE).
 * Backend Prisma enum: DRAFT | SENT | PARTIALLY_PAID | PAID | OVERDUE | CANCELED | VOID | REFUNDED
 * Frontend always uses lowercase after normalization in useInvoices hook.
 */
export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'canceled'
  | 'cancelled' // alias kept for backwards compat (maps to backend CANCELED)
  | 'void'
  | 'refunded';

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
// NOTE: `businessId` matches the Prisma column name returned by the API.
// API routes use `/companies/:companyId/invoices` but the response body field
// remains `businessId` because Prisma returns it as such.
// ============================================================================

export interface Invoice {
  id: string;
  invoiceNumber?: string;
  businessId: string;
  locationId?: string;
  issuedByScope?: 'PARENT' | 'LOCATION';
  issuedByLocationId?: string;
  orderId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount?: number;
  discount?: number;
  shipping?: number;
  currency?: string;
  status: InvoiceStatus;
  type: InvoiceType;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  deliveryId?: string;
  notes?: string;
  terms?: string;
  referenceNumber?: string;
  pdfUrl?: string;
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
  clientName: string;
  clientEmail: string;
  items: Omit<InvoiceItem, 'totalPrice'>[] | InvoiceItem[];
  type: InvoiceType;
  issueDate?: string;
  dueDate: string;
  amount?: number;
  taxAmount?: number;
  totalAmount?: number;
  discount?: number;
  shipping?: number;
  notes?: string;
  terms?: string;
  referenceNumber?: string;
  status?: 'DRAFT' | 'SENT';
  locationId?: string;
  deliveryId?: string;
}

export interface UpdateInvoiceData {
  status?: string;
  type?: string;
  clientName?: string;
  clientEmail?: string;
  items?: InvoiceItem[];
  amount?: number;
  taxAmount?: number;
  totalAmount?: number;
  paidAmount?: number;
  discount?: number;
  shipping?: number;
  notes?: string;
  terms?: string;
  referenceNumber?: string;
  dueDate?: string;
  issueDate?: string;
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

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: theme.colors.neutral,          // Gray
  sent: theme.colors.info,              // Blue
  partially_paid: theme.colors.warning, // Amber
  paid: theme.colors.success,           // Green
  overdue: theme.colors.error,          // Red
  canceled: theme.colors.neutral,       // Light Gray
  cancelled: theme.colors.neutral,      // Light Gray (alias)
  void: theme.colors.neutral,           // Gray
  refunded: theme.colors.statusInReview, // Purple
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
  canceled: 'Canceled',
  cancelled: 'Cancelled',
  void: 'Void',
  refunded: 'Refunded',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get status color
 */
export function getInvoiceStatusColor(status: InvoiceStatus): string {
  return INVOICE_STATUS_COLORS[status] || theme.colors.neutral;
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
  if (invoice.status === 'paid' || invoice.status === 'cancelled' || invoice.status === 'canceled' || invoice.status === 'void' || invoice.status === 'refunded') {
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

/**
 * Format a monetary amount with the correct currency symbol.
 * Uses Intl.NumberFormat for locale-aware formatting.
 * Defaults to EUR if no currency code is provided.
 */
export function formatInvoiceCurrency(amount: number, currency?: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    // Fallback if currency code is invalid
    return `${currency || 'EUR'} ${(amount || 0).toFixed(2)}`;
  }
}

/**
 * Get the currency symbol for a currency code (e.g. "EUR" -> "€", "USD" -> "$").
 */
export function getCurrencySymbol(currency?: string): string {
  try {
    const parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'EUR',
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value || currency || '€';
  } catch {
    return currency || '€';
  }
}
