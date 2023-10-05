// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'tsup';

export default defineConfig(options => ({
  ...options,

  cjsInterop: true,
  dts: true,
  entry: ['src/index.ts', 'src/lib/configure-security.ts'],
  format: ['esm', 'cjs'],
  shims: true,
  silent: !options.watch,
  sourcemap: true,
  treeshake: true,
}));
