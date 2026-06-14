/**
 * useIssues — loads issues for the current company with a status segment filter.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Issue, IssueStatus } from '@/shared/types/issue';
import { getIssues, updateIssue } from '../issues.service';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';

export type IssueSegment = 'open' | 'investigating' | 'resolved' | 'all';

export function useIssues() {
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const companyId = activeBusiness?.id || '';

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<IssueSegment>('open');

  const load = useCallback(async (isRefresh = false) => {
    if (!companyId) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const rows = await getIssues(companyId);
      setIssues(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load issues');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  const refresh = useCallback(() => load(true), [load]);

  const filtered = useMemo(() => {
    if (segment === 'all') return issues;
    return issues.filter((i) => i.status === segment);
  }, [issues, segment]);

  const openCount = useMemo(() => issues.filter((i) => i.status !== 'resolved').length, [issues]);

  const setStatus = useCallback(async (issueId: string, status: IssueStatus, resolution?: string) => {
    const updated = await updateIssue(companyId, issueId, { status, ...(resolution ? { resolution } : {}) });
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, ...updated } : i)));
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  return { issues, filtered, loading, refreshing, error, refresh, segment, setSegment, openCount, setStatus };
}

export default useIssues;
