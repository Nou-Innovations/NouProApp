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
 * Remove a team member from a location or from the entire business
 */
export async function removeTeamMember(
  companyId: string,
  userId: string,
  locationId?: string
): Promise<void> {
  if (locationId) {
    await del(`/companies/${companyId}/locations/${locationId}/staff/${userId}`);
  } else {
    await del(`/companies/${companyId}/users/${userId}/invite`);
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

/**
 * Leave a company (self-removal for accepted members)
 */
export async function leaveCompany(companyId: string): Promise<void> {
  await del(`/companies/${companyId}/members/me`);
}

export async function resendInvite(companyId: string, userId: string): Promise<void> {
  await post(`/companies/${companyId}/users/${userId}/resend-invite`, {});
}

// ============================================================================
// JOIN REQUESTS & PENDING INVITES (for notifications & team management)
// ============================================================================

export interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  message?: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'staff';
  invitedAt: string;
  expiresAt?: string;
}

/**
 * Get join requests for a business (non-members requesting to join).
 * These are role requests where currentRole === 'none'.
 */
export async function getJoinRequests(
  businessId: string,
  status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING'
): Promise<JoinRequest[]> {
  const response = await get<{ requests: any[] }>(
    `/companies/${businessId}/role-requests`,
    { status }
  );

  const requests = response?.requests || [];

  // Filter to only join requests (non-members), not role upgrade requests (currentRole: 'staff')
  return requests
    .filter(req => req.currentRole === 'none')
    .map(req => ({
      id: req.id,
      userId: req.userId,
      userName: req.user?.name || req.userName || 'Unknown',
      userEmail: req.user?.email || req.userEmail || '',
      userAvatar: req.user?.avatar || req.userAvatar,
      requestedAt: req.createdAt,
      status: req.status,
      message: req.message,
    }));
}

/**
 * Accept a join request and assign role
 */
export async function acceptJoinRequestWithRole(
  businessId: string,
  requestId: string,
  role: string
): Promise<void> {
  await patch(`/companies/${businessId}/role-requests/${requestId}`, {
    status: 'APPROVED',
    role,
  });
}

/**
 * Reject a join request
 */
export async function rejectJoinRequestById(
  businessId: string,
  requestId: string
): Promise<void> {
  await patch(`/companies/${businessId}/role-requests/${requestId}`, {
    status: 'REJECTED',
  });
}

/**
 * Get pending invites (invitations sent by business)
 */
export async function getPendingInvites(
  businessId: string
): Promise<PendingInvite[]> {
  // Get team members with 'invited' status
  const members = await getTeamMembers(businessId, 'invited');
  
  // Handle empty or missing members array
  if (!members || !Array.isArray(members)) {
    return [];
  }
  
  return members.map(m => ({
    id: m.id,
    email: m.email,
    name: m.name,
    role: m.role as 'admin' | 'staff',
    invitedAt: m.joinedAt || new Date().toISOString(),
  }));
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
  leaveCompany,
  // Join Requests & Pending Invites
  getJoinRequests,
  acceptJoinRequestWithRole,
  rejectJoinRequestById,
  getPendingInvites,
};

export default teamService;
