/**
 * Stock Service
 *
 * Domain service for location-level inventory (the `Stock` model).
 * Backend endpoints:
 * - GET   /api/companies/:companyId/stock            (all locations, business-scoped)
 * - GET   /api/locations/:locationId/stock           (single location)
 * - PATCH /api/locations/:locationId/stock/:productId (upsert qtyOnHand)
 *
 * NOTE: Product LIST screens already get a summed `stockQuantity` + `locationStocks`
 * via the products endpoint, so display can ride on `useProducts`. This service is
 * primarily for WRITING stock (setStock) and the aggregate all-locations view.
 */

import { get, patch } from '@/shared/services/api';

export interface StockRecord {
  id: string;
  businessId: string;
  locationId: string;
  productId: string;
  qtyOnHand: number;
  product?: {
    id: string;
    name: string;
    sku?: string | null;
    category?: string | null;
    [key: string]: unknown;
  } | null;
  location?: { id: string; name: string } | null;
}

/** All stock rows across every location of a business. */
export async function getCompanyStock(companyId: string): Promise<StockRecord[]> {
  return get<StockRecord[]>(`/companies/${companyId}/stock`);
}

/** Stock rows for a single location. */
export async function getLocationStock(locationId: string): Promise<StockRecord[]> {
  return get<StockRecord[]>(`/locations/${locationId}/stock`);
}

/** Create-or-update the quantity on hand for a product at a location. */
export async function setStock(
  locationId: string,
  productId: string,
  qtyOnHand: number,
): Promise<StockRecord> {
  return patch<StockRecord>(`/locations/${locationId}/stock/${productId}`, { qtyOnHand });
}

const stockService = { getCompanyStock, getLocationStock, setStock };
export default stockService;
