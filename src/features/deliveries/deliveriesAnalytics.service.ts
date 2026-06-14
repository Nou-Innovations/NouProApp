/**
 * Deliveries Analytics Service
 *
 * Fetches aggregated delivery metrics for the analytics screen.
 * Backend: GET /api/companies/:companyId/deliveries/analytics
 */

import { get } from '@/shared/services/api';
import { DeliveriesAnalytics } from '@/shared/types/delivery';

export interface GetDeliveriesAnalyticsParams {
  companyId: string;
  locationId?: string;
  /** ISO date string */
  from?: string;
  /** ISO date string */
  to?: string;
}

export async function getDeliveriesAnalytics(
  params: GetDeliveriesAnalyticsParams
): Promise<DeliveriesAnalytics> {
  const { companyId, locationId, from, to } = params;
  const query: Record<string, string | undefined> = {};
  if (locationId) query.locationId = locationId;
  if (from) query.from = from;
  if (to) query.to = to;
  return get<DeliveriesAnalytics>(`/companies/${companyId}/deliveries/analytics`, query);
}

export default { getDeliveriesAnalytics };
