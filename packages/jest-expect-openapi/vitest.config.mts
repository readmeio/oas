// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    typecheck: {
      tsconfig: 'test/tsconfig.vitest.json',
    },
  },
});
