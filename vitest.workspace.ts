// eslint-disable-next-line import/no-extraneous-dependencies
import { defineWorkspace } from 'vitest/config';

// eslint-disable-next-line require-extensions/require-extensions
import chdirConfig from './packages/oas-normalize/vitest.config.chdir';

export default defineWorkspace([
  'packages/*',
  {
    // including another config for a test that requires the `pool: forks` option.
    ...chdirConfig,
  },
]);
