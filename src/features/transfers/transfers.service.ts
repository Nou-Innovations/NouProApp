/**
 * Transfers Service — the single boundary for transfer API calls (new Transfer entity).
 */
import { get, post, patch, del } from '@/shared/services/api';
import { Transfer, CreateTransferData, TransferStatus, TransferStatusHistoryEntry } from '@/shared/types/transfer';

export async function getTransfers(companyId: string, status?: TransferStatus): Promise<Transfer[]> {
  return get<Transfer[]>(`/companies/${companyId}/transfers`, status ? { status } : undefined);
}

export async function getTransfer(companyId: string, transferId: string): Promise<Transfer> {
  return get<Transfer>(`/companies/${companyId}/transfers/${transferId}`);
}

export async function getTransferHistory(companyId: string, transferId: string): Promise<TransferStatusHistoryEntry[]> {
  return get<TransferStatusHistoryEntry[]>(`/companies/${companyId}/transfers/${transferId}/history`);
}

export async function createTransfer(companyId: string, data: CreateTransferData): Promise<Transfer> {
  return post<Transfer>(`/companies/${companyId}/transfers`, data);
}

export async function updateTransfer(
  companyId: string,
  transferId: string,
  data: Partial<Pick<Transfer, 'items' | 'itemCount' | 'totalAmount' | 'assignedStaffId' | 'transportId' | 'trackingNumber' | 'notes' | 'priority' | 'expectedAt'>>
): Promise<Transfer> {
  return patch<Transfer>(`/companies/${companyId}/transfers/${transferId}`, data);
}

export async function changeTransferStatus(
  companyId: string,
  transferId: string,
  status: TransferStatus,
  reason?: string
): Promise<Transfer> {
  return patch<Transfer>(`/companies/${companyId}/transfers/${transferId}/status`, { status, ...(reason ? { reason } : {}) });
}

export interface ReceiveTransferItem {
  productId: string;
  quantityReceived: number;
  quantityDamaged?: number;
}

/** Receive a transfer with per-item received/damaged quantities (sets status Received). */
export async function receiveTransfer(
  companyId: string,
  transferId: string,
  items: ReceiveTransferItem[]
): Promise<Transfer> {
  return patch<Transfer>(`/companies/${companyId}/transfers/${transferId}/receive`, { items });
}

export async function deleteTransfer(companyId: string, transferId: string): Promise<void> {
  return del(`/companies/${companyId}/transfers/${transferId}`);
}

const transfersService = {
  getTransfers, getTransfer, getTransferHistory, createTransfer, updateTransfer, changeTransferStatus, receiveTransfer, deleteTransfer,
};
export default transfersService;
