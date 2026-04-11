/**
 * Role Request Types
 * For staff members requesting admin access upgrade
 */

export type RoleRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface RoleRequest {
  id: string;
  businessId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  requestedRole: 'admin'; // Currently only support staff → admin
  currentRole: 'staff';
  status: RoleRequestStatus;
  message?: string; // Optional reason from requester
  createdAt: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  resolvedByName?: string;
  rejectionReason?: string;
}

export interface CreateRoleRequestPayload {
  requestedRole: 'admin';
  message?: string;
}

export interface ResolveRoleRequestPayload {
  status: 'APPROVED' | 'REJECTED';
  role?: 'admin' | 'staff';
  rejectionReason?: string;
}

export interface RoleRequestWithUser extends RoleRequest {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}
