const path = require('path');

const OpenAPIParser = require('@readme/openapi-parser');
const fg = require('fast-glob');

describe.each([
  ['Swagger 2.0', 'swagger', '2.0'],
  ['OpenAPI 3.0', 'openapi', '3.0'],
  ['OpenAPI 3.1', 'openapi', '3.1'],
])('%s', (_, specification, version) => {
  it('should have parity between JSON and YAML petstores', async () => {
    const json = await OpenAPIParser.validate(`${version}/json/petstore.json`);
    const yaml = await OpenAPIParser.validate(`${version}/yaml/petstore.yaml`);

    expect(json).toStrictEqual(yaml);
  });

  describe('JSON', () => {
    it.each(fg.sync([`${version}/json/*.json`]).map(file => [path.basename(file), file]))(
      'should validate `%s` as valid',
      async (__, file) => {
        await expect(OpenAPIParser.validate(file)).resolves.toStrictEqual(
          expect.objectContaining({
            [specification]: expect.stringContaining(version),
          })
        );
      }
    );
  });

  describe('YAML', () => {
    it.each(fg.sync([`${version}/yaml/*.yaml`]).map(file => [path.basename(file), file]))(
      'should validate `%s` as valid',
      async (__, file) => {
        await expect(OpenAPIParser.validate(file)).resolves.toStrictEqual(
          expect.objectContaining({
            [specification]: expect.stringContaining(version),
          })
        );
      }
    );
  });
});
