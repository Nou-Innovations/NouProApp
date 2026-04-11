/**
 * Transports Service
 *
 * Domain service for transport/vehicle management.
 */

import { get, post, patch, del } from '@/shared/services/api';
import type { Transport, CreateTransportPayload, UpdateTransportPayload } from '@/shared/types/transport';

export async function getTransports(companyId: string): Promise<Transport[]> {
  return get<Transport[]>(`/companies/${companyId}/transports`);
}

export async function createTransport(
  companyId: string,
  payload: CreateTransportPayload
): Promise<Transport> {
  return post<Transport>(`/companies/${companyId}/transports`, payload);
}

export async function updateTransport(
  companyId: string,
  transportId: string,
  payload: UpdateTransportPayload
): Promise<Transport> {
  return patch<Transport>(`/companies/${companyId}/transports/${transportId}`, payload);
}

export async function deleteTransport(companyId: string, transportId: string): Promise<void> {
  await del(`/companies/${companyId}/transports/${transportId}`);
}

const transportsService = {
  getTransports,
  createTransport,
  updateTransport,
  deleteTransport,
};

export default transportsService;
