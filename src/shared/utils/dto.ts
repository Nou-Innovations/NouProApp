/**
 * DTO Mapping Utilities
 * 
 * Normalizes data between backend API responses and frontend types.
 * Handles snake_case vs camelCase inconsistencies.
 * 
 * IMPORTANT: This is the ONLY place where field name transformations should happen.
 */

import { UIProduct, UIProductStatus, CreateUIProductData, UpdateUIProductData } from '@/shared/types/product';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Backend Product DTO - what the API actually returns
 * Uses camelCase for most fields, but some legacy snake_case exists
 */
export interface ApiProductDTO {
  id: string;
  companyId?: string;
  name: string;
  brand?: string;
  brandLogo?: string;
  productPicture?: string;
  price: number;
  originalPrice?: number;
  category?: string;
  status?: string;
  variants?: string[];
  unit?: string;
  unitQuantity?: number;
  stockQuantity?: number;
  // Legacy snake_case fields from API
  is_listed?: boolean;
  isListed?: boolean; // Normalized version
  isCreatedByUser?: boolean;
  isImported?: boolean;
  isDisplayable?: boolean;
  locationId?: string;
  sku?: string;
  barcode?: string;
  taxRate?: number;
  supplier?: string;
  description?: string;
  // Logo fields with possible variants
  logo_url?: string;
  logoUrl?: string;
}

/**
 * Backend Company DTO
 */
export interface ApiCompanyDTO {
  id: string;
  name: string;
  logo_url?: string;
  logoUrl?: string;
  description?: string;
  phone?: string;
  email?: string;
  locations?: any[];
  settings?: {
    taxRate?: number;
    currency?: string;
    invoicePrefix?: string;
  };
}

// ============================================================================
// Product Mappers
// ============================================================================

/**
 * Map API product response to UIProduct
 * Normalizes field naming and provides defaults
 */
export function mapApiProductToUI(dto: ApiProductDTO): UIProduct {
  return {
    id: dto.id,
    name: dto.name,
    brand: dto.brand || 'Unknown',
    brandLogo: dto.brandLogo,
    productPicture: dto.productPicture,
    price: dto.price,
    originalPrice: dto.originalPrice,
    category: dto.category || 'Uncategorized',
    status: normalizeProductStatus(dto.status),
    variants: dto.variants,
    unit: dto.unit,
    unitQuantity: dto.unitQuantity,
    stockQuantity: dto.stockQuantity,
    // Handle both snake_case and camelCase for is_listed
    is_listed: dto.is_listed ?? dto.isListed ?? true,
    isCreatedByUser: dto.isCreatedByUser ?? false,
    isImported: dto.isImported ?? false,
    isDisplayable: dto.isDisplayable ?? true,
    companyId: dto.companyId,
    locationId: dto.locationId,
    sku: dto.sku,
    barcode: dto.barcode,
    taxRate: dto.taxRate,
    supplier: dto.supplier,
    description: dto.description,
  };
}

/**
 * Map UIProduct to API update payload
 * Converts to format expected by backend
 */
export function mapUIProductToApiUpdate(data: UpdateUIProductData): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  
  // Only include defined fields
  if (data.name !== undefined) payload.name = data.name;
  if (data.brand !== undefined) payload.brand = data.brand;
  if (data.price !== undefined) payload.price = data.price;
  if (data.category !== undefined) payload.category = data.category;
  if (data.unit !== undefined) payload.unit = data.unit;
  if (data.unitQuantity !== undefined) payload.unitQuantity = data.unitQuantity;
  if (data.variants !== undefined) payload.variants = data.variants;
  if (data.stockQuantity !== undefined) payload.stockQuantity = data.stockQuantity;
  if (data.status !== undefined) payload.status = data.status;
  if (data.isDisplayable !== undefined) payload.isDisplayable = data.isDisplayable;
  if (data.sku !== undefined) payload.sku = data.sku;
  if (data.barcode !== undefined) payload.barcode = data.barcode;
  if (data.taxRate !== undefined) payload.taxRate = data.taxRate;
  if (data.supplier !== undefined) payload.supplier = data.supplier;
  
  // Backend expects snake_case for is_listed
  if (data.is_listed !== undefined) payload.is_listed = data.is_listed;
  
  return payload;
}

/**
 * Map UIProduct create data to API payload
 */
export function mapUIProductToApiCreate(data: CreateUIProductData): Record<string, unknown> {
  return {
    name: data.name,
    brand: data.brand,
    brandLogo: data.brandLogo,
    price: data.price,
    category: data.category,
    unit: data.unit,
    unitQuantity: data.unitQuantity,
    variants: data.variants,
    stockQuantity: data.stockQuantity ?? 0,
    isDisplayable: data.isDisplayable ?? true,
    sku: data.sku,
    barcode: data.barcode,
    taxRate: data.taxRate,
    supplier: data.supplier,
    status: 'Available',
    is_listed: true,
    isCreatedByUser: true,
  };
}

// ============================================================================
// Company Mappers
// ============================================================================

/**
 * Normalize company logo URL field
 */
export function normalizeCompanyLogoUrl(dto: ApiCompanyDTO): string | undefined {
  return dto.logoUrl ?? dto.logo_url;
}

// ============================================================================
// Status Normalization
// ============================================================================

/**
 * Normalize product status from various API formats to UIProductStatus
 */
export function normalizeProductStatus(status?: string): UIProductStatus {
  if (!status) return 'Available';
  
  // Handle exact matches first
  const exactMap: Record<string, UIProductStatus> = {
    'Available': 'Available',
    'Out of Stock': 'Out of Stock',
    'In Production': 'In Production',
    'Inactive': 'Inactive',
    'Discontinued': 'Discontinued',
  };
  
  if (exactMap[status]) return exactMap[status];
  
  // Handle snake_case variants from database
  const snakeCaseMap: Record<string, UIProductStatus> = {
    'available': 'Available',
    'out_of_stock': 'Out of Stock',
    'in_production': 'In Production',
    'inactive': 'Inactive',
    'discontinued': 'Discontinued',
    'low_stock': 'Available', // Map low_stock to Available with warning
  };
  
  const lowerStatus = status.toLowerCase();
  return snakeCaseMap[lowerStatus] || 'Available';
}

/**
 * Convert UI status to API status (for PATCH requests)
 * Note: Currently keeping as-is since backend accepts both formats
 */
export function uiStatusToApiStatus(status: UIProductStatus): string {
  return status;
}

// ============================================================================
// Batch Mappers
// ============================================================================

/**
 * Map array of API products to UI products
 */
export function mapApiProductsToUI(dtos: ApiProductDTO[]): UIProduct[] {
  return dtos.map(mapApiProductToUI);
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a product DTO has required fields
 */
export function isValidProductDTO(dto: unknown): dto is ApiProductDTO {
  if (!dto || typeof dto !== 'object') return false;
  const obj = dto as Record<string, unknown>;
  return typeof obj.id === 'string' && 
         typeof obj.name === 'string' && 
         typeof obj.price === 'number';
}

