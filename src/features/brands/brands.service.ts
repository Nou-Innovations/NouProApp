/**
 * Brands Service
 *
 * Domain service for brand CRUD operations.
 * All endpoints are company-scoped: /api/companies/:companyId/brands
 */

import { get, post, patch, del } from '@/shared/services/api';

export interface Brand {
  id: string;
  businessId: string;
  name: string;
  logoUrl?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface CreateBrandData {
  name: string;
  logoUrl?: string;
  description?: string;
}

export interface UpdateBrandData {
  name?: string;
  logoUrl?: string;
  description?: string;
}

/**
 * Get all brands for a company
 */
export async function getBrands(companyId: string): Promise<Brand[]> {
  return get<Brand[]>(`/companies/${companyId}/brands`);
}

/**
 * Create a new brand
 */
export async function createBrand(companyId: string, data: CreateBrandData): Promise<Brand> {
  return post<Brand>(`/companies/${companyId}/brands`, data);
}

/**
 * Update a brand
 */
export async function updateBrand(companyId: string, brandId: string, data: UpdateBrandData): Promise<Brand> {
  return patch<Brand>(`/companies/${companyId}/brands/${brandId}`, data);
}

/**
 * Delete a brand
 */
export async function deleteBrand(companyId: string, brandId: string): Promise<void> {
  return del(`/companies/${companyId}/brands/${brandId}`);
}
