// eslint-disable-next-line import/no-extraneous-dependencies, node/no-extraneous-import
import { defineConfig } from 'tsup';

import config from '../../tsup.config.js';

export default defineConfig(options => ({
  ...options,
  ...config,

  entry: ['src/index.ts'],
  silent: !options.watch,
}));
