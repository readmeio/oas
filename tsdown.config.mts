import type { UserConfig } from 'tsdown';

const config: UserConfig = {
  cjsDefault: true,
  clean: true,
  dts: {
    sourcemap: false,
  },
  fixedExtension: false, // Always emit `.js` files.
  format: ['esm', 'cjs'],
  minify: false,
  nodeProtocol: 'strip', // Not all environments support the `node:` prefix.
  shims: true,
  sourcemap: true,
  target: 'es2024',
};

export default config;
