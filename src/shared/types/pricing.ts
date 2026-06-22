/**
 * Price Lists — customer-specific pricing types.
 *
 * A PriceList belongs to a SELLER business. It carries an optional list-wide
 * discountPercent plus per-product fixed-price overrides (PriceListItem), and is
 * applied to customer businesses via PriceListAssignment (auto) or manual selection.
 * Resolution precedence: per-product fixed override > list discountPercent > base price.
 */

export type PriceSource = 'item_fixed' | 'list_discount' | 'base' | 'client';

export interface PriceListItem {
  id: string;
  priceListId: string;
  productId: string;
  fixedPrice?: number | null;
  fixedPricePerCarton?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PriceListAssignment {
  id: string;
  priceListId: string;
  sellerBusinessId: string;
  buyerBusinessId: string;
  createdAt?: string;
}

export interface PriceList {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  discountPercent?: number | null;
  currency?: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
  items?: PriceListItem[];
  assignments?: PriceListAssignment[];
  _count?: { items: number; assignments: number };
}

export interface CreatePriceListData {
  name: string;
  description?: string | null;
  discountPercent?: number | null;
  currency?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
}

export type UpdatePriceListData = Partial<CreatePriceListData>;

export interface AddPriceListItemData {
  productId: string;
  fixedPrice?: number | null;
  fixedPricePerCarton?: number | null;
}

/** Result of the price-resolution preview endpoint. */
export interface ResolvedPrice {
  priceListId: string | null;
  priceListName: string | null;
  unitPrice: number;
  basePrice: number | null;
  priceSource: PriceSource;
}
