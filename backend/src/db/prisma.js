const { PrismaClient } = require('@prisma/client');

// Use global variable in development to prevent hot reload issues
const prisma = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = { prisma };

