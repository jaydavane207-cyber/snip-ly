/* eslint-disable */
const path = require('path');

module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    testTimeout: 20000,
    hookTimeout: 20000,
  },
};
