import { defineConfig } from 'tsdown';

import config from '../../tsdown.config.mts';

export default defineConfig(options => ({
  ...config,
  entry: ['src/index.ts', 'src/lib/configure-security.ts', 'src/lib/types.ts'],
  logLevel: options.watch ? 'info' : 'error',
  watch: options.watch,
}));
