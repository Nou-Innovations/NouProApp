/**
 * Routes Service — the single boundary for delivery-route API calls.
 * Note: backend path is `delivery-routes`, not `routes`.
 */
import { get, post, patch, del } from '@/shared/services/api';
import { Route, CreateRouteData, RouteStatus } from '@/shared/types/route';

export async function getRoutes(companyId: string, status?: RouteStatus): Promise<Route[]> {
  return get<Route[]>(`/companies/${companyId}/delivery-routes`, status ? { status } : undefined);
}

export async function getRoute(companyId: string, routeId: string): Promise<Route> {
  return get<Route>(`/companies/${companyId}/delivery-routes/${routeId}`);
}

export async function createRoute(companyId: string, data: CreateRouteData): Promise<Route> {
  return post<Route>(`/companies/${companyId}/delivery-routes`, data);
}

export async function updateRoute(
  companyId: string,
  routeId: string,
  data: Partial<Pick<Route, 'name' | 'date' | 'driverId' | 'transportId' | 'status' | 'stops'>>
): Promise<Route> {
  return patch<Route>(`/companies/${companyId}/delivery-routes/${routeId}`, data);
}

export async function deleteRoute(companyId: string, routeId: string): Promise<void> {
  return del(`/companies/${companyId}/delivery-routes/${routeId}`);
}

const routesService = { getRoutes, getRoute, createRoute, updateRoute, deleteRoute };
export default routesService;
