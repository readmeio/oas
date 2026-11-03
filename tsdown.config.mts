import type { UserConfig } from 'tsdown';

const config: UserConfig = {
  cjsDefault: true,
  clean: true,
  dts: { sourcemap: false },
  // Emit `.js` for the format that matches `package.json#type`, not always `.mjs`/`.cjs`.
  fixedExtension: false,
  format: ['esm', 'cjs'],
  minify: false,
  // tsup removed the `node:` prefix unless `removeNodeProtocol` was disabled.
  nodeProtocol: 'strip',
  shims: true,
  sourcemap: true,
  // tsup used `compilerOptions.target` from tsconfig (`ES2024`) when `target` was unset.
  target: 'es2024',
};

export default config;
