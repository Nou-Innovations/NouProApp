/**
 * Route types — delivery routes / trips that group ordered stops for a driver.
 * Mirrors the backend Route (delivery-route) model.
 */
import { theme } from '@/shared/theme';

export type RouteStatus = 'Planned' | 'Active' | 'Completed' | 'Canceled';

export interface RouteStop {
  seq: number;
  type: 'delivery' | 'transfer';
  refId: string;
  address?: string;
  lat?: number;
  lng?: number;
  status?: string;
  eta?: string;
}

export interface Route {
  id: string;
  businessId: string;
  name?: string | null;
  date?: string | null;
  driverId?: string | null;
  transportId?: string | null;
  status: RouteStatus;
  stops: RouteStop[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRouteData {
  name?: string;
  date?: string;
  driverId?: string | null;
  transportId?: string | null;
  status?: RouteStatus;
  stops: RouteStop[];
}

export const ROUTE_STATUS_LABELS: Record<RouteStatus, string> = {
  Planned: 'Planned',
  Active: 'Active',
  Completed: 'Completed',
  Canceled: 'Canceled',
};

export const ROUTE_STATUS_COLORS: Record<RouteStatus, string> = {
  Planned: theme.colors.neutral,
  Active: theme.colors.info,
  Completed: theme.colors.success,
  Canceled: theme.colors.error,
};
