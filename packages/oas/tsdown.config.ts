import fs from 'node:fs';
import path from 'node:path';

import { defineConfig } from 'tsdown';

import config from '../../tsdown.config.mts';

// `cjsDefault` only rewrites a declaration entry when its sole export is the default.
// `src/index.ts` also re-exports a type, so the CJS `.d.cts` keeps `export { Oas as default }`
// while the JavaScript is `module.exports = Oas`. Rewrite that entry so the two agree.
function rewriteCjsDefaultExport(ctx: { options: { cwd: string; outDir: string } }) {
  const file = path.resolve(ctx.options.cwd, ctx.options.outDir, 'index.d.cts');
  if (!fs.existsSync(file)) return;

  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('export =')) return;

  const rewritten = source.replace(
    /export \{ (\w+) as default, type (\w+) \};/,
    '// @ts-ignore\nexport = $1;\nexport type { $2 };',
  );
  if (rewritten === source) {
    throw new Error(`Could not rewrite the CJS default export in ${file}`);
  }

  fs.writeFileSync(file, rewritten);
}

export default defineConfig(options => ({
  ...config,
  entry: [
    'src/analyzer/index.ts',
    'src/analyzer/types.ts',
    'src/extensions.ts',
    'src/index.ts',
    'src/operation/index.ts',
    'src/pruner/index.ts',
    'src/reducer/index.ts',
    'src/types.ts',
    'src/utils.ts',
  ],
  logLevel: options.watch ? 'info' : 'error',
  watch: options.watch,

  hooks: {
    'build:done': rewriteCjsDefaultExport,
  },
}));
