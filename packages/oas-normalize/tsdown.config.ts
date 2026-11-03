import { defineConfig } from 'tsdown';

import config from '../../tsdown.config.mts';

export default defineConfig(options => ({
  ...config,
  entry: ['src/index.ts', 'src/lib/errors.ts', 'src/lib/types.ts', 'src/lib/utils.ts'],
  logLevel: options.watch ? 'info' : 'error',
  watch: options.watch,
}));
