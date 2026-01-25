/**
 * Role Request Service
 * 
 * Handles staff-to-admin upgrade requests.
 * Staff members can request admin access, which must be approved by super_admin.
 */

import { get, post, patch } from '@/shared/services/api';
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
  return post<RoleRequest>(`/businesses/${businessId}/role-requests`, payload);
}

/**
 * Cancel own pending request
 */
export async function cancelRoleRequest(
  businessId: string,
  requestId: string
): Promise<void> {
  return patch(`/businesses/${businessId}/role-requests/${requestId}`, {
    status: 'CANCELLED'
  });
}

/**
 * Get current user's role request status (if any)
 */
export async function getMyRoleRequest(
  businessId: string
): Promise<RoleRequest | null> {
  return get<RoleRequest | null>(`/businesses/${businessId}/role-requests/me`);
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
  return get<RoleRequestWithUser[]>(
    `/businesses/${businessId}/role-requests`,
    status ? { status } : undefined
  );
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
    `/businesses/${businessId}/role-requests/${requestId}`,
    resolution
  );
}

// ============================================================================
// Export as namespace
// ============================================================================

const roleRequestService = {
  // Staff actions
  createRoleRequest,
  cancelRoleRequest,
  getMyRoleRequest,
  // Admin actions
  getRoleRequests,
  resolveRoleRequest,
};

export default roleRequestService;
