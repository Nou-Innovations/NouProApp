/**
 * Discounts Service
 *
 * Seller-run promotions + coupon codes. Company-scoped:
 * /api/companies/:companyId/discounts. Applied server-side by the price engine.
 * `code` null = automatic promotion; `code` set = coupon entered at checkout.
 * Creating/editing is gated to Pro+ (enforced backend-side).
 */

import { get, post, patch, del } from '@/shared/services/api';

export type DiscountType = 'PERCENTAGE' | 'FIXED';
export type DiscountScope = 'ALL' | 'PRODUCTS' | 'CATEGORY';

export interface Discount {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  type: DiscountType;
  value: number;
  scope: DiscountScope;
  productIds?: string[] | null;
  categories?: string[] | null;
  code?: string | null;
  minOrderAmount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  maxUses?: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscountData {
  name: string;
  description?: string;
  type: DiscountType;
  value: number;
  scope: DiscountScope;
  productIds?: string[];
  categories?: string[];
  code?: string | null;
  minOrderAmount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  maxUses?: number | null;
  isActive?: boolean;
}

export type UpdateDiscountData = Partial<CreateDiscountData>;

export async function getDiscounts(companyId: string): Promise<Discount[]> {
  return get<Discount[]>(`/companies/${companyId}/discounts`);
}

export async function getDiscount(companyId: string, id: string): Promise<Discount> {
  return get<Discount>(`/companies/${companyId}/discounts/${id}`);
}

export async function createDiscount(companyId: string, data: CreateDiscountData): Promise<Discount> {
  return post<Discount>(`/companies/${companyId}/discounts`, data);
}

export async function updateDiscount(companyId: string, id: string, data: UpdateDiscountData): Promise<Discount> {
  return patch<Discount>(`/companies/${companyId}/discounts/${id}`, data);
}

export async function deleteDiscount(companyId: string, id: string): Promise<void> {
  return del(`/companies/${companyId}/discounts/${id}`);
}

/** Validate a coupon code at checkout. Resolves the active discount or throws (404). */
export async function validateDiscountCode(companyId: string, code: string): Promise<Discount> {
  return post<Discount>(`/companies/${companyId}/discounts/validate`, { code });
}
