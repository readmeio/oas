// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'tsup';

import config from '../../tsup.config.js';

export default defineConfig(options => ({
  ...options,
  ...config,

  entry: ['src/index.ts', 'src/languages.ts', 'src/types.ts'],
  silent: !options.watch,
}));
