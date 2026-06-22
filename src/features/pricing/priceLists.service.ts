/**
 * Price Lists Service
 *
 * Customer-specific pricing CRUD + assignments. All endpoints are company-scoped:
 * /api/companies/:companyId/price-lists. Gated server-side by the Business plan
 * (canUseBusinessSpecificPricing).
 */
import { get, post, patch, put, del } from '@/shared/services/api';
import {
  PriceList,
  PriceListItem,
  PriceListAssignment,
  CreatePriceListData,
  UpdatePriceListData,
  AddPriceListItemData,
  ResolvedPrice,
} from '@/shared/types/pricing';

// ── Price lists ──────────────────────────────────────────────────────────────

export async function getPriceLists(companyId: string): Promise<PriceList[]> {
  return get<PriceList[]>(`/companies/${companyId}/price-lists`);
}

export async function getPriceList(companyId: string, listId: string): Promise<PriceList> {
  return get<PriceList>(`/companies/${companyId}/price-lists/${listId}`);
}

export async function createPriceList(companyId: string, data: CreatePriceListData): Promise<PriceList> {
  return post<PriceList>(`/companies/${companyId}/price-lists`, data);
}

export async function updatePriceList(companyId: string, listId: string, data: UpdatePriceListData): Promise<PriceList> {
  return patch<PriceList>(`/companies/${companyId}/price-lists/${listId}`, data);
}

export async function deletePriceList(companyId: string, listId: string): Promise<void> {
  return del(`/companies/${companyId}/price-lists/${listId}`);
}

// ── Per-product overrides ──────────────────────────────────────────────────────

export async function addPriceListItem(
  companyId: string,
  listId: string,
  data: AddPriceListItemData,
): Promise<PriceListItem> {
  return post<PriceListItem>(`/companies/${companyId}/price-lists/${listId}/items`, data);
}

export async function removePriceListItem(companyId: string, listId: string, itemId: string): Promise<void> {
  return del(`/companies/${companyId}/price-lists/${listId}/items/${itemId}`);
}

// ── Customer assignments ────────────────────────────────────────────────────────

export async function setAssignment(
  companyId: string,
  listId: string,
  buyerBusinessId: string,
): Promise<PriceListAssignment> {
  return put<PriceListAssignment>(`/companies/${companyId}/price-lists/${listId}/assignments`, { buyerBusinessId });
}

export async function removeAssignment(companyId: string, listId: string, buyerBusinessId: string): Promise<void> {
  return del(`/companies/${companyId}/price-lists/${listId}/assignments/${buyerBusinessId}`);
}

// ── Resolution preview (used by the order/invoice UI) ───────────────────────────

export async function resolvePrice(
  companyId: string,
  params: { productId: string; buyerBusinessId?: string; qty?: number; unit?: string; manualPriceListId?: string },
): Promise<ResolvedPrice> {
  return get<ResolvedPrice>(`/companies/${companyId}/price-lists/resolve`, {
    productId: params.productId,
    buyerBusinessId: params.buyerBusinessId,
    qty: params.qty,
    unit: params.unit,
    manualPriceListId: params.manualPriceListId,
  });
}

// ── Customer pool (accepted business connections) ───────────────────────────────

export interface ConnectedBusiness {
  connectionId: string;
  business: { id: string; name: string; logoUrl?: string | null };
  connectedAt: string;
}

export async function getConnectedBusinesses(businessId: string): Promise<ConnectedBusiness[]> {
  return get<ConnectedBusiness[]>(`/business-connections/${businessId}`);
}
