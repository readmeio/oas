// oxlint-disable import/no-dynamic-require, typescript/consistent-type-imports
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { relativePath } from './utils.js';

const require = createRequire(import.meta.url);
const distDir = path.join(import.meta.dirname, '../dist');

/**
 * `@apidevtools/json-schema-ref-parser` is ESM-only. Our CJS build relies on tsup's `noExternal`
 * to bundle it; without that, `require('@readme/openapi-parser')` would try to `require()` an
 * ESM package and blow up. These tests load the real `dist/*.cjs` output (built via `pretest`)
 * to catch that regression.
 */
describe('CJS build', () => {
  it('should not leave @apidevtools/json-schema-ref-parser as an external require()', () => {
    const cjsFiles = fs
      .readdirSync(distDir, { recursive: true })
      .filter((name): name is string => typeof name === 'string' && name.endsWith('.cjs'))
      .map(name => path.join(distDir, name));

    expect(cjsFiles.length).toBeGreaterThan(0);

    for (const file of cjsFiles) {
      const source = fs.readFileSync(file, 'utf8');
      // oxlint-disable-next-line vitest/valid-expect -- false positive, `expect()` supports a second argument
      expect(source, path.relative(distDir, file)).not.toMatch(
        /require\(["']@apidevtools\/json-schema-ref-parser["']\)/,
      );
    }
  });

  it('should load and run the main entry (parse + dereference)', async () => {
    const { parse, dereference } = require(path.join(distDir, 'index.cjs')) as typeof import('../src/index.js');

    const parsed = await parse({
      openapi: '3.0.0',
      info: { title: 'CJS smoke', version: '1.0.0' },
      paths: {},
    });
    expect(parsed.openapi).toBe('3.0.0');

    const api = await dereference(relativePath('specs/circular/circular.yaml'));
    expect(api.info.title).toBe('Circular $Refs');
    expect(api.definitions.person.properties.spouse).toStrictEqual(api.definitions.person);
  });

  it('should load and run the urls subpath entry', () => {
    const { isUnsafeURL } = require(path.join(distDir, 'lib/urls.cjs')) as typeof import('../src/lib/urls.js');

    expect(isUnsafeURL('./schemas/pet.json')).toBe(false);
    expect(isUnsafeURL('http://127.0.0.1/')).toBe(true);
  });
});
