/**
 * Suggestion Repository - Prisma Implementation
 * Powers the community feedback board (global, scoped by user — not company).
 */
const { prisma } = require('../../db/prisma');
const { v4: uuidv4 } = require('uuid');

const AUTHOR_SELECT = { id: true, name: true, avatar: true };

// Shape a Prisma suggestion (with author + counts) into the API contract the app expects.
function mapSuggestion(s, hasVoted) {
  return {
    id: s.id,
    categoryId: s.categoryId,
    text: s.text,
    userId: s.userId,
    userName: s.user?.name ?? 'Member',
    userAvatar: s.user?.avatar ?? null,
    votes: s._count?.votes ?? 0,
    hasVoted,
    createdAt: s.createdAt,
  };
}

/**
 * List suggestions for the board.
 * Aggregate vote count + the current user's vote state are fetched in ONE query (no N+1).
 * @param {{ userId: string, categoryId?: string, sort?: 'top'|'new' }} opts
 */
async function list({ userId, categoryId, sort = 'top' }) {
  const where = {};
  if (categoryId) where.categoryId = categoryId;

  const rows = await prisma.suggestion.findMany({
    where,
    include: {
      user: { select: AUTHOR_SELECT },
      _count: { select: { votes: true } },
      votes: { where: { userId }, select: { id: true } }, // [] => not voted by this user
    },
    orderBy: { createdAt: 'desc' },
  });

  const mapped = rows.map((s) => mapSuggestion(s, s.votes.length > 0));

  if (sort === 'top') {
    // Rank by vote count desc; tiebreak by newest first.
    mapped.sort((a, b) => b.votes - a.votes || (a.createdAt < b.createdAt ? 1 : -1));
  }
  return mapped;
}

async function getById(id) {
  return prisma.suggestion.findUnique({ where: { id } });
}

async function create({ userId, categoryId, text }) {
  const s = await prisma.suggestion.create({
    data: { id: `sg-${uuidv4()}`, userId, categoryId, text },
    include: { user: { select: AUTHOR_SELECT }, _count: { select: { votes: true } } },
  });
  return mapSuggestion(s, false);
}

/**
 * Toggle the current user's vote on a suggestion.
 * Create if absent, delete if present. The @@unique([suggestionId, userId]) constraint
 * is the race-condition backstop. Returns the fresh { hasVoted, votes } state.
 */
async function toggleVote({ userId, suggestionId }) {
  const existing = await prisma.suggestionVote.findUnique({
    where: { suggestionId_userId: { suggestionId, userId } },
  });

  if (existing) {
    await prisma.suggestionVote.delete({ where: { id: existing.id } });
  } else {
    await prisma.suggestionVote.create({
      data: { id: `sv-${uuidv4()}`, suggestionId, userId },
    });
  }

  const votes = await prisma.suggestionVote.count({ where: { suggestionId } });
  return { hasVoted: !existing, votes };
}

module.exports = { list, getById, create, toggleVote };
