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
 * Backend endpoints:
 * - GET /api/companies/:companyId/invoices
 * - POST /api/companies/:companyId/invoices
 * - PATCH /api/companies/:companyId/invoices/:invoiceId
 */

import { get, post, patch } from '@/shared/services/api';

// Import types from shared location (not defined here)
import type { 
  Invoice, 
  InvoiceItem, 
  InvoiceStatus, 
  InvoiceFilters, 
  CreateInvoiceData 
} from '@/shared/types/invoice';

// Re-export types for consumers that import from service
export type { Invoice, InvoiceItem, InvoiceStatus, InvoiceFilters, CreateInvoiceData };

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Get all invoices for a company, with optional filters
 */
export async function getInvoices(companyId: string, filters?: InvoiceFilters): Promise<Invoice[]> {
  const params: Record<string, string | undefined> = {
    locationId: filters?.locationId,
    status: filters?.status,
    type: filters?.type,
  };
  
  return get<Invoice[]>(`/companies/${companyId}/invoices`, params);
}

/**
 * Get a single invoice by ID
 */
export async function getInvoice(companyId: string, invoiceId: string): Promise<Invoice> {
  return get<Invoice>(`/companies/${companyId}/invoices/${invoiceId}`);
}

/**
 * Create a new invoice
 */
export async function createInvoice(companyId: string, data: CreateInvoiceData): Promise<Invoice> {
  return post<Invoice>(`/companies/${companyId}/invoices`, data);
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
  companyId: string,
  invoiceId: string,
  status: InvoiceStatus
): Promise<Invoice> {
  return patch<Invoice>(`/companies/${companyId}/invoices/${invoiceId}`, { status });
}

/**
 * Get a temporary URL to download the invoice PDF
 */
export async function getInvoicePdfUrl(companyId: string, invoiceId: string): Promise<string> {
  const response = await get<{ url: string }>(`/companies/${companyId}/invoices/${invoiceId}/pdf`);
  return response.url;
}

/**
 * Convert an estimate to an invoice
 */
export async function convertEstimateToInvoice(companyId: string, invoiceId: string): Promise<Invoice> {
  return post<Invoice>(`/companies/${companyId}/invoices/${invoiceId}/convert`, {});
}

export interface InvoicePayment {
  amount: number;
  date: string;
}

/**
 * Record invoice payments
 */
export async function recordInvoicePayments(
  companyId: string,
  invoiceId: string,
  payments: InvoicePayment[],
  isFullyPaid: boolean
): Promise<void> {
  await post(`/companies/${companyId}/invoices/${invoiceId}/payments`, {
    payments,
    isFullyPaid,
  });
}

// ============================================================================
// Export as namespace for clean imports
// ============================================================================

const invoicesService = {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoiceStatus,
  getInvoicePdfUrl,
  convertEstimateToInvoice,
  recordInvoicePayments,
};

export default invoicesService;
