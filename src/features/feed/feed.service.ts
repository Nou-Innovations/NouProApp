/**
 * Feed Service
 * 
 * ARCHITECTURE: Domain service for feed operations.
 * 
 * Rules:
 * - This file is the ONLY place that knows how to fetch feed posts
 * - Screens import hooks, hooks import this service
 * - All methods return typed data
 * - No UI logic here
 * 
 * Backend endpoint:
 * - GET /api/feed?limit=20&cursor=<lastPostId>
 */

import { get, getFullResponse } from '@/shared/services/api';
import { FeedPost, FeedResponse, NewProductsPost } from '@/shared/types/feed';
import { UIProduct } from '@/shared/types/product';

// ============================================================================
// Types
// ============================================================================

export interface FeedParams {
  limit?: number;
  cursor?: string;
  viewerBusinessId?: string;
}

export interface FeedResult {
  posts: FeedPost[];
  nextCursor: string | null;
}

interface BusinessSummary {
  id: string;
  name: string;
  logoUrl?: string;
  logo_url?: string;
}

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Get paginated feed posts
 * @param params - Optional limit and cursor for pagination
 * @returns Feed posts and next cursor for infinite scroll
 */
export async function getFeed(params?: FeedParams): Promise<FeedResult> {
  // Build query params
  const queryParams: Record<string, string | number | undefined> = {};
  if (params?.limit) queryParams.limit = params.limit;
  if (params?.cursor) queryParams.cursor = params.cursor;
  if (params?.viewerBusinessId) queryParams.viewerBusinessId = params.viewerBusinessId;

  // Use getFullResponse to get the complete response including nextCursor
  const response = await getFullResponse<FeedResponse>('/feed', queryParams);

  // Surface each company post's follow state. The backend tags every post with
  // `isFromFollowed` (does the viewer follow this business); map it onto the
  // company_presentation data so the feed can render Follow / Following.
  const posts = response.data.map((post) => {
    if (post.type === 'company_presentation') {
      const isFollowing = (post as any).isFromFollowed ?? post.data.isConnected ?? false;
      return { ...post, data: { ...post.data, isFollowing } };
    }
    return post;
  });

  return {
    posts,
    nextCursor: response.nextCursor,
  };
}

/**
 * Get public catalog products and map them to feed posts
 */
export async function getPublicProductPosts(viewerBusinessId?: string): Promise<NewProductsPost[]> {
  const productParams: Record<string, string> = { scope: 'public' };
  if (viewerBusinessId) productParams.viewerBusinessId = viewerBusinessId;

  const [products, companies] = await Promise.all([
    get<UIProduct[]>('/products', productParams),
    get<BusinessSummary[]>('/companies'),
  ]);

  const companyMap = new Map<string, BusinessSummary>();
  companies.forEach((company) => {
    companyMap.set(company.id, company);
  });

  const grouped = new Map<string, UIProduct[]>();
  products.forEach((product) => {
    const businessId = product.ownerBusinessId || product.companyId;
    if (!businessId) return;
    if (!grouped.has(businessId)) {
      grouped.set(businessId, []);
    }
    grouped.get(businessId)!.push(product);
  });

  const posts: NewProductsPost[] = [];
  grouped.forEach((groupProducts, businessId) => {
    const company = companyMap.get(businessId);
    const businessName = company?.name || 'Business';
    const businessLogo = company?.logoUrl || company?.logo_url || '';

    const productsPayload = groupProducts.slice(0, 6).map((product) => ({
      id: product.id,
      name: product.name,
      unit: product.unit,
      price: product.price,
      image: product.productPicture || (product as any).image_url || '',
      brandName: product.brand || '',
      priceHidden: (product as any).priceHidden ?? false,
    }));

    if (productsPayload.length === 0) return;

    const createdAt = groupProducts[0]?.updatedAt || groupProducts[0]?.createdAt || new Date().toISOString();

    posts.push({
      id: `public-products-${businessId}`,
      type: 'new_products',
      timestamp: 'Just now',
      createdAt,
      data: {
        postType: 'distributor_added',
        businessId,
        businessName,
        businessLogo,
        products: productsPayload,
      },
    });
  });

  return posts;
}

// ============================================================================
// Export as namespace
// ============================================================================

const feedService = {
  getFeed,
  getPublicProductPosts,
};

export default feedService;

