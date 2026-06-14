/**
 * Issues Service — the single boundary for issue API calls.
 */
import { get, post, patch, del } from '@/shared/services/api';
import { Issue, CreateIssueData, IssueStatus } from '@/shared/types/issue';

export async function getIssues(companyId: string, status?: IssueStatus): Promise<Issue[]> {
  return get<Issue[]>(`/companies/${companyId}/issues`, status ? { status } : undefined);
}

export async function getIssue(companyId: string, issueId: string): Promise<Issue> {
  return get<Issue>(`/companies/${companyId}/issues/${issueId}`);
}

export async function createIssue(companyId: string, data: CreateIssueData): Promise<Issue> {
  return post<Issue>(`/companies/${companyId}/issues`, data);
}

export async function updateIssue(
  companyId: string,
  issueId: string,
  data: Partial<Pick<Issue, 'status' | 'priority' | 'assignedTo' | 'note' | 'resolution' | 'photoUrl'>>
): Promise<Issue> {
  return patch<Issue>(`/companies/${companyId}/issues/${issueId}`, data);
}

export async function deleteIssue(companyId: string, issueId: string): Promise<void> {
  return del(`/companies/${companyId}/issues/${issueId}`);
}

const issuesService = { getIssues, getIssue, createIssue, updateIssue, deleteIssue };
export default issuesService;
