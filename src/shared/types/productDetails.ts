/**
 * Product Details Types
 * Unified data contract for product detail screen
 * Supports both owner and buyer viewing modes with capability-based rendering
 */

import { UIProductStatus } from './product';

// ============================================================================
// Capabilities
// ============================================================================

/**
 * Owner capabilities - what the product owner can do
 */
export interface OwnerCapabilities {
  canEdit: boolean;
  canManageStock: boolean;
  canChangePrice: boolean;
  canArchive: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
  canToggleListing: boolean;
}

/**
 * Buyer capabilities - what a buyer can do
 */
export interface BuyerCapabilities {
  canOrder: boolean;
  canAddToCart: boolean;
  canMessageSeller: boolean;
  canSave: boolean;
  canShare: boolean;
}

/**
 * User role in relation to the product's business
 */
export type ViewerRole = 'owner' | 'superAdmin' | 'admin' | 'staff' | 'buyer';

/**
 * Viewer context - who is viewing and what they can do
 */
export interface ViewerContext {
  isOwner: boolean;
  role: ViewerRole;
  ownerCapabilities: OwnerCapabilities | null;
  buyerCapabilities: BuyerCapabilities | null;
}

// ============================================================================
// Pricing
// ============================================================================

/**
 * Price tier for volume discounts
 */
export interface PriceTier {
  minQuantity: number;
  maxQuantity?: number;
  price: number;
  label?: string; // e.g., "Bulk", "Wholesale"
}

/**
 * Promotional pricing
 */
export interface PromoPrice {
  price: number;
  label?: string; // e.g., "Sale", "Clearance"
  validUntil?: string; // ISO date
  percentOff?: number;
}

/**
 * Product pricing information
 */
export interface ProductPricing {
  basePrice: number;
  currency: string;
  costPrice?: number; // Only visible to owner
  tiers?: PriceTier[];
  promo?: PromoPrice;
  taxRate?: number;
  taxInclusive?: boolean;
  // Carton pricing
  pricePerCarton?: number;
  unitsPerCarton?: number;
  // Retail price limit (owner only)
  retailPriceLimit?: number;
  // Price privacy
  priceHidden?: boolean;
}

// ============================================================================
// Availability
// ============================================================================

/**
 * Product availability information
 */
export interface ProductAvailability {
  status: UIProductStatus;
  stockQuantity?: number;
  minStockAlert?: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  moq?: number; // Minimum order quantity
  maxOrderQuantity?: number;
  leadTime?: string; // e.g., "2-3 days"
  restockDate?: string; // ISO date
}

// ============================================================================
// Seller Information
// ============================================================================

/**
 * Seller/business information
 */
export interface SellerInfo {
  companyId: string;
  companyName: string;
  companyLogo?: string;
  location?: string;
  isVerified?: boolean;
  rating?: number;
  responseTime?: string; // e.g., "Usually responds within 1 hour"
}

// ============================================================================
// Product Core
// ============================================================================

/**
 * Product core information
 */
export interface ProductCore {
  id: string;
  name: string;
  description?: string;
  images: string[];
  sku?: string;
  barcode?: string;
  brand?: string;
  brandLogo?: string;
  category?: string;
  tags?: string[];
  unit?: string; // e.g., "0.5L", "500ml", "1kg"
  unitQuantity?: number; // e.g., 10 (for "0.5L x 10")
  variants?: string[];
  supplier?: string; // Supplier name
  isPublished: boolean;
  isArchived?: boolean;
  hasCarton?: boolean;
  hasRetailPriceLimit?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Full DTO
// ============================================================================

/**
 * Complete Product Details DTO
 * Single data contract for product detail screen
 */
export interface ProductDetailsDTO {
  product: ProductCore;
  pricing: ProductPricing;
  availability: ProductAvailability;
  seller: SellerInfo;
  viewerContext: ViewerContext;
}

// ============================================================================
// Related Products
// ============================================================================

/**
 * Related product card (minimal info for horizontal lists)
 */
export interface RelatedProduct {
  id: string;
  name: string;
  image?: string;
  price: number;
  currency: string;
  brand?: string;
  priceHidden?: boolean;
}

/**
 * Related products sections
 */
export interface RelatedProductsDTO {
  sameBrand?: RelatedProduct[];
  sameCategory?: RelatedProduct[];
  recentlyViewed?: RelatedProduct[];
  frequentlyBoughtTogether?: RelatedProduct[];
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Determine viewer context based on product and active company
 * @param productCompanyId - The company that owns the product
 * @param activeCompanyId - The currently active company in the app
 * @param userRole - The user's role in their active company (if applicable)
 */
export function computeViewerContext(
  productCompanyId: string,
  activeCompanyId: string | null,
  userRole?: ViewerRole
): ViewerContext {
  const isOwner = activeCompanyId !== null && productCompanyId === activeCompanyId;
  
  // Determine role
  let role: ViewerRole = 'buyer';
  if (isOwner) {
    role = userRole || 'owner';
  }
  
  // Compute owner capabilities
  let ownerCapabilities: OwnerCapabilities | null = null;
  if (isOwner) {
    const hasFullAccess = role === 'owner' || role === 'superAdmin' || role === 'admin';
    ownerCapabilities = {
      canEdit: hasFullAccess,
      canManageStock: hasFullAccess || role === 'staff',
      canChangePrice: hasFullAccess,
      canArchive: hasFullAccess,
      canDelete: role === 'owner' || role === 'superAdmin',
      canDuplicate: hasFullAccess,
      canToggleListing: hasFullAccess,
    };
  }
  
  // Compute buyer capabilities
  let buyerCapabilities: BuyerCapabilities | null = null;
  if (!isOwner) {
    buyerCapabilities = {
      canOrder: true, // Will be adjusted based on availability
      canAddToCart: true,
      canMessageSeller: true,
      canSave: true,
      canShare: true,
    };
  }
  
  return {
    isOwner,
    role,
    ownerCapabilities,
    buyerCapabilities,
  };
}

/**
 * Adjust buyer capabilities based on product availability
 */
export function adjustBuyerCapabilitiesForAvailability(
  capabilities: BuyerCapabilities,
  availability: ProductAvailability
): BuyerCapabilities {
  const isDiscontinued = availability.status === 'Discontinued';
  return {
    ...capabilities,
    canOrder: !availability.isOutOfStock && !isDiscontinued,
    canAddToCart: !availability.isOutOfStock && !isDiscontinued,
  };
}

/**
 * Default currency for the app
 */
export const DEFAULT_CURRENCY = 'Rs';

/**
 * Format price with currency
 */
export function formatPrice(price: number, currency: string = DEFAULT_CURRENCY): string {
  return `${currency} ${price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

