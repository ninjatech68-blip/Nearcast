import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // the same `@/*` alias tsconfig and metro use, so a domain test can
    // import a module that reaches into design-system or infrastructure
    // without the path resolving differently in three places.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
