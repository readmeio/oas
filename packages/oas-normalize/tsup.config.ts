import type { Options } from 'tsup';

// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'tsup';

export default defineConfig((options: Options) => ({
  ...options,

  cjsInterop: true,
  clean: true,
  dts: true,
  entry: ['src/index.ts', 'src/lib/types.ts', 'src/lib/utils.ts'],
  format: ['esm', 'cjs'],
  minify: false,
  shims: true,
  silent: !options.watch,
  sourcemap: true,
  splitting: true,
}));
