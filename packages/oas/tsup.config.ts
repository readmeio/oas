import type { Options } from 'tsup';

// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'tsup';

import config from '../../tsup.config.js';

export default defineConfig((options: Options) => ({
  ...options,
  ...config,

  entry: [
    'src/analyzer/index.ts',
    'src/lib/reducer.ts',
    'src/index.ts',
    'src/operation.ts',
    'src/operation/get-parameters-as-json-schema.ts',
    'src/rmoas.types.ts',
    'src/utils.ts',
  ],
  silent: !options.watch,
}));
