import { get, post, del } from '@/shared/services/api';
import { FollowStatus } from '@/shared/types/follow';

export async function followBusiness(businessId: string): Promise<{ followersCount: number }> {
  return post(`/businesses/${businessId}/follow`);
}

export async function unfollowBusiness(businessId: string): Promise<{ followersCount: number }> {
  return del(`/businesses/${businessId}/follow`);
}

/**
 * Every business the current user follows, as a Set for O(1) lookups.
 * Explore labels a whole page of cards at once; per-card status calls would be N requests.
 */
export async function getFollowedBusinessIds(): Promise<Set<string>> {
  const res = await get<{ businessIds: string[] }>('/users/me/follows');
  return new Set(res?.businessIds || []);
}

export async function getFollowStatus(businessId: string): Promise<FollowStatus> {
  return get<FollowStatus>(`/businesses/${businessId}/follow-status`);
}
