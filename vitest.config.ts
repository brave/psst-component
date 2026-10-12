import { defineConfig } from 'vitest/config';

export default defineConfig({
  // `__DEV__` is injected by webpack at bundle time; tests run logging enabled.
  define: {
    __DEV__: 'true',
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});
