/**
 * Returns Service — the single boundary for return (RMA) API calls.
 */
import { get, post, patch, del } from '@/shared/services/api';
import { Return, CreateReturnData, ReturnStatus, ReturnItem } from '@/shared/types/return';

export async function getReturns(companyId: string, status?: ReturnStatus): Promise<Return[]> {
  return get<Return[]>(`/companies/${companyId}/returns`, status ? { status } : undefined);
}

export async function getReturn(companyId: string, returnId: string): Promise<Return> {
  return get<Return>(`/companies/${companyId}/returns/${returnId}`);
}

export async function createReturn(companyId: string, data: CreateReturnData): Promise<Return> {
  return post<Return>(`/companies/${companyId}/returns`, data);
}

export async function updateReturn(
  companyId: string,
  returnId: string,
  data: Partial<{ items: ReturnItem[]; reason: string | null; locationId: string | null; customerName: string | null; creditNoteId: string | null }>
): Promise<Return> {
  return patch<Return>(`/companies/${companyId}/returns/${returnId}`, data);
}

export async function changeReturnStatus(
  companyId: string,
  returnId: string,
  status: ReturnStatus,
  reason?: string
): Promise<Return> {
  return patch<Return>(`/companies/${companyId}/returns/${returnId}/status`, { status, ...(reason ? { reason } : {}) });
}

export async function deleteReturn(companyId: string, returnId: string): Promise<void> {
  return del(`/companies/${companyId}/returns/${returnId}`);
}

const returnsService = { getReturns, getReturn, createReturn, updateReturn, changeReturnStatus, deleteReturn };
export default returnsService;
