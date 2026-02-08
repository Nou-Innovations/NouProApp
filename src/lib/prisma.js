const { PrismaClient } = require("@prisma/client");

const globalForPrisma = global;

// Reuse PrismaClient in dev to avoid "too many connections" on reloads
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

module.exports = prisma;
