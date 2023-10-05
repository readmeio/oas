// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'tsup';

import config from '../../tsup.config.js';

export default defineConfig(options => ({
  ...options,
  ...config,

  entry: ['src/index.ts', 'src/lib/configure-security.ts', 'src/lib/types.ts'],
  silent: !options.watch,
}));
