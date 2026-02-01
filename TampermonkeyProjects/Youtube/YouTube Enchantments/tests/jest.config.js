module.exports = {
  // Use jsdom to simulate browser environment
  testEnvironment: 'jsdom',
  
  // Setup file runs before each test file
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  
  // Collect coverage from these files
  collectCoverageFrom: [
    'YouTubeEnchantments.js',
    '!jest.config.js',
    '!babel.config.js'
  ],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // File extensions to consider
  moduleFileExtensions: ['js'],
  
  // Use babel-jest for transforming files
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Ignore these directories
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/__mocks__/'
  ],
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true
};
