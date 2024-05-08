/* eslint-disable unicorn/prefer-module -- We use `require.resolve` for reading YAML fixtures. */
import type { OpenAPIV3 } from 'openapi-types';

import path from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import OASNormalize from '../src/index.js';

/**
 * @note only tests that require `process.chdir()` should be in this file.
 */

describe('#bundle', () => {
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it('should bundle an external schema in', async () => {
    const petSchema = await import('./__fixtures__/bundle/pet.json').then(r => r.default);
    const contents = require.resolve('./__fixtures__/bundle/definition.json');
    process.chdir(path.dirname(contents));
    const o = new OASNormalize(contents, { enablePaths: true });
    const bundled = (await o.bundle()) as OpenAPIV3.Document;

    expect(bundled.components?.requestBodies?.Pet).toStrictEqual({
      description: 'Pet object that needs to be added to the store',
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/requestBodies/Pet/content/application~1xml/schema',
          },
        },
        'application/xml': {
          schema: petSchema,
        },
      },
    });
  });
});
