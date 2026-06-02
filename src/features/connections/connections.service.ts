import { post, patch } from '@/shared/services/api';

/**
 * Business-to-business connection actions (used by the OTHER_BUSINESS profile screen
 * when the viewer is in Business mode). User-to-user connection calls live inline in
 * UserProfileScreen via the /connections endpoints.
 */

export async function sendBusinessConnectionRequest(
  requesterBusinessId: string,
  targetBusinessId: string,
): Promise<{ id: string; status: string }> {
  return post('/business-connections/request', { requesterBusinessId, targetBusinessId });
}

export async function acceptBusinessConnectionRequest(
  connectionId: string,
): Promise<{ id: string; status: string }> {
  return patch(`/business-connections/${connectionId}/accept`, {});
}
