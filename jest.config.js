module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./__tests__/setup.js'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/db/**',
    '!src/repositories/prisma/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  forceExit: true,
};
