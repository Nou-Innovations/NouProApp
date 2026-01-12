/**
 * Transport/Vehicle Types
 * Types for business fleet/transport management
 */

/**
 * Vehicle type classification
 */
export type VehicleType = 'van' | 'truck' | 'motorcycle' | 'car' | 'bicycle' | 'other';

/**
 * Vehicle operational status
 */
export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'inactive';

/**
 * Transport/Vehicle - A business delivery vehicle
 */
export interface Transport {
  id: string;
  business_id: string;
  name: string;
  vehicle_type: VehicleType;
  license_plate?: string;
  capacity?: string;
  status: VehicleStatus;
  assigned_staff_id?: string;
  assigned_staff_name?: string;
  assigned_staff_avatar?: string;
  current_location_id?: string;
  current_location_name?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Transport creation payload
 */
export interface CreateTransportPayload {
  name: string;
  vehicle_type: VehicleType;
  license_plate?: string;
  capacity?: string;
  notes?: string;
}

/**
 * Transport update payload
 */
export interface UpdateTransportPayload {
  name?: string;
  vehicle_type?: VehicleType;
  license_plate?: string;
  capacity?: string;
  status?: VehicleStatus;
  assigned_staff_id?: string | null;
  current_location_id?: string | null;
  notes?: string;
}

/**
 * Get icon name for vehicle type
 */
export const getVehicleIcon = (type: VehicleType): string => {
  switch (type) {
    case 'van':
      return 'bus-outline';
    case 'truck':
      return 'cube-outline';
    case 'motorcycle':
      return 'bicycle-outline';
    case 'car':
      return 'car-outline';
    case 'bicycle':
      return 'bicycle-outline';
    default:
      return 'car-outline';
  }
};

/**
 * Get display label for vehicle status
 */
export const getVehicleStatusLabel = (status: VehicleStatus): string => {
  switch (status) {
    case 'available':
      return 'Available';
    case 'in_use':
      return 'In Use';
    case 'maintenance':
      return 'Maintenance';
    case 'inactive':
      return 'Inactive';
    default:
      return status;
  }
};

/**
 * Status colors for vehicles
 */
export const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  available: '#2ACF01',
  in_use: '#0075FF',
  maintenance: '#FFB600',
  inactive: '#A4AAB8',
};
