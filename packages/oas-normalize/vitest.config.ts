// eslint-disable-next-line import/no-extraneous-dependencies
import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    /**
     * Deliberately excluding index.chdir.test.ts since that uses `process.chdir`
     * and therefore requires a different `pool` setting.
     *
     * @see {@link ./vitest.config.chdir.ts}
     */
    exclude: ['test/index.chdir.test.ts'],
  },
});
