/**
 * Per-viewer chat serialization helpers.
 *
 * Extracted verbatim from server.js (Phase 1 modularization). Normalizes the
 * stored lastMessage shape and resolves the per-viewer display name/avatar for
 * 1:1 (direct) chats. `serializeChats*` need a batched user lookup, so the
 * module is a factory that receives `repos` (uses repos.userRepo.getByIds).
 *
 * @param {object} repos - repository registry (uses repos.userRepo)
 */
module.exports = (repos) => {
  /**
   * Normalize a stored lastMessage into the canonical inbox-preview shape.
   * Legacy rows use { text, sender }; runtime/socket uses { content, senderName }.
   */
  function normalizeLastMessage(lm) {
    if (!lm || typeof lm !== 'object') return lm ?? null;
    return {
      ...lm,
      content: lm.content != null ? lm.content : (lm.text != null ? lm.text : ''),
      senderName: lm.senderName != null ? lm.senderName : (lm.sender != null ? lm.sender : ''),
      type: lm.type || 'text',
    };
  }

  const otherParticipantId = (chat, viewerUserId) => {
    const parts = Array.isArray(chat.participants) ? chat.participants : [];
    return parts
      .map(p => (typeof p === 'string' ? p : (p && (p.userId || p.id))))
      .find(pid => pid && pid !== viewerUserId);
  };

  const applyViewerDisplay = (chat, otherUser) => {
    const base = { ...chat, lastMessage: normalizeLastMessage(chat.lastMessage) };
    // Only 1:1 (direct) chats get a per-viewer name/avatar. Groups/client/supplier
    // keep their stored name. Unknown "other" (e.g. company-to-company) → unchanged.
    if (chat.type !== 'direct' || !otherUser) return base;
    return {
      ...base,
      name: otherUser.name || chat.name || 'Unknown',
      avatar: otherUser.avatar || chat.avatar || null,
    };
  };

  /**
   * Serialize a list of chats for one viewer: normalizes lastMessage for every
   * chat and resolves the per-viewer display name/avatar for 1:1 (direct) chats.
   * Uses a single batched user lookup (no N+1).
   */
  async function serializeChatsForViewer(chats, viewerUserId) {
    const otherIds = new Set();
    for (const c of chats) {
      if (c.type !== 'direct') continue;
      const otherId = otherParticipantId(c, viewerUserId);
      if (otherId) otherIds.add(otherId);
    }

    let userById = new Map();
    if (otherIds.size > 0) {
      const users = await repos.userRepo.getByIds([...otherIds]);
      userById = new Map(users.map(u => [u.id, u]));
    }

    return chats.map(c =>
      applyViewerDisplay(c, userById.get(otherParticipantId(c, viewerUserId)))
    );
  }

  /**
   * Serialize a single chat for one viewer — used by real-time socket emits so a
   * newly created direct chat shows the correct name to each recipient.
   */
  async function serializeChatForViewer(chat, viewerUserId) {
    let otherUser = null;
    if (chat.type === 'direct') {
      const otherId = otherParticipantId(chat, viewerUserId);
      if (otherId) {
        const [u] = await repos.userRepo.getByIds([otherId]);
        otherUser = u || null;
      }
    }
    return applyViewerDisplay(chat, otherUser);
  }

  return {
    normalizeLastMessage,
    otherParticipantId,
    applyViewerDisplay,
    serializeChatsForViewer,
    serializeChatForViewer,
  };
};
