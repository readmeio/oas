import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Always resolve `undici` to the repo-root install. A package-local copy would make
// `vi.mock('undici')` patch the wrong module while `@apidevtools/json-schema-ref-parser`
// keeps using the root one — bypassing nock and hanging on real TCP connects.
const rootUndici = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../node_modules/undici');

export default defineConfig({
  resolve: {
    alias: {
      undici: rootUndici,
    },
  },
  test: {
    env: {
      // Vitest strips colors from content by default and `chalk`/`picocolors` have troubles with
      // color detection in CI and in environments that set `NO_COLOR`.
      // https://github.com/chalk/supports-color/issues/106
      FORCE_COLOR: '1',
      NO_COLOR: '',
    },
  },
});
