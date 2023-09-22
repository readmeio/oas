import type { Options } from 'tsup';

// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'tsup';

export default defineConfig((options: Options) => ({
  ...options,

  cjsInterop: true,
  clean: true,
  dts: true,
  entry: [
    'src/analyzer/index.ts',
    'src/lib/reducer.ts',
    'src/index.ts',
    'src/operation.ts',
    'src/operation/get-parameters-as-json-schema.ts',
    'src/rmoas.types.ts',
    'src/utils.ts',
  ],
  format: ['esm', 'cjs'],
  minify: false,
  shims: true,
  silent: !options.watch,
  sourcemap: true,
  splitting: true,
}));
