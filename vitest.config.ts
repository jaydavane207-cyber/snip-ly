// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 40000,
    include: ['tests/**/*.test.ts', 'lib/__tests__/**/*.test.ts'],
  },
};
