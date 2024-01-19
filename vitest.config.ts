import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    typecheck: {
      tsconfig: '__tests__/tsconfig.vitest.json',
    },
  },
});
