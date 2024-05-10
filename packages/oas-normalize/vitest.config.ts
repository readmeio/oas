// eslint-disable-next-line import/no-extraneous-dependencies
import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    /**
     * We use `process.chdir()` in one of these tests, so we need this `pool` setting.
     */
    pool: 'forks',
  },
});
