import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      // Vitest strips colors from content by default and `chalk` has troubles with color detection
      // in CI.
      // https://github.com/chalk/supports-color/issues/106
      FORCE_COLOR: '1',
    },
    setupFiles: ['test/vitest.setup.ts'],
  },
});
