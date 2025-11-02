import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: true,
    environment: 'node',
    setupFiles: [],
    // Increase timeout for tests that might load native modules
    testTimeout: 10000,
  },
});

