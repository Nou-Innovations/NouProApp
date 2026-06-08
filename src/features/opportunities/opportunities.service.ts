/**
 * Opportunities Service - B2B requests / "looking for" (Explore marketplace).
 * Endpoints: /api/opportunities ...
 */
import { get, post, patch, del } from '@/shared/services/api';

export type OpportunityType = 'buying' | 'selling' | 'partnership' | 'service' | 'hiring' | 'other';
export type OpportunityStatus = 'open' | 'closed' | 'fulfilled';

export interface OpportunityBusinessRef {
  id: string;
  name: string;
  logoUrl?: string | null;
  industry?: string | null;
  category?: string | null;
  isVerified?: boolean;
}

export interface Opportunity {
  id: string;
  businessId: string;
  title: string;
  description?: string | null;
  type: OpportunityType;
  category?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency: string;
  locationText?: string | null;
  status: OpportunityStatus;
  expiresAt?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  business?: OpportunityBusinessRef;
  responseCount?: number;
}

export interface OpportunityResponseItem {
  id: string;
  opportunityId: string;
  responderBusinessId: string;
  message?: string | null;
  createdAt: string;
  responderBusiness?: OpportunityBusinessRef;
}

export interface OpportunityFilters {
  type?: OpportunityType;
  category?: string;
  locationText?: string;
  viewerBusinessId?: string;
  limit?: number;
}

export interface CreateOpportunityData {
  businessId: string;
  title: string;
  description?: string;
  type?: OpportunityType;
  category?: string;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  locationText?: string;
  expiresAt?: string;
}

export async function listOpportunities(filters: OpportunityFilters = {}): Promise<Opportunity[]> {
  const q: Record<string, string | number> = {};
  if (filters.type) q.type = filters.type;
  if (filters.category) q.category = filters.category;
  if (filters.locationText) q.locationText = filters.locationText;
  if (filters.viewerBusinessId) q.viewerBusinessId = filters.viewerBusinessId;
  if (filters.limit) q.limit = filters.limit;
  return get<Opportunity[]>('/opportunities', q);
}

export async function getMyOpportunities(businessId: string): Promise<Opportunity[]> {
  return get<Opportunity[]>('/opportunities/mine', { businessId });
}

export async function getOpportunity(id: string): Promise<Opportunity> {
  return get<Opportunity>(`/opportunities/${id}`);
}

export async function createOpportunity(data: CreateOpportunityData): Promise<Opportunity> {
  return post<Opportunity>('/opportunities', data);
}

export async function updateOpportunity(
  id: string,
  patchData: Partial<CreateOpportunityData> & { status?: OpportunityStatus },
): Promise<Opportunity> {
  return patch<Opportunity>(`/opportunities/${id}`, patchData);
}

export async function deleteOpportunity(id: string): Promise<void> {
  return del(`/opportunities/${id}`);
}

export async function respondToOpportunity(
  id: string,
  responderBusinessId: string,
  message?: string,
): Promise<OpportunityResponseItem> {
  return post<OpportunityResponseItem>(`/opportunities/${id}/respond`, { responderBusinessId, message });
}

export async function getOpportunityResponses(id: string): Promise<OpportunityResponseItem[]> {
  return get<OpportunityResponseItem[]>(`/opportunities/${id}/responses`);
}

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  buying: 'Looking to buy',
  selling: 'Looking to sell',
  partnership: 'Partnership',
  service: 'Needs a service',
  hiring: 'Hiring',
  other: 'Other',
};
