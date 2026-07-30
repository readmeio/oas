import { defineConfig } from 'tsup';

import config from '../../tsup.config.js';

export default defineConfig(options => ({
  ...options,
  ...config,

  entry: ['src/index.ts', 'src/lib/assertions.ts', 'src/lib/urls.ts'],
  silent: !options.watch,

  // `@apidevtools/json-schema-ref-parser` is ESM-only, so it needs to be bundled into our CJS
  // output rather than left as an external `require()`.
  noExternal: ['@apidevtools/json-schema-ref-parser'],
}));
