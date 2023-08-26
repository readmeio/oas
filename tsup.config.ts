import type { Options } from 'tsup';

// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'tsup';

import tsconfig from './tsconfig.json';

export default defineConfig((options: Options) => ({
  ...options,
  entry: ['src/index.ts'],
  treeshake: true,
  format: ['esm', 'cjs'],
  silent: !options.watch,
  minify: process.env.NODE_ENV === 'production',
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  shims: true,
  target: tsconfig.compilerOptions.target as 'es2020',
  env: {
    NODE_ENV: process.env.NODE_ENV,
  },
  cjsInterop: true,
}));
