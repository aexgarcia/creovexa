import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '#app': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.integration-spec.ts'],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
