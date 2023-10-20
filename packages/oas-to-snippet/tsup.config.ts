// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'tsup';

import config from '../../tsup.config.js';

export default defineConfig(options => ({
  ...options,
  ...config,

  entry: ['src/lib/utils.ts', 'src/index.ts', 'src/supportedLanguages.ts', 'src/types.ts'],
  silent: !options.watch,
}));
