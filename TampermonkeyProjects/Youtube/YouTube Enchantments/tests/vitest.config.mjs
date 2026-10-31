import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }
    },
    setupFiles: ['./__tests__/setup.js'],
    include: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
    exclude: ['**/node_modules/**', '**/__tests__/__mocks__/**'],
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      include: ['YouTubeEnchantments.js'],
      exclude: ['vitest.config.mjs'],
      thresholds: {
        branches: 70,
        functions: 75,
        lines: 75,
        statements: 75
      }
    }
  }
});
