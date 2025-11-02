import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: true,
    environment: 'node',
    setupFiles: [],
    // Increase timeout for tests that might load native modules
    testTimeout: 10000,
    // Run tests sequentially to avoid native module conflicts
    threads: false,
    isolate: true,
  },
});

