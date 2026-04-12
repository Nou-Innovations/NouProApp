import { get, post, del } from '@/shared/services/api';
import { FollowStatus } from '@/shared/types/follow';

export async function followBusiness(businessId: string): Promise<{ followersCount: number }> {
  return post(`/businesses/${businessId}/follow`);
}

export async function unfollowBusiness(businessId: string): Promise<{ followersCount: number }> {
  return del(`/businesses/${businessId}/follow`);
}

export async function getFollowStatus(businessId: string): Promise<FollowStatus> {
  return get<FollowStatus>(`/businesses/${businessId}/follow-status`);
}
