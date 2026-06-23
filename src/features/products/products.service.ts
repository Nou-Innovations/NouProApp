/**
 * Products Service
 * 
 * ARCHITECTURE: Domain service for product operations.
 * 
 * Rules:
 * - This file is the ONLY place that knows how to fetch products
 * - Screens import hooks, hooks import this service
 * - All methods return typed data
 * - No UI logic here
 * 
 * Backend endpoints:
 * - GET  /api/companies/:companyId/products
 * - GET  /api/companies/:companyId/products/:productId
 * - POST /api/companies/:companyId/products
 * - PATCH /api/companies/:companyId/products/:productId
 */

import { get, post, patch, del } from '@/shared/services/api';
import { 
  UIProduct, 
  ProductFilters, 
  ProductViewType,
  UIProductStatus,
  CreateUIProductData,
  UpdateUIProductData,
} from '@/shared/types/product';

// ============================================================================
// Types
// ============================================================================

export interface GetProductsParams {
  companyId: string;
  locationId?: string;
  status?: UIProductStatus | 'All';
  category?: string;
  search?: string;
  viewType?: ProductViewType;
}

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Get all products for a company
 */
export async function getProducts(params: GetProductsParams): Promise<UIProduct[]> {
  const { companyId, ...filters } = params;
  
  // Build query params - filter out undefined/empty values
  const queryParams: Record<string, string | undefined> = {};
  if (filters.locationId) queryParams.locationId = filters.locationId;
  if (filters.status && filters.status !== 'All') queryParams.status = filters.status;
  if (filters.category) queryParams.category = filters.category;
  if (filters.search) queryParams.search = filters.search;
  if (filters.viewType && filters.viewType !== 'All Products') queryParams.viewType = filters.viewType;
  
  return get<UIProduct[]>(`/companies/${companyId}/products`, queryParams);
}

/**
 * Get the public product catalog (listed products across all businesses).
 * Used by the cross-business product search ("All products"/"All brands").
 */
export async function getPublicProducts(viewerBusinessId?: string): Promise<UIProduct[]> {
  const params: Record<string, string> = { scope: 'public' };
  if (viewerBusinessId) params.viewerBusinessId = viewerBusinessId;
  return get<UIProduct[]>('/products', params);
}

/**
 * Get a single product by ID
 */
export async function getProduct(companyId: string, productId: string): Promise<UIProduct> {
  return get<UIProduct>(`/companies/${companyId}/products/${productId}`);
}

/**
 * Create a new product
 */
export async function createProduct(companyId: string, data: CreateUIProductData): Promise<UIProduct> {
  return post<UIProduct>(`/companies/${companyId}/products`, {
    ...data,
    companyId,
    status: 'Available' as UIProductStatus,
    isCreatedByUser: true,
  });
}

/**
 * Update a product
 */
export async function updateProduct(
  companyId: string, 
  productId: string, 
  data: UpdateUIProductData
): Promise<UIProduct> {
  return patch<UIProduct>(`/companies/${companyId}/products/${productId}`, data);
}

/**
 * Delete a product
 */
export async function deleteProduct(companyId: string, productId: string): Promise<void> {
  return del(`/companies/${companyId}/products/${productId}`);
}

/**
 * Update product status
 */
export async function updateProductStatus(
  companyId: string,
  productId: string,
  status: UIProductStatus
): Promise<UIProduct> {
  return patch<UIProduct>(`/companies/${companyId}/products/${productId}`, { status });
}

/**
 * Update product stock
 */
export async function updateProductStock(
  companyId: string,
  productId: string,
  stockQuantity: number
): Promise<UIProduct> {
  return patch<UIProduct>(`/companies/${companyId}/products/${productId}`, { stockQuantity });
}

/**
 * Toggle product display visibility
 */
export async function toggleProductDisplayable(
  companyId: string,
  productId: string,
  isDisplayable: boolean
): Promise<UIProduct> {
  return patch<UIProduct>(`/companies/${companyId}/products/${productId}`, { isDisplayable });
}

/**
 * Toggle product listing status
 */
export async function toggleProductListed(
  companyId: string,
  productId: string,
  is_listed: boolean
): Promise<UIProduct> {
  return patch<UIProduct>(`/companies/${companyId}/products/${productId}`, { is_listed });
}

/**
 * Carry another business's product into your own store — creates a linked copy
 * (the client then owns its stock + listing). Idempotent on the backend.
 */
export async function carryProduct(companyId: string, sourceProductId: string): Promise<UIProduct> {
  return post<UIProduct>(`/companies/${companyId}/products/carry`, { sourceProductId });
}

export type ProductReportReason = 'inappropriate' | 'counterfeit' | 'wrong_info' | 'spam' | 'other';

/** Report a product for moderation review. */
export async function reportProduct(
  productId: string,
  reason: ProductReportReason,
  details?: string,
  reportedByBusinessId?: string
): Promise<{ id: string }> {
  return post<{ id: string }>(`/products/${productId}/report`, {
    reason,
    details,
    reportedByBusinessId,
  });
}

// ============================================================================
// Export as namespace
// ============================================================================

const productsService = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  updateProductStock,
  toggleProductDisplayable,
  toggleProductListed,
  carryProduct,
  reportProduct,
};

export default productsService;




