import { defineConfig } from 'vitest/config';

// Apply before workers spawn so `picocolors` (imported at module-eval time) sees color support.
// `test.env` alone is not enough when the host process already has `NO_COLOR` set.
process.env.FORCE_COLOR = '1';
delete process.env.NO_COLOR;

export default defineConfig({
  test: {
    coverage: {
      exclude: ['**/bin/**', '**/dist/**', '**/test/**', '**/tsup.config.ts', '**/vitest.*'],
    },
    env: {
      // Vitest strips colors from content by default and `chalk`/`picocolors` have troubles with
      // color detection in CI and in environments that set `NO_COLOR`.
      // https://github.com/chalk/supports-color/issues/106
      FORCE_COLOR: '1',
      NO_COLOR: '',
    },
    projects: ['packages/*'],
  },
});
