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
 * Convert an estimate to an invoice.
 * Implemented via PATCH update (changes type from 'estimate' to 'invoice').
 */
export async function convertEstimateToInvoice(invoiceId: string): Promise<Invoice> {
  // Use the PATCH route to change the type field
  return updateInvoice(invoiceId, { type: 'invoice' });
}

/**
 * Record a payment against an invoice (persisted ledger entry). The backend creates a real
 * Payment row and recomputes the invoice's paidAmount/status, returning the updated invoice
 * (including its `payments` history).
 */
export async function addInvoicePayment(
  companyId: string,
  invoiceId: string,
  payment: { amount: number; date: string; method?: string; description?: string }
): Promise<Invoice> {
  return post<Invoice>(`/companies/${companyId}/invoices/${invoiceId}/payments`, payment);
}

/**
 * Remove a previously recorded payment (corrects a mis-entry). Returns the recomputed invoice.
 */
export async function deleteInvoicePayment(
  companyId: string,
  invoiceId: string,
  paymentId: string
): Promise<Invoice> {
  return del<Invoice>(`/companies/${companyId}/invoices/${invoiceId}/payments/${paymentId}`);
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
  convertEstimateToInvoice,
  addInvoicePayment,
  deleteInvoicePayment,
  deleteInvoice,
};

export default invoicesService;
