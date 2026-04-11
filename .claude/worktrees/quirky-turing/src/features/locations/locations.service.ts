/**
 * Locations Service
 *
 * Domain service for business locations.
 * Frontend uses snake_case, backend uses camelCase — mapping handled here.
 */

import { get, post, patch, del } from '@/shared/services/api';
import type { BusinessLocation } from '@/shared/types/business';

// Re-export for convenience
export type { BusinessLocation } from '@/shared/types/business';

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

export type UpdateLocationPayload = Partial<CreateLocationPayload>;

/**
 * Map snake_case frontend payload → camelCase backend payload
 */
function toBackendPayload(data: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    switch (key) {
      case 'operating_mode': mapped.operatingMode = value; break;
      case 'is_public': mapped.isPublic = value; break;
      case 'location_type': mapped.locationType = value; break;
      case 'is_primary': break; // not a backend field
      default: mapped[key] = value;
    }
  }
  return mapped;
}

/**
 * Map camelCase backend response → snake_case frontend model
 */
function fromBackendLocation(loc: Record<string, unknown>): BusinessLocation {
  return {
    id: loc.id as string,
    business_id: (loc.businessId || loc.business_id) as string,
    name: loc.name as string,
    address: loc.address as string | undefined,
    phone: loc.phone as string | undefined,
    email: loc.email as string | undefined,
    location_type: loc.locationType as string | undefined,
    latitude: loc.latitude as number | undefined,
    longitude: loc.longitude as number | undefined,
    operating_mode: (loc.operatingMode || loc.operating_mode) as 'DEPENDENT' | 'INDEPENDENT' | undefined,
    is_public: (loc.isPublic ?? loc.is_public) as boolean | undefined,
    is_primary: loc.is_primary as boolean | undefined,
    staff_count: (loc.staffCount || loc.staff_count) as number | undefined,
    created_at: (loc.createdAt || loc.created_at) as string,
    updated_at: (loc.updatedAt || loc.updated_at) as string | undefined,
  };
}

export async function getLocations(companyId: string): Promise<BusinessLocation[]> {
  const raw = await get<Record<string, unknown>[]>(`/companies/${companyId}/locations`);
  return raw.map(fromBackendLocation);
}

export async function getLocation(locationId: string): Promise<BusinessLocation> {
  const raw = await get<Record<string, unknown>>(`/locations/${locationId}`);
  return fromBackendLocation(raw);
}

export async function createLocation(
  companyId: string,
  payload: CreateLocationPayload
): Promise<BusinessLocation> {
  const raw = await post<Record<string, unknown>>(
    `/companies/${companyId}/locations`,
    toBackendPayload(payload as Record<string, unknown>)
  );
  return fromBackendLocation(raw);
}

export async function updateLocation(
  locationId: string,
  payload: UpdateLocationPayload
): Promise<BusinessLocation> {
  const raw = await patch<Record<string, unknown>>(
    `/locations/${locationId}`,
    toBackendPayload(payload as Record<string, unknown>)
  );
  return fromBackendLocation(raw);
}

export async function deleteLocation(companyId: string, locationId: string): Promise<void> {
  await del(`/companies/${companyId}/locations/${locationId}`);
}

const locationsService = {
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
};

export default locationsService;
