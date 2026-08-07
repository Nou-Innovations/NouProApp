import { get, post, patch, del } from '@/shared/services/api';

/**
 * Connection actions — both user↔user and business↔business.
 *
 * The user-to-user endpoints below all existed on the backend with ZERO frontend
 * callers, which is why there was no way to see a pending request, cancel one you
 * sent, disconnect, or unblock anyone.
 */

export interface PendingConnection {
  /** The CONNECTION id (not the sender's user id) — this is what accept/reject take. */
  connectionId: string;
  sender: { id: string; name?: string; avatar?: string; jobTitle?: string };
  requestedAt: string;
}

export interface BlockedUser {
  blockedAt: string;
  user: { id: string; name?: string; avatar?: string; jobTitle?: string };
}

/** Connection requests addressed to me and still awaiting a decision. */
export async function getPendingConnectionRequests(): Promise<PendingConnection[]> {
  return get<PendingConnection[]>('/connections/pending');
}

/** Accept an incoming request. Note the verb: the backend registers PATCH, not POST. */
export async function acceptConnection(connectionId: string): Promise<void> {
  await patch(`/connections/${connectionId}/accept`, {});
}

/** Decline an incoming request. */
export async function rejectConnection(connectionId: string): Promise<void> {
  await patch(`/connections/${connectionId}/reject`, {});
}

/**
 * Remove a connection. The backend authorizes EITHER party, so this covers both
 * "cancel the request I sent" and "disconnect from someone".
 */
export async function removeConnection(connectionId: string): Promise<void> {
  await del(`/connections/${connectionId}`);
}

/** Users this account has blocked. */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  return get<BlockedUser[]>('/blocks');
}

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

export async function declineBusinessConnectionRequest(
  connectionId: string,
): Promise<{ id: string; status: string }> {
  return patch(`/business-connections/${connectionId}/reject`, {});
}

/**
 * Remove a business connection (canonical Group-A route). The backend authorizes either
 * party, so this covers both "cancel a request we sent" and "disconnect a partner".
 */
export async function removeBusinessConnection(connectionId: string): Promise<void> {
  await del(`/business-connections/${connectionId}`);
}

/** Accepted partner companies of my business. */
export interface BusinessConnection {
  connectionId: string;
  business: {
    id: string;
    name?: string;
    logoUrl?: string | null;
    industry?: string | null;
    description?: string | null;
    isDeleted?: boolean;
  };
  connectedAt?: string;
}

export async function getBusinessConnections(myBusinessId: string): Promise<BusinessConnection[]> {
  return get<BusinessConnection[]>(`/business-connections/${myBusinessId}`);
}

/** Incoming partner requests still awaiting my company's decision. */
export interface PendingBusinessConnection {
  connectionId: string;
  requesterBusiness: {
    id: string;
    name?: string;
    logoUrl?: string | null;
    industry?: string | null;
    description?: string | null;
  };
  requestedAt: string;
}

export async function getPendingBusinessConnections(
  myBusinessId: string,
): Promise<PendingBusinessConnection[]> {
  return get<PendingBusinessConnection[]>(`/business-connections/${myBusinessId}/pending`);
}
