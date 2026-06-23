/**
 * Profile Service
 *
 * Domain service for moderation actions taken from a profile screen:
 * reporting a user/business and blocking/unblocking a user.
 * Mirrors the product report flow (see products.service.reportProduct).
 *
 * Backend endpoints:
 * - POST   /api/reports                  { targetType, targetId, reason, details? }
 * - POST   /api/users/:userId/block
 * - DELETE /api/users/:userId/block
 */
import { post, del } from '@/shared/services/api';

export type ReportTargetType = 'user' | 'business';
export type ReportReason =
  | 'inappropriate'
  | 'spam'
  | 'harassment'
  | 'impersonation'
  | 'scam'
  | 'other';

/** Reason options for the report bottom sheet (must match backend REPORT_REASONS). */
export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'inappropriate', label: 'Inappropriate content' },
  { id: 'spam', label: 'Spam or misleading' },
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'impersonation', label: 'Impersonation' },
  { id: 'scam', label: 'Scam or fraud' },
  { id: 'other', label: 'Other' },
];

/** Report a user or business for moderation review. */
export async function reportEntity(
  targetType: ReportTargetType,
  targetId: string,
  reason: ReportReason,
  details?: string,
): Promise<{ id: string }> {
  return post<{ id: string }>('/reports', { targetType, targetId, reason, details });
}

/** Block a user (also removes any connection; hides them from your chat/connection lists). */
export async function blockUser(userId: string): Promise<void> {
  await post<null>(`/users/${userId}/block`);
}

/** Unblock a previously blocked user. */
export async function unblockUser(userId: string): Promise<void> {
  await del<null>(`/users/${userId}/block`);
}
