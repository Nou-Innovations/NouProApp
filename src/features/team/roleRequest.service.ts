/**
 * Role Request Service
 * 
 * Handles staff-to-admin upgrade requests.
 * Staff members can request admin access, which must be approved by super_admin.
 */

import { get, post, patch, del } from '@/shared/services/api';
import { 
  RoleRequest, 
  CreateRoleRequestPayload, 
  ResolveRoleRequestPayload,
  RoleRequestWithUser 
} from '@/shared/types/roleRequest';

// ============================================================================
// STAFF ACTIONS (request upgrade)
// ============================================================================

/**
 * Create a role upgrade request (staff → admin)
 */
export async function createRoleRequest(
  businessId: string,
  payload: CreateRoleRequestPayload
): Promise<RoleRequest> {
  return post<RoleRequest>(`/companies/${businessId}/role-requests`, payload);
}

/**
 * Withdraw your own pending join/role request.
 *
 * Without this the CTA was a dead end: it kept offering "Request to Join" (it reads
 * memberships, and a request isn't one), a second tap 400'd, and only an admin could
 * clear it (M-9).
 */
export async function withdrawRoleRequest(businessId: string): Promise<void> {
  await del(`/companies/${businessId}/role-requests/me`);
}

/**
 * Get current user's role request status (if any)
 */
export async function getMyRoleRequest(
  businessId: string
): Promise<RoleRequest | null> {
  return get<RoleRequest | null>(`/companies/${businessId}/role-requests/me`);
}

// ============================================================================
// ADMIN ACTIONS (approve/reject requests)
// ============================================================================

/**
 * Get all role requests for a business (admin only)
 */
export async function getRoleRequests(
  businessId: string,
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'
): Promise<RoleRequestWithUser[]> {
  // Backend responds with { requests: [...] }, so the unwrapped payload is an
  // object — returning it raw left callers with a non-array and rendered nothing.
  const response = await get<{ requests: RoleRequestWithUser[] }>(
    `/companies/${businessId}/role-requests`,
    status ? { status } : undefined
  );
  return response?.requests || [];
}

/**
 * Approve or reject a role request (admin only)
 */
export async function resolveRoleRequest(
  businessId: string,
  requestId: string,
  resolution: ResolveRoleRequestPayload
): Promise<RoleRequest> {
  return patch<RoleRequest>(
    `/companies/${businessId}/role-requests/${requestId}`,
    resolution
  );
}

// ============================================================================
// Export as namespace
// ============================================================================

const roleRequestService = {
  // Staff actions
  createRoleRequest,
  withdrawRoleRequest,
  getMyRoleRequest,
  // Admin actions
  getRoleRequests,
  resolveRoleRequest,
};

export default roleRequestService;
