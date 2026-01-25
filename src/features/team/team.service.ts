/**
 * Team Service
 *
 * Domain service for staff management.
 * Screens should import from here, not the API client directly.
 */

import { get, post, patch, del } from '@/shared/services/api';
import { getCapabilities } from '@/shared/auth/capabilities';

export { getCapabilities };

export type TeamMemberRole = 'super_admin' | 'admin' | 'staff';
export type TeamMemberScope = 'business' | 'location';
export type TeamMemberStatus = 'invited' | 'accepted' | 'suspended';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  scope: TeamMemberScope;
  avatar?: string;
  phone?: string;
  locationId?: string | null;
  locationIds?: string[];
  locationName?: string | null;
  joinedAt?: string | null;
}

export interface AccessibleLocation {
  id: string;
  name: string;
  address?: string;
}

export interface UserCapabilities {
  role: TeamMemberRole;
  canAccessBusinessProfile: boolean;
  canAccessAllLocations: boolean;
}

// ============================================================================
// CAPABILITY HELPERS (Single source of truth for role-based permissions)
// ============================================================================

// ============================================================================
// STAFF FETCHING
// ============================================================================

/**
 * Get all staff for a business (business-level view)
 */
export async function getTeamMembers(companyId: string, status?: TeamMemberStatus): Promise<TeamMember[]> {
  return get<TeamMember[]>(`/companies/${companyId}/staff`, status ? { status } : undefined);
}

/**
 * Get staff for a specific location
 * @param includeBusinessAdmins - Include super_admin/admin from business level
 */
export async function getLocationStaff(
  companyId: string,
  locationId: string,
  includeBusinessAdmins = true
): Promise<TeamMember[]> {
  return get<TeamMember[]>(
    `/companies/${companyId}/locations/${locationId}/staff?includeBusinessAdmins=${includeBusinessAdmins}`
  );
}

/**
 * Get accessible locations for a user
 */
export async function getAccessibleLocations(
  companyId: string,
  userId: string
): Promise<{ role: TeamMemberRole; locations: AccessibleLocation[] }> {
  return get<{ role: TeamMemberRole; locations: AccessibleLocation[] }>(
    `/companies/${companyId}/access/locations?userId=${userId}`
  );
}

/**
 * Get user capabilities for Pro vs Personal mode gating
 */
export async function getUserCapabilities(
  companyId: string,
  userId: string
): Promise<UserCapabilities> {
  return get<UserCapabilities>(
    `/companies/${companyId}/access/capabilities?userId=${userId}`
  );
}

// ============================================================================
// STAFF MANAGEMENT (CRUD)
// ============================================================================

/**
 * Update a team member's role (location-scoped)
 */
export async function updateTeamMemberRole(
  companyId: string,
  userId: string,
  role: TeamMemberRole,
  locationId?: string
): Promise<void> {
  if (locationId) {
    await patch(`/companies/${companyId}/locations/${locationId}/staff/${userId}`, { role });
  } else {
    // Fallback to business-level update
    await patch(`/companies/${companyId}/users/${userId}`, { role });
  }
}

/**
 * Remove a team member from a location
 */
export async function removeTeamMember(
  companyId: string,
  userId: string,
  locationId?: string
): Promise<void> {
  if (locationId) {
    await del(`/companies/${companyId}/locations/${locationId}/staff/${userId}`);
  } else {
    await del(`/companies/${companyId}/users/${userId}`);
  }
}

/**
 * Assign staff to a location
 */
export async function assignStaffToLocation(
  companyId: string,
  locationId: string,
  userId: string,
  role: TeamMemberRole,
  status: TeamMemberStatus = 'accepted'
): Promise<void> {
  await post(`/companies/${companyId}/locations/${locationId}/staff`, {
    userId,
    role,
    status,
  });
}

// ============================================================================
// INVITE WORKFLOW
// ============================================================================

export async function inviteStaff(
  companyId: string,
  email: string,
  name: string,
  role: TeamMemberRole,
  locationIds: string[]
): Promise<{ user: any; invite: { token: string; link: string } }> {
  return post(`/companies/${companyId}/users/invite`, {
    email,
    name,
    role,
    locationIds,
    status: 'invited',
  });
}

export async function acceptJoinRequest(companyId: string, userId: string): Promise<void> {
  await post(`/companies/${companyId}/users/${userId}/accept`, {});
}

export async function rejectJoinRequest(companyId: string, userId: string): Promise<void> {
  await post(`/companies/${companyId}/users/${userId}/decline`, {});
}

export async function cancelInvite(companyId: string, userId: string): Promise<void> {
  await del(`/companies/${companyId}/users/${userId}/invite`);
}

export async function resendInvite(companyId: string, userId: string): Promise<void> {
  await post(`/companies/${companyId}/users/${userId}/resend-invite`, {});
}

const teamService = {
  // Capabilities
  getCapabilities,
  // Fetching
  getTeamMembers,
  getLocationStaff,
  getAccessibleLocations,
  getUserCapabilities,
  // Management
  updateTeamMemberRole,
  removeTeamMember,
  assignStaffToLocation,
  // Invites
  inviteStaff,
  acceptJoinRequest,
  rejectJoinRequest,
  cancelInvite,
  resendInvite,
};

export default teamService;
