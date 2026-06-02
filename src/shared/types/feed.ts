/**
 * Feed Types
 * 
 * Types for the feed/posts API and components.
 * These match the backend response shape from /api/feed
 */

// ============================================================================
// Brand Presentation Post
// ============================================================================

export interface BrandPresentationProduct {
  id: string;
  name: string;
  description?: string;
  unit?: string; // e.g. "1L", "500g", "Pack of 4"
  price: number;
  image: string;
  isNew?: boolean;
}

export interface BrandPresentationData {
  brandId: string;
  brandName: string;
  brandLogo: string;
  distributorName: string;
  distributorId: string;
  products: BrandPresentationProduct[];
}

// ============================================================================
// Company Presentation Post
// ============================================================================

export interface CompanyBrand {
  id: string;
  name: string;
  logo: string;
  productsCount: number;
}

export interface CompanyPresentationData {
  companyId: string;
  companyName: string;
  companyLogo: string;
  location: string;
  /** @deprecated In personal mode a person follows a business — use isFollowing. */
  isConnected: boolean;
  /** Whether the viewer (a person) currently follows this business. */
  isFollowing?: boolean;
  brands: CompanyBrand[];
}

// ============================================================================
// New Products Post
// ============================================================================

export interface NewProduct {
  id: string;
  name: string;
  unit?: string; // e.g. "1L", "500g", "Pack of 4"
  price: number;
  image: string;
  brandName: string;
}

export interface NewProductsData {
  postType: 'distributor_added' | 'business_received';
  businessId: string;
  businessName: string;
  businessLogo: string;
  products: NewProduct[];
}

// ============================================================================
// Feed Post Union Type
// ============================================================================

export type FeedPostType = 'brand_presentation' | 'company_presentation' | 'new_products';

export interface FeedPostBase {
  id: string;
  type: FeedPostType;
  timestamp: string;
  createdAt: string;
}

export interface BrandPresentationPost extends FeedPostBase {
  type: 'brand_presentation';
  data: BrandPresentationData;
}

export interface CompanyPresentationPost extends FeedPostBase {
  type: 'company_presentation';
  data: CompanyPresentationData;
}

export interface NewProductsPost extends FeedPostBase {
  type: 'new_products';
  data: NewProductsData;
}

export type FeedPost = BrandPresentationPost | CompanyPresentationPost | NewProductsPost;

// ============================================================================
// API Response Types
// ============================================================================

export interface FeedResponse {
  success: boolean;
  data: FeedPost[];
  nextCursor: string | null;
  message: string;
}

