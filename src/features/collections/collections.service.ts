/**
 * Collections Service
 *
 * Internal product groupings. All endpoints are company-scoped:
 * /api/companies/:companyId/collections. A product can belong to many collections
 * via the CollectionProduct join. Free plan is capped at 3 collections (enforced
 * server-side; previewed client-side via maxCollectionsForPlan).
 */

import { get, post, patch, del } from '@/shared/services/api';

export interface CollectionProductItem {
  id: string;
  collectionId: string;
  productId: string;
  displayOrder: number;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    productPicture?: string | null;
    price?: number | null;
    brand?: string | null;
  } | null;
}

export interface Collection {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  coverImage?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  products?: CollectionProductItem[];
  _count?: { products: number };
}

export interface CreateCollectionData {
  name: string;
  description?: string;
  coverImage?: string;
  isActive?: boolean;
}

export interface UpdateCollectionData {
  name?: string;
  description?: string;
  coverImage?: string;
  isActive?: boolean;
}

export async function getCollections(companyId: string): Promise<Collection[]> {
  return get<Collection[]>(`/companies/${companyId}/collections`);
}

export async function getCollection(companyId: string, collectionId: string): Promise<Collection> {
  return get<Collection>(`/companies/${companyId}/collections/${collectionId}`);
}

export async function createCollection(companyId: string, data: CreateCollectionData): Promise<Collection> {
  return post<Collection>(`/companies/${companyId}/collections`, data);
}

export async function updateCollection(
  companyId: string,
  collectionId: string,
  data: UpdateCollectionData,
): Promise<Collection> {
  return patch<Collection>(`/companies/${companyId}/collections/${collectionId}`, data);
}

export async function deleteCollection(companyId: string, collectionId: string): Promise<void> {
  return del(`/companies/${companyId}/collections/${collectionId}`);
}

/** Add one or more products to a collection. Returns the refreshed collection. */
export async function addCollectionProducts(
  companyId: string,
  collectionId: string,
  productIds: string[],
): Promise<Collection> {
  return post<Collection>(`/companies/${companyId}/collections/${collectionId}/products`, { productIds });
}

export async function removeCollectionProduct(
  companyId: string,
  collectionId: string,
  productId: string,
): Promise<void> {
  return del(`/companies/${companyId}/collections/${collectionId}/products/${productId}`);
}
