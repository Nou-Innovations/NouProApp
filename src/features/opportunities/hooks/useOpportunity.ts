import { useCallback, useEffect, useState } from 'react';
import {
  getOpportunity,
  getOpportunityResponses,
  type Opportunity,
  type OpportunityResponseItem,
} from '../opportunities.service';

/**
 * Loads a single opportunity and its responses. Responses are owner-only on the
 * backend (403 for others) — the failure is swallowed so non-owners just get [].
 */
export function useOpportunity(id: string) {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [responses, setResponses] = useState<OpportunityResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const opp = await getOpportunity(id);
      setOpportunity(opp);
      try {
        setResponses(await getOpportunityResponses(id));
      } catch {
        setResponses([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load opportunity');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { opportunity, responses, loading, error, refresh: load };
}

export default useOpportunity;
