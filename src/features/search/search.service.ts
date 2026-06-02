/**
 * Search Service
 *
 * Thin wrappers over the existing backend search endpoints. `get<T>` already
 * unwraps the `{ success, data }` envelope, so these return arrays directly.
 */

import { get } from '@/shared/services/api';

export interface UserSearchResult {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface CompanySearchResult {
  id: string;
  name: string;
  logoUrl?: string;
  industry?: string;
  category?: string;
  description?: string;
}

/** Search users by name/email (backend excludes the current user). */
export async function searchUsers(q: string): Promise<UserSearchResult[]> {
  if (!q.trim()) return [];
  return get<UserSearchResult[]>('/users/search', { q });
}

/** Search published businesses by name/industry/category. */
export async function searchCompanies(q: string): Promise<CompanySearchResult[]> {
  if (!q.trim()) return [];
  return get<CompanySearchResult[]>('/companies/search', { q });
}
