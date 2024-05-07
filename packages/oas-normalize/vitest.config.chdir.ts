// eslint-disable-next-line import/no-extraneous-dependencies
import { defineProject } from 'vitest/config';

// This config is for test files that use `process.chdir`.
export default defineProject({
  test: {
    include: ['**/test/index.chdir.test.ts'],
    name: 'oas-normalize (chdir)',
    pool: 'forks',
  },
});
