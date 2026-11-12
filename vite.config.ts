import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './', // relative paths so dist/ works from any static host or sub-path
  build: { target: 'es2022' },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
