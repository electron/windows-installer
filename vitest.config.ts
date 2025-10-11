import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['spec/**/*-spec.ts', 'spec/**/*.spec.ts', 'spec/**/*.test.ts'],
    globals: false,
    testTimeout: 60000,
  },
});
