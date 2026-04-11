/**
 * Procurement Service
 *
 * Domain service for procurement operations (Suppliers, PRs, POs, GRNs).
 *
 * Backend endpoints (all authenticated):
 * - GET/POST/PATCH/DELETE /api/companies/:companyId/suppliers
 * - GET/POST/PATCH/DELETE /api/companies/:companyId/suppliers/:supplierId/products
 * - GET/POST/PATCH        /api/companies/:companyId/purchase-requests
 * - POST                  /api/companies/:companyId/purchase-requests/:prId/submit|approve|reject|convert
 * - GET/POST/PATCH        /api/companies/:companyId/purchase-orders
 * - PATCH                 /api/companies/:companyId/purchase-orders/:poId/status
 * - GET                   /api/companies/:companyId/purchase-orders/:poId/history
 * - POST                  /api/companies/:companyId/purchase-orders/:poId/receive
 * - GET/PATCH             /api/companies/:companyId/goods-receipts/:grnId
 */

import { get, post, patch, del } from '@/shared/services/api';
import type {
  Supplier,
  SupplierProduct,
  PurchaseRequest,
  PurchaseOrder,
  PurchaseOrderStatusHistoryEntry,
  GoodsReceipt,
  CreateSupplierData,
  UpdateSupplierData,
  CreatePurchaseRequestData,
  CreatePurchaseOrderData,
  CreateGoodsReceiptData,
} from '@/shared/types/procurement';

export type { Supplier, SupplierProduct, PurchaseRequest, PurchaseOrder, GoodsReceipt };

// ── Suppliers ──

export async function getSuppliers(companyId: string): Promise<Supplier[]> {
  return get<Supplier[]>(`/companies/${companyId}/suppliers`);
}

export async function getSupplier(companyId: string, supplierId: string): Promise<Supplier> {
  return get<Supplier>(`/companies/${companyId}/suppliers/${supplierId}`);
}

export async function createSupplier(companyId: string, data: CreateSupplierData): Promise<Supplier> {
  return post<Supplier>(`/companies/${companyId}/suppliers`, data);
}

export async function updateSupplier(companyId: string, supplierId: string, data: UpdateSupplierData): Promise<Supplier> {
  return patch<Supplier>(`/companies/${companyId}/suppliers/${supplierId}`, data);
}

export async function deleteSupplier(companyId: string, supplierId: string): Promise<void> {
  await del(`/companies/${companyId}/suppliers/${supplierId}`);
}

// ── Supplier Products ──

export async function getSupplierProducts(companyId: string, supplierId: string): Promise<SupplierProduct[]> {
  return get<SupplierProduct[]>(`/companies/${companyId}/suppliers/${supplierId}/products`);
}

export async function addSupplierProduct(
  companyId: string,
  supplierId: string,
  data: { productId: string; supplierPrice: number; minOrderQty?: number; bulkPrice?: number; bulkMinQty?: number; supplierSKU?: string; leadTimeDays?: number }
): Promise<SupplierProduct> {
  return post<SupplierProduct>(`/companies/${companyId}/suppliers/${supplierId}/products`, data);
}

export async function updateSupplierProduct(
  companyId: string,
  supplierId: string,
  spId: string,
  data: Partial<{ supplierPrice: number; minOrderQty: number; bulkPrice: number; bulkMinQty: number; supplierSKU: string; leadTimeDays: number }>
): Promise<SupplierProduct> {
  return patch<SupplierProduct>(`/companies/${companyId}/suppliers/${supplierId}/products/${spId}`, data);
}

export async function deleteSupplierProduct(companyId: string, supplierId: string, spId: string): Promise<void> {
  await del(`/companies/${companyId}/suppliers/${supplierId}/products/${spId}`);
}

// ── Purchase Requests ──

export async function getPurchaseRequests(
  companyId: string,
  filters?: { status?: string; locationId?: string; supplierId?: string }
): Promise<PurchaseRequest[]> {
  return get<PurchaseRequest[]>(`/companies/${companyId}/purchase-requests`, filters);
}

export async function getPurchaseRequest(companyId: string, prId: string): Promise<PurchaseRequest> {
  return get<PurchaseRequest>(`/companies/${companyId}/purchase-requests/${prId}`);
}

export async function createPurchaseRequest(companyId: string, data: CreatePurchaseRequestData): Promise<PurchaseRequest> {
  return post<PurchaseRequest>(`/companies/${companyId}/purchase-requests`, data);
}

export async function updatePurchaseRequest(
  companyId: string,
  prId: string,
  data: Partial<CreatePurchaseRequestData>
): Promise<PurchaseRequest> {
  return patch<PurchaseRequest>(`/companies/${companyId}/purchase-requests/${prId}`, data);
}

export async function submitPurchaseRequest(companyId: string, prId: string): Promise<PurchaseRequest> {
  return post<PurchaseRequest>(`/companies/${companyId}/purchase-requests/${prId}/submit`, {});
}

export async function approvePurchaseRequest(companyId: string, prId: string): Promise<PurchaseRequest> {
  return post<PurchaseRequest>(`/companies/${companyId}/purchase-requests/${prId}/approve`, {});
}

export async function rejectPurchaseRequest(companyId: string, prId: string, reason: string): Promise<PurchaseRequest> {
  return post<PurchaseRequest>(`/companies/${companyId}/purchase-requests/${prId}/reject`, { reason });
}

export async function convertPurchaseRequest(companyId: string, prId: string): Promise<PurchaseOrder> {
  return post<PurchaseOrder>(`/companies/${companyId}/purchase-requests/${prId}/convert`, {});
}

// ── Purchase Orders ──

export async function getPurchaseOrders(
  companyId: string,
  filters?: { status?: string; supplierId?: string; locationId?: string }
): Promise<PurchaseOrder[]> {
  return get<PurchaseOrder[]>(`/companies/${companyId}/purchase-orders`, filters);
}

export async function getPurchaseOrder(companyId: string, poId: string): Promise<PurchaseOrder> {
  return get<PurchaseOrder>(`/companies/${companyId}/purchase-orders/${poId}`);
}

export async function createPurchaseOrder(companyId: string, data: CreatePurchaseOrderData): Promise<PurchaseOrder> {
  return post<PurchaseOrder>(`/companies/${companyId}/purchase-orders`, data);
}

export async function updatePurchaseOrder(
  companyId: string,
  poId: string,
  data: Partial<CreatePurchaseOrderData>
): Promise<PurchaseOrder> {
  return patch<PurchaseOrder>(`/companies/${companyId}/purchase-orders/${poId}`, data);
}

export async function updatePurchaseOrderStatus(
  companyId: string,
  poId: string,
  status: string,
  reason?: string
): Promise<PurchaseOrder> {
  return patch<PurchaseOrder>(`/companies/${companyId}/purchase-orders/${poId}/status`, { status, reason });
}

export async function getPurchaseOrderHistory(
  companyId: string,
  poId: string
): Promise<PurchaseOrderStatusHistoryEntry[]> {
  return get<PurchaseOrderStatusHistoryEntry[]>(`/companies/${companyId}/purchase-orders/${poId}/history`);
}

// ── Goods Receipts ──

export async function getGoodsReceipts(companyId: string): Promise<GoodsReceipt[]> {
  return get<GoodsReceipt[]>(`/companies/${companyId}/goods-receipts`);
}

export async function createGoodsReceipt(companyId: string, poId: string, data: CreateGoodsReceiptData): Promise<GoodsReceipt> {
  return post<GoodsReceipt>(`/companies/${companyId}/purchase-orders/${poId}/receive`, data);
}

export async function getGoodsReceipt(companyId: string, grnId: string): Promise<GoodsReceipt> {
  return get<GoodsReceipt>(`/companies/${companyId}/goods-receipts/${grnId}`);
}

export async function updateGoodsReceipt(companyId: string, grnId: string, data: { notes?: string; status?: string }): Promise<GoodsReceipt> {
  return patch<GoodsReceipt>(`/companies/${companyId}/goods-receipts/${grnId}`, data);
}

// ── Integration Endpoints ──

export interface ProductSupplierPricing {
  supplierId: string;
  supplierName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  supplierPrice: number;
  minOrderQty?: number;
  bulkPrice?: number;
  bulkMinQty?: number;
  leadTimeDays?: number;
  supplierSKU?: string;
}

export async function getProductsWithSupplierPricing(companyId: string): Promise<any[]> {
  return get<any[]>(`/companies/${companyId}/products/with-supplier-pricing`);
}

export async function getSuppliersForProduct(companyId: string, productId: string): Promise<ProductSupplierPricing[]> {
  return get<ProductSupplierPricing[]>(`/companies/${companyId}/products/${productId}/suppliers`);
}

export async function getDeliveryByOrderId(companyId: string, orderId: string): Promise<any | null> {
  try {
    const deliveries = await get<any[]>(`/companies/${companyId}/deliveries`);
    return deliveries.find((d: any) => d.orderId === orderId) || null;
  } catch {
    return null;
  }
}

// ── Namespace export ──

const procurementService = {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierProducts,
  addSupplierProduct,
  updateSupplierProduct,
  deleteSupplierProduct,
  getPurchaseRequests,
  getPurchaseRequest,
  createPurchaseRequest,
  updatePurchaseRequest,
  submitPurchaseRequest,
  approvePurchaseRequest,
  rejectPurchaseRequest,
  convertPurchaseRequest,
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  getPurchaseOrderHistory,
  getGoodsReceipts,
  createGoodsReceipt,
  getGoodsReceipt,
  updateGoodsReceipt,
  getProductsWithSupplierPricing,
  getSuppliersForProduct,
  getDeliveryByOrderId,
};

export default procurementService;
