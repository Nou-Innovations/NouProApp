/**
 * Locations Service
 *
 * Domain service for business locations.
 */

import { get, post, del } from '@/shared/services/api';

export interface BusinessLocation {
  id: string;
  business_id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  operating_mode?: 'DEPENDENT' | 'INDEPENDENT';
  is_public?: boolean;
  is_primary?: boolean;
  staff_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateLocationPayload {
  name: string;
  location_type?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  operating_mode?: 'DEPENDENT' | 'INDEPENDENT';
  is_public?: boolean;
  is_primary?: boolean;
  phone?: string;
  email?: string;
}

export async function getLocations(companyId: string): Promise<BusinessLocation[]> {
  return get<BusinessLocation[]>(`/companies/${companyId}/locations`);
}

export async function createLocation(
  companyId: string,
  payload: CreateLocationPayload
): Promise<BusinessLocation> {
  return post<BusinessLocation>(`/companies/${companyId}/locations`, payload);
}

export async function deleteLocation(companyId: string, locationId: string): Promise<void> {
  await del(`/companies/${companyId}/locations/${locationId}`);
}

const locationsService = {
  getLocations,
  createLocation,
  deleteLocation,
};

export default locationsService;
