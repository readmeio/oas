import { defineConfig } from 'tsup';

import config from '../../tsup.config.js';

export default defineConfig(options => ({
  ...options,
  ...config,

  entry: ['src/index.ts', 'src/lib/assertions.ts'],
  silent: !options.watch,
}));
