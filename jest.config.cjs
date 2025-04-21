/**
 * Jest configuration for security testing
 */
module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test match patterns
  testMatch: ['**/*.test.js'],
  
  // Timeout for tests (in milliseconds)
  testTimeout: 10000,
  
  // Verbose output for better debugging
  verbose: true,
  
  // Coverage collection
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  
  // Module paths for test resolution
  moduleDirectories: ['node_modules', __dirname],
  
  // Setup files to run before tests
  setupFiles: ['dotenv/config'],
  
  // Global test setup
  globalSetup: null, // Can be specified if needed
  
  // Test sequence and parallel execution
  maxWorkers: 1, // Run tests serially for predictable rate limit tests
  
  // Custom reporter
  reporters: ['default'],
  
  // Watch plugins configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Transform for modules
  transform: {},
  
  // Configuration for test files requiring modules
  transformIgnorePatterns: [
    "node_modules/(?!(dotenv|express)/)"
  ]
};