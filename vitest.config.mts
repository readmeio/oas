// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',

      // This test is better served by native TS typings. Ignoring until we have those.
      '**/typescript-definition.spec.ts',
    ],

    /**
     * We can't run tests with `threads` on because we use `process.chdir()` in some tests and
     * that isn't available in worker threads, and it's way too much work to mock out an entire
     * filesystem and `fs` calls for the tests that use it.
     *
     * @see {@link https://github.com/vitest-dev/vitest/issues/566}
     */
    pool: 'forks',
  },
});
