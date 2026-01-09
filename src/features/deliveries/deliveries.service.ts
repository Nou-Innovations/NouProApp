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

import { get, post, patch } from '@/shared/services/api';
import { 
  Delivery, 
  DeliveryFilters,
  CreateDeliveryData,
  UpdateDeliveryData,
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
 * Assign delivery to staff
 */
export async function assignDelivery(
  companyId: string,
  deliveryId: string,
  staffId: string,
  staffName: string
): Promise<Delivery> {
  return patch<Delivery>(`/companies/${companyId}/deliveries/${deliveryId}`, { 
    assignedStaffId: staffId,
    assignedTo: staffName
  });
}

// ============================================================================
// Export as namespace
// ============================================================================

const deliveriesService = {
  getDeliveries,
  getDelivery,
  createDelivery,
  updateDelivery,
  updateDeliveryStatus,
  assignDelivery,
};

export default deliveriesService;

