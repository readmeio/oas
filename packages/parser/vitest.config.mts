import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      // Vitest strips colors from content by default and `chalk`/`picocolors` have troubles with
      // color detection in CI and in environments that set `NO_COLOR`.
      // https://github.com/chalk/supports-color/issues/106
      FORCE_COLOR: '1',
      NO_COLOR: '',
    },
    setupFiles: ['test/vitest.setup.ts'],
  },
});
