/**
 * Transports Service
 *
 * Domain service for transport/vehicle management.
 */

import { get, post, del } from '@/shared/services/api';
import type { Transport, CreateTransportPayload } from '@/shared/types/transport';

export async function getTransports(companyId: string): Promise<Transport[]> {
  return get<Transport[]>(`/companies/${companyId}/transports`);
}

export async function createTransport(
  companyId: string,
  payload: CreateTransportPayload
): Promise<Transport> {
  return post<Transport>(`/companies/${companyId}/transports`, payload);
}

export async function deleteTransport(companyId: string, transportId: string): Promise<void> {
  await del(`/companies/${companyId}/transports/${transportId}`);
}

const transportsService = {
  getTransports,
  createTransport,
  deleteTransport,
};

export default transportsService;
