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

import { getFullResponse } from '@/shared/services/api';
import { FeedPost, FeedResponse } from '@/shared/types/feed';

// ============================================================================
// Types
// ============================================================================

export interface FeedParams {
  limit?: number;
  cursor?: string;
}

export interface FeedResult {
  posts: FeedPost[];
  nextCursor: string | null;
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

  // Use getFullResponse to get the complete response including nextCursor
  const response = await getFullResponse<FeedResponse>('/feed', queryParams);
  
  return {
    posts: response.data,
    nextCursor: response.nextCursor,
  };
}

// ============================================================================
// Export as namespace
// ============================================================================

const feedService = {
  getFeed,
};

export default feedService;

