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
 */

import { useState, useEffect, useCallback } from 'react';
import { FeedPost } from '@/shared/types/feed';
import feedService from '../feed.service';
import { ApiError } from '@/shared/services/api';

// Mock data for fallback (matches backend server.js feed posts)
const mockFeedPosts: FeedPost[] = [
  {
    id: 'post-1',
    type: 'brand_presentation',
    timestamp: '2h ago',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    data: {
      brandId: 'brand-001',
      brandName: 'Tropicana',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Tropicana_Logo.svg/512px-Tropicana_Logo.svg.png',
      distributorName: 'NouPro Distribution',
      distributorId: 'dist-001',
      products: [
        { id: 'prod-1', name: 'Premium Orange Juice', description: 'Fresh squeezed', unit: '1L', price: 125.00, image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400', isNew: true },
        { id: 'prod-2', name: 'Tropical Mango Smoothie', description: 'Creamy blend', unit: '500ml', price: 145.00, image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400', isNew: false },
      ],
    },
  },
  {
    id: 'post-2',
    type: 'company_presentation',
    timestamp: '4h ago',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    data: {
      companyId: 'comp-001',
      companyName: 'Phoenix Beverages',
      companyLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8a/Phoenix_Beverages_Limited_logo.svg/512px-Phoenix_Beverages_Limited_logo.svg.png',
      location: 'Port Louis, Mauritius',
      isConnected: false,
      brands: [
        { id: 'brand-101', name: 'Phoenix Beer', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8a/Phoenix_Beverages_Limited_logo.svg/200px-Phoenix_Beverages_Limited_logo.svg.png', productsCount: 24 },
        { id: 'brand-102', name: 'Coca-Cola', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/512px-Coca-Cola_logo.svg.png', productsCount: 18 },
      ],
    },
  },
  {
    id: 'post-3',
    type: 'new_products',
    timestamp: '6h ago',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    data: {
      postType: 'distributor_added',
      businessId: 'biz-001',
      businessName: 'Fresh Farms Mauritius',
      businessLogo: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=200',
      products: [
        { id: 'new-1', name: 'Organic Honey', unit: '500g', price: 350.00, image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400', brandName: 'Bee Natural' },
        { id: 'new-2', name: 'Fresh Avocados', unit: 'Pack of 4', price: 180.00, image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400', brandName: 'Green Valley' },
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

  // Initial load
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await feedService.getFeed({ limit: FEED_PAGE_SIZE });
      setPosts(result.posts);
      setNextCursor(result.nextCursor);
      setIsMockData(false);
      
      if (__DEV__) {
        console.log(`[useFeed] Loaded ${result.posts.length} posts from API`);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load feed';
      setError(message);
      
      // Fallback to mock data
      if (__DEV__) {
        console.warn('[useFeed] API failed, using mock data:', message);
      }
      setPosts(mockFeedPosts);
      setNextCursor(null);
      setIsMockData(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Pull-to-refresh
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const result = await feedService.getFeed({ limit: FEED_PAGE_SIZE });
      setPosts(result.posts);
      setNextCursor(result.nextCursor);
      setIsMockData(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to refresh feed';
      setError(message);
      // Keep existing posts on refresh failure
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Infinite scroll - load more
  const loadMore = useCallback(async () => {
    // Don't load more if:
    // - Already loading
    // - No more posts (no cursor)
    // - Using mock data (mock doesn't paginate)
    if (loadingMore || !nextCursor || isMockData) {
      return;
    }

    setLoadingMore(true);

    try {
      const result = await feedService.getFeed({ 
        limit: FEED_PAGE_SIZE, 
        cursor: nextCursor 
      });
      
      setPosts(prev => [...prev, ...result.posts]);
      setNextCursor(result.nextCursor);
      
      if (__DEV__) {
        console.log(`[useFeed] Loaded ${result.posts.length} more posts`);
      }
    } catch {
      // Silently fail infinite scroll - don't disrupt UX
      if (__DEV__) {
        console.warn('[useFeed] Failed to load more posts');
      }
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, isMockData]);

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
    hasMore: nextCursor !== null && !isMockData,
    refresh,
    loadMore,
  };
}

export default useFeed;

