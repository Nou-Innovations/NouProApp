/**
 * Feedback service — community suggestions board.
 * All HTTP goes through the shared api.ts helpers (base URL already includes /api).
 */
import { get, post } from '@/shared/services/api';
import { ALL_CATEGORY_ID } from '../types';
import type { Suggestion, CreateSuggestionDTO, VoteResult, SuggestionSort } from '../types';

export async function getSuggestions(opts?: {
  categoryId?: string;
  sort?: SuggestionSort;
}): Promise<Suggestion[]> {
  const categoryId =
    opts?.categoryId && opts.categoryId !== ALL_CATEGORY_ID ? opts.categoryId : undefined;
  return get<Suggestion[]>('/suggestions', { categoryId, sort: opts?.sort });
}

export async function createSuggestion(data: CreateSuggestionDTO): Promise<Suggestion> {
  return post<Suggestion>('/suggestions', data);
}

export async function toggleVote(suggestionId: string): Promise<VoteResult> {
  return post<VoteResult>(`/suggestions/${suggestionId}/vote`);
}
