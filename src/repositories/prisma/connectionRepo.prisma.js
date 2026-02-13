/**
 * Connection Repository - Prisma Implementation
 * Handles both UserConnection and BusinessConnection operations
 */
const { prisma } = require('../../db/prisma');

// ============================================================================
// USER CONNECTIONS
// ============================================================================

async function sendRequest(senderId, receiverId) {
  return prisma.userConnection.create({
    data: { senderId, receiverId, status: 'pending' },
  });
}

async function acceptRequest(connectionId) {
  return prisma.userConnection.update({
    where: { id: connectionId },
    data: { status: 'accepted' },
  });
}

async function rejectRequest(connectionId) {
  return prisma.userConnection.update({
    where: { id: connectionId },
    data: { status: 'rejected' },
  });
}

async function removeConnection(id) {
  try {
    await prisma.userConnection.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
}

async function getById(id) {
  return prisma.userConnection.findUnique({
    where: { id },
    include: { sender: true, receiver: true },
  });
}

async function areConnected(userA, userB) {
  const conn = await prisma.userConnection.findFirst({
    where: {
      status: 'accepted',
      OR: [
        { senderId: userA, receiverId: userB },
        { senderId: userB, receiverId: userA },
      ],
    },
  });
  return !!conn;
}

async function getStatus(userA, userB) {
  const conn = await prisma.userConnection.findFirst({
    where: {
      OR: [
        { senderId: userA, receiverId: userB },
        { senderId: userB, receiverId: userA },
      ],
    },
  });
  if (!conn) return null;
  return {
    id: conn.id,
    status: conn.status,
    direction: conn.senderId === userA ? 'sent' : 'received',
  };
}

async function countByUserId(userId) {
  return prisma.userConnection.count({
    where: {
      status: 'accepted',
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
  });
}

async function listByUserId(userId, status = 'accepted') {
  return prisma.userConnection.findMany({
    where: {
      status,
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    include: { sender: true, receiver: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function listPending(userId) {
  return prisma.userConnection.findMany({
    where: { receiverId: userId, status: 'pending' },
    include: { sender: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function findExisting(userA, userB) {
  return prisma.userConnection.findFirst({
    where: {
      OR: [
        { senderId: userA, receiverId: userB },
        { senderId: userB, receiverId: userA },
      ],
    },
  });
}

// ============================================================================
// BUSINESS CONNECTIONS
// ============================================================================

async function sendBusinessRequest(requesterBusinessId, targetBusinessId) {
  return prisma.businessConnection.create({
    data: { requesterBusinessId, targetBusinessId, status: 'pending' },
  });
}

async function acceptBusinessRequest(connectionId) {
  return prisma.businessConnection.update({
    where: { id: connectionId },
    data: { status: 'accepted' },
  });
}

async function rejectBusinessRequest(connectionId) {
  return prisma.businessConnection.update({
    where: { id: connectionId },
    data: { status: 'rejected' },
  });
}

async function removeBusinessConnection(id) {
  try {
    await prisma.businessConnection.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
}

async function getBusinessConnectionById(id) {
  return prisma.businessConnection.findUnique({
    where: { id },
    include: { requesterBusiness: true, targetBusiness: true },
  });
}

async function areBusinessesConnected(bizA, bizB) {
  const conn = await prisma.businessConnection.findFirst({
    where: {
      status: 'accepted',
      OR: [
        { requesterBusinessId: bizA, targetBusinessId: bizB },
        { requesterBusinessId: bizB, targetBusinessId: bizA },
      ],
    },
  });
  return !!conn;
}

async function getBusinessConnectionStatus(bizA, bizB) {
  const conn = await prisma.businessConnection.findFirst({
    where: {
      OR: [
        { requesterBusinessId: bizA, targetBusinessId: bizB },
        { requesterBusinessId: bizB, targetBusinessId: bizA },
      ],
    },
  });
  if (!conn) return null;
  return {
    id: conn.id,
    status: conn.status,
    direction: conn.requesterBusinessId === bizA ? 'sent' : 'received',
  };
}

async function countBusinessConnections(businessId) {
  return prisma.businessConnection.count({
    where: {
      status: 'accepted',
      OR: [
        { requesterBusinessId: businessId },
        { targetBusinessId: businessId },
      ],
    },
  });
}

async function listBusinessConnections(businessId, status = 'accepted') {
  return prisma.businessConnection.findMany({
    where: {
      status,
      OR: [
        { requesterBusinessId: businessId },
        { targetBusinessId: businessId },
      ],
    },
    include: { requesterBusiness: true, targetBusiness: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function listPendingBusinessRequests(businessId) {
  return prisma.businessConnection.findMany({
    where: { targetBusinessId: businessId, status: 'pending' },
    include: { requesterBusiness: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function findExistingBusinessConnection(bizA, bizB) {
  return prisma.businessConnection.findFirst({
    where: {
      OR: [
        { requesterBusinessId: bizA, targetBusinessId: bizB },
        { requesterBusinessId: bizB, targetBusinessId: bizA },
      ],
    },
  });
}

module.exports = {
  // User connections
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeConnection,
  getById,
  areConnected,
  getStatus,
  countByUserId,
  listByUserId,
  listPending,
  findExisting,
  // Business connections
  sendBusinessRequest,
  acceptBusinessRequest,
  rejectBusinessRequest,
  removeBusinessConnection,
  getBusinessConnectionById,
  areBusinessesConnected,
  getBusinessConnectionStatus,
  countBusinessConnections,
  listBusinessConnections,
  listPendingBusinessRequests,
  findExistingBusinessConnection,
};
