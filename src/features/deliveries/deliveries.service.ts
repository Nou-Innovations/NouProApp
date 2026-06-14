/**
 * Deliveries Service
 * 
 * ARCHITECTURE: Domain service for delivery operations.
 * 
 * Rules:
 * - This file is the ONLY place that knows how to fetch deliveries
 * - Screens import hooks, hooks import this service
 * - All methods return typed data
 * - No UI logic here
 * 
 * Backend endpoints:
 * - GET  /api/companies/:companyId/deliveries
 * - POST /api/companies/:companyId/deliveries
 * - PATCH /api/companies/:companyId/deliveries/:deliveryId
 */

import { get, post, patch, del } from '@/shared/services/api';
import {
  Delivery,
  DeliveryFilters,
  CreateDeliveryData,
  UpdateDeliveryData,
  DeliveryStaffAssignment,
  DeliveryStaffRole,
  DeliveryStatusHistoryEntry,
} from '@/shared/types/delivery';

// ============================================================================
// Types
// ============================================================================

export interface GetDeliveriesParams {
  companyId: string;
  locationId?: string;
  status?: string;
  direction?: string;
  type?: string;
  assignedTo?: string;
  search?: string;
}

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Get all deliveries for a company
 */
export async function getDeliveries(params: GetDeliveriesParams): Promise<Delivery[]> {
  const { companyId, ...filters } = params;
  
  // Build query params - filter out undefined/empty values
  const queryParams: Record<string, string | undefined> = {};
  if (filters.locationId) queryParams.locationId = filters.locationId;
  if (filters.status && filters.status !== 'all') queryParams.status = filters.status;
  if (filters.direction) queryParams.direction = filters.direction;
  if (filters.type) queryParams.type = filters.type;
  if (filters.assignedTo) queryParams.assignedTo = filters.assignedTo;
  if (filters.search) queryParams.search = filters.search;
  
  return get<Delivery[]>(`/companies/${companyId}/deliveries`, queryParams);
}

/**
 * Get a single delivery by ID
 */
export async function getDelivery(companyId: string, deliveryId: string): Promise<Delivery> {
  return get<Delivery>(`/companies/${companyId}/deliveries/${deliveryId}`);
}

/**
 * Get deliveries assigned to the current user (driver "My deliveries" view)
 */
export async function getMyDeliveries(companyId: string): Promise<Delivery[]> {
  return get<Delivery[]>(`/companies/${companyId}/my-deliveries`);
}

/**
 * Get the status-change audit trail for a delivery (newest first)
 */
export async function getDeliveryHistory(
  companyId: string,
  deliveryId: string
): Promise<DeliveryStatusHistoryEntry[]> {
  return get<DeliveryStatusHistoryEntry[]>(
    `/companies/${companyId}/deliveries/${deliveryId}/history`
  );
}

/**
 * Create a new delivery
 */
export async function createDelivery(companyId: string, data: CreateDeliveryData): Promise<Delivery> {
  return post<Delivery>(`/companies/${companyId}/deliveries`, data);
}

/**
 * Update a delivery (status, assignment, etc.)
 */
export async function updateDelivery(
  companyId: string, 
  deliveryId: string, 
  data: UpdateDeliveryData
): Promise<Delivery> {
  return patch<Delivery>(`/companies/${companyId}/deliveries/${deliveryId}`, data);
}

/**
 * Update delivery status
 */
export async function updateDeliveryStatus(
  companyId: string,
  deliveryId: string,
  status: string
): Promise<Delivery> {
  return patch<Delivery>(`/companies/${companyId}/deliveries/${deliveryId}`, { deliveryStatus: status });
}

/**
 * Assign delivery to staff via the dedicated /assign endpoint.
 * Uses the backend assign route which enforces canAssignTransport plan checks,
 * location-level access verification, and auto-status-advance logic.
 * staffName is kept in the signature for local store updates.
 */
export async function assignDelivery(
  companyId: string,
  deliveryId: string,
  staffId: string,
  staffName: string
): Promise<Delivery> {
  return patch<Delivery>(`/companies/${companyId}/deliveries/${deliveryId}/assign`, { 
    userId: staffId
  });
}

/**
 * Unassign delivery from staff via the dedicated /unassign endpoint.
 */
export async function unassignDelivery(
  companyId: string,
  deliveryId: string
): Promise<Delivery> {
  return patch<Delivery>(`/companies/${companyId}/deliveries/${deliveryId}/unassign`, {});
}

// ============================================================================
// Multi-Staff Assignment
// ============================================================================

/**
 * Assign staff to delivery with a role
 */
export async function assignDeliveryStaff(
  companyId: string,
  deliveryId: string,
  userId: string,
  role: DeliveryStaffRole = 'driver'
): Promise<DeliveryStaffAssignment> {
  return post<DeliveryStaffAssignment>(
    `/companies/${companyId}/deliveries/${deliveryId}/staff`,
    { userId, role }
  );
}

/**
 * Remove staff from delivery
 */
export async function removeDeliveryStaff(
  companyId: string,
  deliveryId: string,
  userId: string
): Promise<void> {
  return del(`/companies/${companyId}/deliveries/${deliveryId}/staff/${userId}`);
}

/**
 * Get all staff assigned to a delivery
 */
export async function getDeliveryStaff(
  companyId: string,
  deliveryId: string
): Promise<DeliveryStaffAssignment[]> {
  return get<DeliveryStaffAssignment[]>(
    `/companies/${companyId}/deliveries/${deliveryId}/staff`
  );
}

/**
 * Update staff role on a delivery
 */
export async function updateDeliveryStaffRole(
  companyId: string,
  deliveryId: string,
  userId: string,
  role: DeliveryStaffRole
): Promise<DeliveryStaffAssignment> {
  return patch<DeliveryStaffAssignment>(
    `/companies/${companyId}/deliveries/${deliveryId}/staff/${userId}`,
    { role }
  );
}

/**
 * Delete a delivery
 */
export async function deleteDelivery(
  companyId: string,
  deliveryId: string
): Promise<void> {
  return del(`/companies/${companyId}/deliveries/${deliveryId}`);
}

// ============================================================================
// Export as namespace
// ============================================================================

const deliveriesService = {
  getDeliveries,
  getDelivery,
  getMyDeliveries,
  getDeliveryHistory,
  createDelivery,
  updateDelivery,
  updateDeliveryStatus,
  assignDelivery,
  unassignDelivery,
  assignDeliveryStaff,
  removeDeliveryStaff,
  getDeliveryStaff,
  updateDeliveryStaffRole,
  deleteDelivery,
};

export default deliveriesService;

