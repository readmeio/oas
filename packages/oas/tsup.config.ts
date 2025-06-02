// eslint-disable-next-line import/no-extraneous-dependencies, n/no-extraneous-import
import { defineConfig } from 'tsup';

import config from '../../tsup.config.js';

export default defineConfig(options => ({
  ...options,
  ...config,

  entry: [
    'src/analyzer/index.ts',
    'src/analyzer/types.ts',
    'src/extensions.ts',
    'src/index.ts',
    'src/operation/index.ts',
    'src/operation/lib/get-parameters-as-json-schema.ts',
    'src/reducer/index.ts',
    'src/types.ts',
    'src/utils.ts',
  ],
  silent: !options.watch,
}));
