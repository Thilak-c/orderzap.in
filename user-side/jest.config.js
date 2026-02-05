/**
 * Jest Configuration for OrderZap Homepage Tests
 * 
 * Configuration for running unit tests and property-based tests with fast-check.
 * 
 * Property-based tests use fast-check with a minimum of 100 iterations per test
 * to ensure comprehensive coverage of the input space.
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/*.property.test.js',
    '**/*.test.js',
    '**/*.test.jsx',
  ],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'components/**/*.{js,jsx}',
    'app/**/*.{js,jsx}',
    '!**/*.test.{js,jsx}',
    '!**/node_modules/**',
  ],
  testTimeout: 10000,
  
  // Global setup for property-based testing
  globals: {
    'fast-check': {
      // Minimum 100 iterations for all property tests
      numRuns: 100,
    },
  },
};
