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
  locationId?: string,
  currentRole?: TeamMemberRole,
): Promise<void> {
  // super_admin is business-level only (the location endpoint rejects it), and members
  // with no location are managed at the business level. Anything else updates the
  // specific location assignment (which also aligns the business-level role).
  //
  // The guard has to consider the CURRENT role too, not just the new one: the backend
  // rejects on `bm.role === 'super_admin' || role === 'super_admin'`, so DEMOTING an
  // owner who still carries a location row 400s. That's survivable today only because
  // promotion deletes those rows — a legacy row from before that cleanup still breaks
  // it, and the client shouldn't depend on that invariant holding (M-11).
  if (locationId && role !== 'super_admin' && currentRole !== 'super_admin') {
    await patch(`/companies/${companyId}/locations/${locationId}/staff/${userId}`, { role });
  } else {
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

/**
 * Invite a staff member by email. If the address has no account yet, the backend records a
 * pending CompanyInvite (consumed automatically when they sign up) and returns
 * `{ pending: true }`. If the account exists, an 'invited' membership is created and the
 * invitee gets a push. Returns `pending` so the UI can tell the two apart.
 */
export async function inviteStaff(
  companyId: string,
  email: string,
  name: string,
  role: TeamMemberRole,
  locationIds: string[]
): Promise<{ pending?: boolean; invite?: any; user?: any }> {
  return post(`/companies/${companyId}/users/invite`, {
    email,
    name,
    role,
    locationIds,
    status: 'invited',
  });
}

export interface CompanyInvite {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  locationIds: string[];
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED';
  expiresAt?: string | null;
  createdAt: string;
}

/** Pending email invites for people who don't have an account yet. */
export async function getCompanyInvites(companyId: string): Promise<CompanyInvite[]> {
  const res = await get<{ invites: CompanyInvite[] }>(`/companies/${companyId}/invites`);
  return res?.invites || [];
}

/** Revoke a pending email invite. */
export async function revokeCompanyInvite(companyId: string, inviteId: string): Promise<void> {
  await del(`/companies/${companyId}/invites/${inviteId}`);
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
export async function leaveCompany(
  companyId: string,
  options: { archiveCompany?: boolean } = {},
): Promise<void> {
  // The API 409s with LAST_OWNER when you are the only owner, returning the admins you
  // could hand it to. Pass archiveCompany once the user has confirmed they want to leave
  // anyway — the company is archived and the membership dropped in one transaction, so
  // it can never be left live-but-ownerless.
  await del(`/companies/${companyId}/members/me`, options.archiveCompany ? { archiveCompany: true } : undefined);
}

/**
 * Archive (soft-delete) a company. super_admin only.
 *
 * Soft, not hard: a buyer's record of an order/invoice lives on the SELLER's row, so
 * really deleting the company would wipe trading partners' history. The company leaves
 * search and discovery; its name stays visible (greyed out) on existing records.
 *
 * `confirmName` must match the company name exactly (case-insensitive) or the API 400s.
 */
export async function deleteCompany(companyId: string, confirmName: string): Promise<void> {
  await del(`/companies/${companyId}`, { confirmName });
}

// NOTE (R4): resendInvite was removed — the invite-by-email flow never actually sent
// email, so resending did nothing. Deferred until real staff-invite emails are built.

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
  getCompanyInvites,
  revokeCompanyInvite,
  acceptJoinRequest,
  rejectJoinRequest,
  cancelInvite,
  leaveCompany,
  // Join Requests & Pending Invites
  getJoinRequests,
  acceptJoinRequestWithRole,
  rejectJoinRequestById,
  getPendingInvites,
};

export default teamService;
