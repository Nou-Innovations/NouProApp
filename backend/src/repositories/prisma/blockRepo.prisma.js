/**
 * Block Repository - Prisma Implementation
 * One-directional user blocks. Enforcement treats a block in EITHER direction as mutual.
 */
const { prisma } = require('../../db/prisma');

/** Create (or no-op if already present) a block from blockerId -> blockedId. */
async function blockUser(blockerId, blockedId) {
  return prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    update: {},
    create: { blockerId, blockedId },
  });
}

/** Remove a block from blockerId -> blockedId. Returns true if a row was deleted. */
async function unblockUser(blockerId, blockedId) {
  try {
    await prisma.block.delete({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * True if either user has blocked the other.
 * Read path is used by core flows (connections/chat), so it degrades to `false` rather than
 * throwing if the Block table is somehow unavailable (e.g. migration not yet applied).
 */
async function isBlocked(userA, userB) {
  try {
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      },
    });
    return !!block;
  } catch (e) {
    console.error('[blockRepo.isBlocked] failed, treating as not blocked:', e?.message);
    return false;
  }
}

/**
 * All user ids involved in a block with `userId` (in either direction).
 * Degrades to `[]` if the Block table is unavailable so list endpoints never 500.
 */
async function getBlockedIds(userId) {
  try {
    const blocks = await prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    const ids = new Set();
    for (const b of blocks) {
      ids.add(b.blockerId === userId ? b.blockedId : b.blockerId);
    }
    return Array.from(ids);
  } catch (e) {
    console.error('[blockRepo.getBlockedIds] failed, returning empty:', e?.message);
    return [];
  }
}

/** Users that `userId` has explicitly blocked (with profile data). */
async function listBlocked(userId) {
  return prisma.block.findMany({
    where: { blockerId: userId },
    include: { blocked: true },
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = {
  blockUser,
  unblockUser,
  isBlocked,
  getBlockedIds,
  listBlocked,
};
