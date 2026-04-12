import { useState, useEffect, useCallback } from 'react';
import { followBusiness, unfollowBusiness, getFollowStatus } from '../follow.service';

interface UseFollowStatusResult {
  isFollowing: boolean;
  followersCount: number;
  loading: boolean;
  toggleFollow: () => Promise<void>;
}

export function useFollowStatus(businessId: string): UseFollowStatusResult {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        const status = await getFollowStatus(businessId);
        if (!cancelled) {
          setIsFollowing(status.isFollowing);
          setFollowersCount(status.followersCount);
        }
      } catch {
        // Silently fail - user might not be authenticated
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [businessId]);

  const toggleFollow = useCallback(async () => {
    // Optimistic update
    const wasFollowing = isFollowing;
    const prevCount = followersCount;
    setIsFollowing(!wasFollowing);
    setFollowersCount(wasFollowing ? prevCount - 1 : prevCount + 1);

    try {
      const result = wasFollowing
        ? await unfollowBusiness(businessId)
        : await followBusiness(businessId);
      setFollowersCount(result.followersCount);
    } catch {
      // Revert on error
      setIsFollowing(wasFollowing);
      setFollowersCount(prevCount);
    }
  }, [businessId, isFollowing, followersCount]);

  return { isFollowing, followersCount, loading, toggleFollow };
}
