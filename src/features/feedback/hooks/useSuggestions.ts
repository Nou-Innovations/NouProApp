/**
 * useSuggestions Hook
 *
 * Connects the community board to suggestion data.
 * - Fetches suggestions (server-side category filter + top/new sort)
 * - Pull-to-refresh
 * - Optimistic voting with rollback on error
 * - Create suggestion (then refresh so the board re-sorts)
 *
 * Follows the useTasks / useDeliveries pattern.
 */
import { useState, useEffect, useCallback } from 'react';
import { ApiError } from '@/shared/services/api';
import { getSuggestions, createSuggestion, toggleVote } from '../services/feedbackService';
import { ALL_CATEGORY_ID } from '../types';
import type { Suggestion, SuggestionSort, CreateSuggestionDTO } from '../types';

interface UseSuggestionsResult {
  suggestions: Suggestion[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  categoryId: string;
  sort: SuggestionSort;
  setCategoryId: (id: string) => void;
  setSort: (sort: SuggestionSort) => void;
  refresh: () => Promise<void>;
  vote: (id: string) => Promise<void>;
  addSuggestion: (dto: CreateSuggestionDTO) => Promise<Suggestion>;
}

export function useSuggestions(): UseSuggestionsResult {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>(ALL_CATEGORY_ID);
  const [sort, setSort] = useState<SuggestionSort>('top');

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await getSuggestions({ categoryId, sort });
        setSuggestions(data);
      } catch (e) {
        const message =
          e instanceof ApiError ? e.message : 'Failed to load suggestions';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [categoryId, sort]
  );

  // Refetch whenever the category filter or sort changes (and on mount).
  useEffect(() => {
    load('initial');
  }, [load]);

  const refresh = useCallback(() => load('refresh'), [load]);

  // Optimistic vote: flip locally first, reconcile with the server, roll back on error.
  const vote = useCallback(
    async (id: string) => {
      const snapshot = suggestions;
      const optimistic = suggestions.map((s) =>
        s.id === id
          ? { ...s, hasVoted: !s.hasVoted, votes: s.hasVoted ? s.votes - 1 : s.votes + 1 }
          : s
      );
      setSuggestions(optimistic);
      try {
        const result = await toggleVote(id);
        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, hasVoted: result.hasVoted, votes: result.votes } : s
          )
        );
      } catch {
        setSuggestions(snapshot); // rollback
      }
    },
    [suggestions]
  );

  const addSuggestion = useCallback(
    async (dto: CreateSuggestionDTO) => {
      const created = await createSuggestion(dto);
      await load('refresh');
      return created;
    },
    [load]
  );

  return {
    suggestions,
    loading,
    refreshing,
    error,
    categoryId,
    sort,
    setCategoryId,
    setSort,
    refresh,
    vote,
    addSuggestion,
  };
}
