/**
 * useFeed Hook
 * 
 * ARCHITECTURE: React hook that connects screens to feed data.
 * 
 * Features:
 * - Initial load
 * - Pull-to-refresh
 * - Infinite scroll (load more)
 * - Loading/error states
 * - Fallback to mock data if API fails
 * - Special welcome feed for new users
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { FeedPost } from '@/shared/types/feed';
import feedService from '../feed.service';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';


// Welcome feed for new users - diverse content to discover
const newUserFeedPosts: FeedPost[] = [
  // Company presentation - local distributor
  {
    id: 'welcome-1',
    type: 'company_presentation',
    timestamp: 'Just now',
    createdAt: new Date().toISOString(),
    data: {
      companyId: 'biz-welcome-001',
      companyName: 'Island Fresh Distributors',
      companyLogo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200',
      location: 'Grand Baie, Mauritius',
      isConnected: false,
      brands: [
        { id: 'brand-w1', name: 'Fresh Island', logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100', productsCount: 45 },
        { id: 'brand-w2', name: 'Tropical Delights', logo: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=100', productsCount: 32 },
        { id: 'brand-w3', name: 'Ocean Harvest', logo: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=100', productsCount: 28 },
      ],
    },
  },
  // Brand presentation - beverages
  {
    id: 'welcome-2',
    type: 'brand_presentation',
    timestamp: '15 min ago',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    data: {
      brandId: 'brand-welcome-2',
      brandName: 'Phoenix Beer',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8a/Phoenix_Beverages_Limited_logo.svg/200px-Phoenix_Beverages_Limited_logo.svg.png',
      distributorName: 'Phoenix Beverages Ltd',
      distributorId: 'dist-phoenix',
      products: [
        { id: 'prod-w1', name: 'Phoenix Lager', description: 'Premium local beer', unit: '6-pack', price: 195.00, image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400', isNew: false },
        { id: 'prod-w2', name: 'Phoenix Special', description: 'Extra smooth', unit: '6-pack', price: 225.00, image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400', isNew: true },
      ],
    },
  },
  // New products - grocery items
  {
    id: 'welcome-3',
    type: 'new_products',
    timestamp: '30 min ago',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    data: {
      postType: 'distributor_added',
      businessId: 'biz-welcome-1',
      businessName: 'Super U Wholesale',
      businessLogo: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200',
      products: [
        { id: 'new-w1', name: 'Basmati Rice Premium', unit: '5kg', price: 285.00, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', brandName: 'Golden Grain' },
        { id: 'new-w2', name: 'Extra Virgin Olive Oil', unit: '1L', price: 420.00, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', brandName: 'Mediterranean Gold' },
      ],
    },
  },
  // Company presentation - tech/hardware
  {
    id: 'welcome-4',
    type: 'company_presentation',
    timestamp: '1h ago',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    data: {
      companyId: 'biz-welcome-002',
      companyName: 'TechMart Solutions',
      companyLogo: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200',
      location: 'Ebene, Mauritius',
      isConnected: false,
      brands: [
        { id: 'brand-w4', name: 'Samsung', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/200px-Samsung_Logo.svg.png', productsCount: 156 },
        { id: 'brand-w5', name: 'Apple', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/100px-Apple_logo_black.svg.png', productsCount: 89 },
      ],
    },
  },
  // Brand presentation - soft drinks
  {
    id: 'welcome-5',
    type: 'brand_presentation',
    timestamp: '2h ago',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    data: {
      brandId: 'brand-welcome-5',
      brandName: 'Coca-Cola',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/512px-Coca-Cola_logo.svg.png',
      distributorName: 'Phoenix Beverages Ltd',
      distributorId: 'dist-phoenix',
      products: [
        { id: 'prod-w3', name: 'Coca-Cola Original', description: 'Classic taste', unit: '24-pack', price: 480.00, image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400', isNew: false },
        { id: 'prod-w4', name: 'Coca-Cola Zero', description: 'Zero sugar', unit: '12-pack', price: 260.00, image: 'https://images.unsplash.com/photo-1624552184280-9e9631bbeee9?w=400', isNew: false },
        { id: 'prod-w5', name: 'Fanta Orange', description: 'Fruity refreshment', unit: '12-pack', price: 240.00, image: 'https://images.unsplash.com/photo-1632818924360-68d4994cfdb2?w=400', isNew: true },
      ],
    },
  },
  // New products - bakery
  {
    id: 'welcome-6',
    type: 'new_products',
    timestamp: '3h ago',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    data: {
      postType: 'distributor_added',
      businessId: 'biz-welcome-2',
      businessName: 'La Boulangerie Artisanale',
      businessLogo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200',
      products: [
        { id: 'new-w3', name: 'French Croissants', unit: 'Box of 12', price: 180.00, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400', brandName: 'Artisan Bakes' },
        { id: 'new-w4', name: 'Sourdough Loaf', unit: '800g', price: 95.00, image: 'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?w=400', brandName: 'Artisan Bakes' },
      ],
    },
  },
  // Company presentation - pharmacy/health
  {
    id: 'welcome-7',
    type: 'company_presentation',
    timestamp: '4h ago',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    data: {
      companyId: 'biz-welcome-003',
      companyName: 'MedPlus Pharmacy Wholesale',
      companyLogo: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=200',
      location: 'Quatre Bornes, Mauritius',
      isConnected: false,
      brands: [
        { id: 'brand-w6', name: 'Panadol', logo: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100', productsCount: 12 },
        { id: 'brand-w7', name: 'Centrum', logo: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=100', productsCount: 18 },
      ],
    },
  },
  // Brand presentation - dairy
  {
    id: 'welcome-8',
    type: 'brand_presentation',
    timestamp: '5h ago',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    data: {
      brandId: 'brand-welcome-8',
      brandName: 'Yoplait',
      brandLogo: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=200',
      distributorName: 'Dairy Fresh Ltd',
      distributorId: 'dist-dairy',
      products: [
        { id: 'prod-w6', name: 'Strawberry Yogurt', description: 'Creamy & fruity', unit: 'Pack of 4', price: 85.00, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', isNew: false },
        { id: 'prod-w7', name: 'Greek Yogurt Natural', description: 'High protein', unit: '500g', price: 120.00, image: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=400', isNew: true },
      ],
    },
  },
  // New products - snacks
  {
    id: 'welcome-9',
    type: 'new_products',
    timestamp: '6h ago',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    data: {
      postType: 'distributor_added',
      businessId: 'biz-welcome-3',
      businessName: 'Snack World Distributors',
      businessLogo: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=200',
      products: [
        { id: 'new-w5', name: 'Lay\'s Classic Chips', unit: 'Case of 24', price: 720.00, image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400', brandName: 'Lay\'s' },
        { id: 'new-w6', name: 'Oreo Cookies', unit: 'Box of 12', price: 240.00, image: 'https://images.unsplash.com/photo-1590005024862-6b67679a29fb?w=400', brandName: 'Oreo' },
        { id: 'new-w7', name: 'KitKat Variety Pack', unit: 'Box of 24', price: 360.00, image: 'https://images.unsplash.com/photo-1527904324834-3bda86da6771?w=400', brandName: 'Nestlé' },
      ],
    },
  },
  // Company presentation - office supplies
  {
    id: 'welcome-10',
    type: 'company_presentation',
    timestamp: '8h ago',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    data: {
      companyId: 'biz-welcome-004',
      companyName: 'Office Pro Mauritius',
      companyLogo: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200',
      location: 'Rose Hill, Mauritius',
      isConnected: false,
      brands: [
        { id: 'brand-w8', name: 'HP', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/HP_logo_2012.svg/150px-HP_logo_2012.svg.png', productsCount: 78 },
        { id: 'brand-w9', name: 'Canon', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Canon_wordmark.svg/200px-Canon_wordmark.svg.png', productsCount: 45 },
        { id: 'brand-w10', name: 'Epson', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Epson_logo.svg/200px-Epson_logo.svg.png', productsCount: 34 },
      ],
    },
  },
];

interface UseFeedResult {
  /** List of feed posts */
  posts: FeedPost[];
  /** Initial loading state */
  loading: boolean;
  /** Pull-to-refresh loading state */
  refreshing: boolean;
  /** Loading more (infinite scroll) state */
  loadingMore: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether data came from mock (fallback) */
  isMockData: boolean;
  /** Whether there are more posts to load */
  hasMore: boolean;
  /** Refresh the feed (pull-to-refresh) */
  refresh: () => Promise<void>;
  /** Load more posts (infinite scroll) */
  loadMore: () => Promise<void>;
}

const FEED_PAGE_SIZE = 20;

export function useFeed(): UseFeedResult {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMockData, setIsMockData] = useState(false);
  
  // Capture isNewUser at mount time via ref so that clearing the flag
  // after 5 seconds in HomeScreen does NOT trigger a feed reload.
  const isNewUserAtMount = useRef(useProfileStore.getState().isNewUser);
  const activeMode = useProfileStore((state) => state.activeMode);
  const activeBusinessId = useProfileStore((state) => state.activeBusinessId);

  /** Deduplicate posts by id (feed + public products may overlap) */
  const dedup = (items: FeedPost[]): FeedPost[] =>
    Array.from(new Map(items.map((p) => [p.id, p])).values());

  // Initial load
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);

    // For new users, show the welcome feed immediately
    if (isNewUserAtMount.current) {
      setPosts(newUserFeedPosts);
      setNextCursor(null);
      setIsMockData(true);
      setLoading(false);
      return;
    }

    try {
      const viewerBizId = activeBusinessId || undefined;
      const [feedResult, publicPosts] = await Promise.all([
        feedService.getFeed({ limit: FEED_PAGE_SIZE, viewerBusinessId: viewerBizId }),
        activeMode === 'personal' ? feedService.getPublicProductPosts(viewerBizId) : Promise.resolve([]),
      ]);

      setPosts(dedup([...feedResult.posts, ...publicPosts]));
      setNextCursor(feedResult.nextCursor);
      setIsMockData(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load feed';
      setError(message);
      setPosts([]);
      setNextCursor(null);
      setIsMockData(false);
    } finally {
      setLoading(false);
    }
  }, [activeMode, activeBusinessId]);

  // Pull-to-refresh — always fetches from API (even for new users after first refresh)
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    // On first refresh, clear the new-user ref so subsequent loads use the API
    isNewUserAtMount.current = false;

    try {
      const viewerBizId = activeBusinessId || undefined;
      const [feedResult, publicPosts] = await Promise.all([
        feedService.getFeed({ limit: FEED_PAGE_SIZE, viewerBusinessId: viewerBizId }),
        activeMode === 'personal' ? feedService.getPublicProductPosts(viewerBizId) : Promise.resolve([]),
      ]);

      setPosts(dedup([...feedResult.posts, ...publicPosts]));
      setNextCursor(feedResult.nextCursor);
      setIsMockData(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to refresh feed';
      setError(message);
      // Keep existing posts on refresh failure
    } finally {
      setRefreshing(false);
    }
  }, [activeMode, activeBusinessId]);

  // Infinite scroll - load more
  const loadMore = useCallback(async () => {
    // Don't load more if already loading or no more posts
    if (loadingMore || !nextCursor) {
      return;
    }

    setLoadingMore(true);

    try {
      const result = await feedService.getFeed({
        limit: FEED_PAGE_SIZE,
        cursor: nextCursor,
        viewerBusinessId: activeBusinessId || undefined,
      });
      
      setPosts(prev => [...prev, ...result.posts]);
      setNextCursor(result.nextCursor);
    } catch {
      // Silently fail infinite scroll - don't disrupt UX
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, activeBusinessId]);

  // Load on mount
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  return {
    posts,
    loading,
    refreshing,
    loadingMore,
    error,
    isMockData,
    hasMore: nextCursor !== null,
    refresh,
    loadMore,
  };
}

export default useFeed;

