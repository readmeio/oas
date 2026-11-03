import { defineConfig } from 'tsdown';

import config from '../../tsdown.config.mts';

export default defineConfig(options => ({
  ...config,
  entry: ['src/index.ts', 'src/lib/assertions.ts', 'src/lib/urls.ts'],
  logLevel: options.watch ? 'info' : 'error',
  watch: options.watch,

  deps: {
    // `@apidevtools/json-schema-ref-parser` is ESM-only, so it needs to be bundled into our CJS
    // output rather than left as an external `require()`.
    alwaysBundle: ['@apidevtools/json-schema-ref-parser'],

    // Rolldown follows this package's indirect `undici` require and would inline the whole module.
    // Keep it external, matching the previous `tsup` build.
    neverBundle: ['undici'],
  },
}));
