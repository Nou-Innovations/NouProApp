/**
 * Product Types
 * Based on app-logic.json dataModels.product and dataModels.brand
 */

/**
 * Product status enum
 * Based on app-logic.json statusEnums.productStatus
 */
export type ProductStatus = 
  | 'available'
  | 'out_of_stock'
  | 'discontinued'
  | 'in_production'
  | 'inactive'
  | 'low_stock';

/**
 * Product status colors for UI
 */
export const PRODUCT_STATUS_COLORS: Record<ProductStatus, string> = {
  available: '#22C55E',
  out_of_stock: '#EF4444',
  in_production: '#0EA5E9',
  discontinued: '#F59E42',
  inactive: '#6B7280',
  low_stock: '#F59E0B',
};

/**
 * Product status labels for display
 */
export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  available: 'Available',
  out_of_stock: 'Out of Stock',
  in_production: 'In Production',
  discontinued: 'Discontinued',
  inactive: 'Inactive',
  low_stock: 'Low Stock',
};

/**
 * Brand - Product brands owned by a business
 * Based on app-logic.json dataModels.brand
 */
export interface Brand {
  id: string; // UUID
  business_id: string; // FK to Business
  name: string;
  logo_url?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Product - Items in a business catalog
 * Based on app-logic.json dataModels.product
 */
export interface Product {
  id: string; // UUID
  business_id: string; // FK to Business
  brand_id?: string; // FK to Brand
  name: string;
  unit?: string; // e.g., "500ml", "1.5L", "20cm"
  price: number; // Decimal
  cost_price?: number;
  description?: string;
  image_url?: string;
  category?: string;
  status: ProductStatus;
  is_published: boolean; // Shown on public profile if true
  min_stock_alert?: number;
  created_at: string;
  updated_at?: string;
}

/**
 * Product variant for products with multiple options
 */
export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price: number;
  sku?: string;
  barcode?: string;
  unit?: string;
}

/**
 * Stock Entry - Stock adjustment records
 * Based on app-logic.json dataModels.stockEntry
 */
export type StockActionType = 'add' | 'remove' | 'correction';

export interface StockEntry {
  id: string; // UUID
  product_id: string; // FK to Product
  location_id?: string; // FK to BusinessLocation (for multi-location)
  quantity: number; // Positive or negative
  action_type: StockActionType;
  reason?: string;
  created_by: string; // FK to User
  created_at: string;
}

/**
 * Location-specific stock data
 */
export interface LocationStock {
  id: string;
  product_id: string;
  location_id: string;
  stock_quantity: number;
  min_stock_threshold: number;
  is_visible: boolean; // Whether visible to clients at this location
  last_updated: string;
}

/**
 * Product with brand information
 */
export interface ProductWithBrand extends Product {
  brand?: Brand;
}

/**
 * Product with stock information
 */
export interface ProductWithStock extends Product {
  stock_quantity: number;
  stock_status: ProductStatus;
}

/**
 * Create product payload
 */
export interface CreateProductPayload {
  business_id: string;
  brand_id?: string;
  name: string;
  unit?: string;
  price: number;
  cost_price?: number;
  description?: string;
  image_url?: string;
  category?: string;
  status?: ProductStatus;
  is_published?: boolean;
  min_stock_alert?: number;
}

/**
 * Update product payload
 */
export interface UpdateProductPayload {
  brand_id?: string;
  name?: string;
  unit?: string;
  price?: number;
  cost_price?: number;
  description?: string;
  image_url?: string;
  category?: string;
  status?: ProductStatus;
  is_published?: boolean;
  min_stock_alert?: number;
}

/**
 * Create brand payload
 */
export interface CreateBrandPayload {
  business_id: string;
  name: string;
  logo_url?: string;
  description?: string;
}

// ============================================================================
// UI Types (match mockProducts format for screen consumption)
// ============================================================================

/**
 * UI Product Status (matches screen filter options)
 */
export type UIProductStatus = 'Available' | 'Out of Stock' | 'In Production' | 'Inactive' | 'Discontinued';

/**
 * UI Product - Type used in ProductsScreen and components
 * This matches the mockProducts.ts format
 */
export interface UIProduct {
  id: string;
  name: string;
  brand: string;
  brandLogo?: string;
  productPicture?: string;
  price: number;
  originalPrice?: number; // For sale display
  category: string;
  status: UIProductStatus;
  variants?: string[];
  unit?: string;
  unitQuantity?: number; // e.g., 10 for "0.5L x 10"
  stockQuantity?: number;
  is_listed?: boolean;
  isCreatedByUser?: boolean;
  isImported?: boolean;
  isDisplayable?: boolean;
  companyId?: string;
  locationId?: string;
  sku?: string;
  barcode?: string;
  taxRate?: number;
  supplier?: string;
  description?: string;
}

/**
 * Product view types for filter dropdown
 */
export type ProductViewType = 'All Products' | 'My Products' | 'Imported' | 'Display';

export const PRODUCT_VIEW_TYPES: ProductViewType[] = ['All Products', 'My Products', 'Imported', 'Display'];

export const UI_PRODUCT_STATUSES: (UIProductStatus | 'All')[] = ['All', 'Available', 'Out of Stock', 'In Production', 'Inactive'];

/**
 * UI Product filters
 */
export interface ProductFilters {
  status?: UIProductStatus | 'All';
  category?: string;
  search?: string;
  locationId?: string;
  viewType?: ProductViewType;
}

/**
 * API Response for products
 */
export interface ProductsResponse {
  success: boolean;
  data: UIProduct[];
  message: string;
}

export interface ProductResponse {
  success: boolean;
  data: UIProduct;
  message: string;
}

/**
 * Create UI Product data
 */
export interface CreateUIProductData {
  name: string;
  brand: string;
  brandLogo?: string;
  price: number;
  category: string;
  unit?: string;
  unitQuantity?: number; // e.g., 10 for "0.5L x 10"
  variants?: string[];
  stockQuantity?: number;
  isDisplayable?: boolean;
  sku?: string;
  barcode?: string;
  taxRate?: number;
  supplier?: string;
}

/**
 * Update UI Product data
 */
export interface UpdateUIProductData {
  name?: string;
  brand?: string;
  price?: number;
  category?: string;
  unit?: string;
  unitQuantity?: number;
  variants?: string[];
  stockQuantity?: number;
  status?: UIProductStatus;
  isDisplayable?: boolean;
  is_listed?: boolean;
  sku?: string;
  barcode?: string;
  taxRate?: number;
  supplier?: string;
}






