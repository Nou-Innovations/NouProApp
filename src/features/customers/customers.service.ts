/**
 * Customers Service
 *
 * Sell-side CRM directory. All endpoints are company-scoped:
 * /api/companies/:companyId/customers. A customer may link to a NouPro business
 * (customerBusinessId) or be a standalone external contact. Free for all plans.
 * Auto-seeded from past invoices/orders via seedCustomers().
 */

import { get, post, patch, del } from '@/shared/services/api';

export type CustomerStatus = 'ACTIVE' | 'ARCHIVED';

export interface LinkedBusiness {
  id: string;
  name: string;
  logoUrl?: string | null;
}

export interface Customer {
  id: string;
  businessId: string;
  customerBusinessId?: string | null;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  customerBusiness?: LinkedBusiness | null;
}

export interface CustomerInvoice {
  id: string;
  invoiceNumber?: string | null;
  totalAmount?: number | null;
  paidAmount?: number | null;
  status?: string | null;
  type?: string | null;
  createdAt: string;
}

export interface CustomerOrder {
  id: string;
  totalAmount?: number | null;
  status?: string | null;
  createdAt: string;
}

export interface CustomerStats {
  invoiceCount: number;
  orderCount: number;
  totalInvoiced: number;
  totalPaid: number;
  lastActivityAt: string | null;
}

export interface CustomerWithHistory extends Customer {
  invoices: CustomerInvoice[];
  orders: CustomerOrder[];
  stats: CustomerStats;
}

export interface CreateCustomerData {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  customerBusinessId?: string | null;
  status?: CustomerStatus;
}

export type UpdateCustomerData = Partial<CreateCustomerData>;

export async function getCustomers(
  companyId: string,
  params?: { search?: string; status?: CustomerStatus },
): Promise<Customer[]> {
  return get<Customer[]>(`/companies/${companyId}/customers`, params);
}

export async function getCustomer(companyId: string, customerId: string): Promise<CustomerWithHistory> {
  return get<CustomerWithHistory>(`/companies/${companyId}/customers/${customerId}`);
}

export async function createCustomer(companyId: string, data: CreateCustomerData): Promise<Customer> {
  return post<Customer>(`/companies/${companyId}/customers`, data);
}

export async function updateCustomer(
  companyId: string,
  customerId: string,
  data: UpdateCustomerData,
): Promise<Customer> {
  return patch<Customer>(`/companies/${companyId}/customers/${customerId}`, data);
}

export async function deleteCustomer(companyId: string, customerId: string): Promise<void> {
  return del(`/companies/${companyId}/customers/${customerId}`);
}

/** Idempotent: create Customers from past invoices/orders. Returns how many were created. */
export async function seedCustomers(companyId: string): Promise<{ created: number; total: number }> {
  return post<{ created: number; total: number }>(`/companies/${companyId}/customers/seed`, {});
}
