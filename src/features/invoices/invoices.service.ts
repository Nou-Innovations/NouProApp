/**
 * Invoices Service
 * 
 * ARCHITECTURE: Domain service for invoice operations.
 * 
 * Rules:
 * - This file is the ONLY place that knows how to fetch invoices
 * - Screens import this, not apiClient directly
 * - All methods return typed data
 * - No UI logic here
 * 
 * Backend endpoints (all authenticated):
 * - GET    /api/companies/:companyId/invoices              (list)
 * - GET    /api/companies/:companyId/invoices/:invoiceId   (single)
 * - POST   /api/companies/:companyId/invoices              (create)
 * - PATCH  /api/invoices/:invoiceId                          (update)
 * - DELETE /api/invoices/:invoiceId                          (delete)
 */

import { get, post, patch, del } from '@/shared/services/api';

// Import types from shared location (not defined here)
import type { 
  Invoice, 
  InvoiceItem, 
  InvoiceStatus, 
  InvoiceFilters, 
  CreateInvoiceData,
  UpdateInvoiceData 
} from '@/shared/types/invoice';

// Re-export types for consumers that import from service
export type { Invoice, InvoiceItem, InvoiceStatus, InvoiceFilters, CreateInvoiceData };

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Get all invoices for a business, with optional filters.
 * Uses authenticated GET /companies/:companyId/invoices route.
 */
export async function getInvoices(businessId: string, filters?: InvoiceFilters): Promise<Invoice[]> {
  const params: Record<string, string | undefined> = {
    issuedByLocationId: filters?.locationId,
    status: filters?.status,
    type: filters?.type,
  };
  
  return get<Invoice[]>(`/companies/${businessId}/invoices`, params);
}

/**
 * Get a single invoice by ID.
 * Uses authenticated GET /companies/:companyId/invoices/:invoiceId route.
 */
export async function getInvoice(businessId: string, invoiceId: string): Promise<Invoice> {
  return get<Invoice>(`/companies/${businessId}/invoices/${invoiceId}`);
}

/**
 * Create a new invoice or estimate.
 * Uses authenticated POST /companies/:companyId/invoices route.
 */
export async function createInvoice(businessId: string, data: CreateInvoiceData): Promise<Invoice> {
  return post<Invoice>(`/companies/${businessId}/invoices`, data);
}

/**
 * Update an invoice (status, fields, etc.).
 * Uses authenticated PATCH /invoices/:invoiceId route (no company prefix).
 */
export async function updateInvoice(
  invoiceId: string,
  updates: UpdateInvoiceData
): Promise<Invoice> {
  return patch<Invoice>(`/invoices/${invoiceId}`, updates);
}

/**
 * Update invoice status (convenience wrapper).
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  status: string
): Promise<Invoice> {
  return updateInvoice(invoiceId, { status });
}

/**
 * Get a temporary URL to download the invoice PDF.
 * TODO: Backend endpoint not yet implemented. Returns a rejected promise.
 */
export async function getInvoicePdfUrl(_companyId: string, _invoiceId: string): Promise<string> {
  throw new Error('PDF export is not yet available. This feature is coming soon.');
}

/**
 * Convert an estimate to an invoice.
 * Implemented via PATCH update (changes type from 'estimate' to 'invoice').
 */
export async function convertEstimateToInvoice(invoiceId: string): Promise<Invoice> {
  // Use the PATCH route to change the type field
  return updateInvoice(invoiceId, { type: 'invoice' });
}

export interface InvoicePayment {
  amount: number;
  date: string;
}

/**
 * Record invoice payments.
 * Implemented via PATCH status update (PAID or PARTIALLY_PAID).
 * TODO: Add dedicated payment recording endpoint on backend for full payment tracking.
 */
export async function recordInvoicePayments(
  _companyId: string,
  invoiceId: string,
  payments: InvoicePayment[],
  isFullyPaid: boolean,
  totalPaidAmount: number
): Promise<void> {
  const status = isFullyPaid ? 'PAID' : 'PARTIALLY_PAID';
  await updateInvoice(invoiceId, { status, paidAmount: totalPaidAmount });
}

/**
 * Delete an invoice.
 * Uses authenticated DELETE /invoices/:invoiceId route.
 */
export async function deleteInvoice(invoiceId: string): Promise<void> {
  await del(`/invoices/${invoiceId}`);
}

// ============================================================================
// Export as namespace for clean imports
// ============================================================================

const invoicesService = {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  getInvoicePdfUrl,
  convertEstimateToInvoice,
  recordInvoicePayments,
  deleteInvoice,
};

export default invoicesService;
