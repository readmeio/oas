import path from 'node:path';

import toBeAValidOpenAPIDefinition from 'jest-expect-openapi';
import fg from 'fast-glob';
import { describe, it, expect } from 'vitest';
import { parse } from '@readme/openapi-parser';

expect.extend({ toBeAValidOpenAPIDefinition });

describe.each([
  ['Swagger 2.0', 'swagger', '2.0'],
  ['OpenAPI 3.0', 'openapi', '3.0'],
  ['OpenAPI 3.1', 'openapi', '3.1'],
])('%s', (_, specification, version) => {
  it('should have parity between JSON and YAML petstores', async () => {
    const json = await parse(path.join(__dirname, `../${version}/json/petstore.json`));
    const yaml = await parse(path.join(__dirname, `../${version}/yaml/petstore.yaml`));

    expect(json).toStrictEqual(yaml);
  });

  describe('JSON', () => {
    it.each(fg.sync([path.join(__dirname, `../${version}/json/*.json`)]).map(file => [path.basename(file), file]))(
      'should validate `%s` as valid',
      async (__, file) => {
        await expect(file).toBeAValidOpenAPIDefinition();
        await expect(parse(file)).resolves.toStrictEqual(
          expect.objectContaining({
            [specification]: expect.stringContaining(version),
          }),
        );
      },
    );
  });

  describe('YAML', () => {
    it.each(fg.sync([path.join(__dirname, `../${version}/yaml/*.yaml`)]).map(file => [path.basename(file), file]))(
      'should validate `%s` as valid',
      async (__, file) => {
        await expect(file).toBeAValidOpenAPIDefinition();
        await expect(parse(file)).resolves.toStrictEqual(
          expect.objectContaining({
            [specification]: expect.stringContaining(version),
          }),
        );
      },
    );
  });
});
