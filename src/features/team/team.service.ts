/**
 * Team Service
 *
 * Domain service for staff management.
 * Screens should import from here, not the API client directly.
 */

import { get, post, patch, del } from '@/shared/services/api';

export type TeamMemberRole = 'superAdmin' | 'admin' | 'staff';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: TeamMemberRole;
  companyId: string;
  locationIds: string[];
  avatar?: string;
  phone?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export async function getTeamMembers(companyId: string): Promise<TeamMember[]> {
  return get<TeamMember[]>(`/companies/${companyId}/users`);
}

export async function updateTeamMemberRole(
  companyId: string,
  userId: string,
  role: TeamMemberRole
): Promise<void> {
  await patch(`/companies/${companyId}/users/${userId}`, { role });
}

export async function removeTeamMember(companyId: string, userId: string): Promise<void> {
  await del(`/companies/${companyId}/users/${userId}`);
}

export async function acceptJoinRequest(companyId: string, requestId: string): Promise<void> {
  await post(`/companies/${companyId}/join-requests/${requestId}/accept`, {});
}

export async function rejectJoinRequest(companyId: string, requestId: string): Promise<void> {
  await post(`/companies/${companyId}/join-requests/${requestId}/reject`, {});
}

export async function cancelInvite(companyId: string, inviteId: string): Promise<void> {
  await post(`/companies/${companyId}/invites/${inviteId}/cancel`, {});
}

export async function resendInvite(companyId: string, inviteId: string): Promise<void> {
  await post(`/companies/${companyId}/invites/${inviteId}/resend`, {});
}

const teamService = {
  getTeamMembers,
  updateTeamMemberRole,
  removeTeamMember,
  acceptJoinRequest,
  rejectJoinRequest,
  cancelInvite,
  resendInvite,
};

export default teamService;
