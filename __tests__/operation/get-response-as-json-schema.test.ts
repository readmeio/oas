import type { HttpMethods, ResponseObject, SchemaObject } from '../../src/rmoas.types';

import openapiParser from '@readme/openapi-parser';

import Oas from '../../src';
import cloneObject from '../../src/lib/clone-object';
import createOas from '../__fixtures__/create-oas';

let circular: Oas;
let petstore: Oas;
let responses: Oas;

beforeAll(async () => {
  petstore = await import('@readme/oas-examples/3.0/json/petstore.json').then(r => r.default).then(Oas.init);
  await petstore.dereference();

  circular = await import('../__datasets__/circular.json').then(r => r.default).then(Oas.init);

  responses = await import('../__datasets__/responses.json').then(r => r.default).then(Oas.init);
  await responses.dereference();
});

test('it should return with null if there is not a response', () => {
  expect(createOas({ responses: {} }).operation('/', 'get').getResponseAsJsonSchema('200')).toBeNull();
});

test('it should return with null if there is empty content', () => {
  const oas = createOas({
    responses: {
      200: {
        description: 'OK',
        content: {},
      },
    },
  });

  expect(oas.operation('/', 'get').getResponseAsJsonSchema('200')).toBeNull();
});

test('it should return a response as JSON Schema', () => {
  const operation = petstore.operation('/pet/{petId}/uploadImage', 'post');
  expect(operation.getResponseAsJsonSchema('200')).toStrictEqual([
    {
      label: 'Response body',
      description: 'successful operation',
      type: 'object',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'integer', format: 'int32', maximum: 2147483647, minimum: -2147483648 },
          type: { type: 'string' },
          message: { type: 'string' },
        },
        'x-readme-ref-name': 'ApiResponse',
        $schema: 'http://json-schema.org/draft-04/schema#',
      },
    },
  ]);
});

describe('content type handling', () => {
  it.each([
    [
      'should return a schema when one is present with a JSON-compatible vendor-prefixed content type',
      '/vendor-prefix-content-type',
      'get',
    ],
    [
      'should prefer the JSON-compatible content type when multiple content types are present',
      '/multiple-responses-with-a-json-compatible',
      'get',
    ],
    [
      'should prefer the JSON-compatible content type when JSON and wildcard types are both present',
      '/multiple-responses-with-json-compatible-and-wildcard',
      'get',
    ],
    ['should return a JSON Schema object for a wildcard content type', '/wildcard-content-type', 'get'],
  ])('%s', (_, path, method) => {
    const operation = responses.operation(path, method as HttpMethods);
    expect(operation.getResponseAsJsonSchema('200')).toStrictEqual([
      {
        label: 'Response body',
        description: 'OK',
        type: 'object',
        schema: {
          type: 'object',
          properties: {
            foo: { type: 'string' },
            bar: { type: 'number' },
          },
          'x-readme-ref-name': 'simple-object',
          $schema: 'http://json-schema.org/draft-04/schema#',
        },
      },
    ]);
  });

  it("should return JSON Schema for a content type that isn't JSON-compatible", () => {
    expect(
      createOas({
        responses: {
          200: {
            description: 'response level description',
            content: {
              'image/png': {
                schema: { type: 'string' },
              },
            },
          },
        },
      })
        .operation('/', 'get')
        .getResponseAsJsonSchema('200')
    ).toStrictEqual([
      {
        label: 'Response body',
        description: 'response level description',
        type: 'string',
        schema: {
          type: 'string',
          $schema: 'http://json-schema.org/draft-04/schema#',
        },
      },
    ]);
  });
});

describe('`enum` handling', () => {
  it('should supplement response schema descriptions with enums', async () => {
    const spec = await import('../__datasets__/response-enums.json').then(s => s.default).then(Oas.init);
    await spec.dereference();

    const operation = spec.operation('/anything', 'post');

    expect(operation.getResponseAsJsonSchema('200')).toStrictEqual([
      {
        label: 'Response body',
        description: 'OK',
        type: 'object',
        schema: {
          type: 'object',
          properties: expect.objectContaining({
            stock: { type: 'string' },
            'description (markdown)': {
              type: 'string',
              description: 'This is a string with a **markdown** description: [link](ref:action-object)',
            },
            'enum (no description)': expect.objectContaining({
              description: '`available` `pending` `sold`',
            }),
            'enum (with default)': expect.objectContaining({
              description: 'This enum has a `default` of `available`.\n\n`available` `pending` `sold`',
            }),
            'enum (with default + no description)': expect.objectContaining({
              description: '`available` `pending` `sold`',
            }),
            'enum (with empty option)': expect.objectContaining({
              description:
                'This enum has a an empty string (`""`) as one of its available options.\n\n`available` `pending` `sold`',
            }),
            'enum (with empty option and empty default)': expect.objectContaining({
              description:
                'This enum has a an empty string (`""`) as its only available option, and that same value is set as its `default`.',
            }),
          }),
          'x-readme-ref-name': 'enum-request',
          $schema: 'http://json-schema.org/draft-04/schema#',
        },
      },
    ]);
  });
});

describe('`headers` support', () => {
  // https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#responseObject
  it('should include headers if they exist', () => {
    const oas = createOas({
      responses: {
        200: {
          description: 'response level description',
          headers: {
            foo: {
              description: 'this is a description for the foo header',
              schema: { type: 'string' },
            },
            bar: {
              schema: { type: 'number' },
            },
          },
        },
      },
    });

    expect(oas.operation('/', 'get').getResponseAsJsonSchema('200')).toStrictEqual([
      {
        label: 'Headers',
        description: 'response level description',
        type: 'object',
        schema: {
          type: 'object',
          properties: {
            foo: {
              description: 'this is a description for the foo header',
              type: 'string',
            },
            bar: {
              type: 'number',
            },
          },
        },
      },
    ]);
  });
});

describe('$schema version', () => {
  it('should add the v4 schema version to OpenAPI 3.0.x schemas', () => {
    const operation = petstore.operation('/pet/findByStatus', 'get');
    expect(operation.getResponseAsJsonSchema('200')[0].schema.$schema).toBe('http://json-schema.org/draft-04/schema#');
  });

  it('should add v2020-12 schema version on OpenAPI 3.1 schemas', async () => {
    const petstore_31 = await import('@readme/oas-examples/3.1/json/petstore.json').then(r => r.default).then(Oas.init);
    await petstore_31.dereference();

    const operation = petstore_31.operation('/pet/findByStatus', 'get');
    expect(operation.getResponseAsJsonSchema('200')[0].schema.$schema).toBe(
      'https://json-schema.org/draft/2020-12/schema#'
    );
  });
});

describe('quirks', () => {
  it('should not crash out when pulling a response that has no schema', () => {
    const operation = responses.operation('/response-with-example-and-no-schema', 'get');

    expect(operation.getResponseAsJsonSchema('200')).toStrictEqual([
      {
        type: 'string',
        schema: {
          $schema: 'http://json-schema.org/draft-04/schema#',
        },
        label: 'Response body',
      },
    ]);
  });

  describe('$ref quirks', () => {
    it("should retain $ref pointers in the schema even if they're circular", () => {
      const operation = circular.operation('/', 'put');
      expect(operation.getResponseAsJsonSchema('200')).toMatchSnapshot();
    });

    it('should default the root schema to a `string` if there is a circular `$ref` at the root', () => {
      const operation = circular.operation('/', 'put');
      expect(operation.getResponseAsJsonSchema('201')).toStrictEqual([
        {
          label: 'Response body',
          description: 'OK',
          type: 'string',
          schema: {
            $ref: '#/components/schemas/SalesLine',
            $schema: 'http://json-schema.org/draft-04/schema#',
            components: circular.api.components,
          },
        },
      ]);
    });

    it('should not override object references', async () => {
      const readme = await import('@readme/oas-examples/3.0/json/readme.json').then(r => r.default).then(Oas.init);
      await readme.dereference({ preserveRefAsJSONSchemaTitle: true });

      const operation = readme.operation('/api-specification', 'post');
      const schemas = operation.getResponseAsJsonSchema('401');

      expect(schemas[0].schema.oneOf[1].properties.docs).toStrictEqual({
        type: 'string',
        format: 'url',
        description: expect.stringContaining('log URL where you can see more information'),
        examples: ['https://docs.readme.com/logs/6883d0ee-cf79-447a-826f-a48f7d5bdf5f'],
      });

      const definition = readme.getDefinition();
      const authUnauthorizedResponse = definition.components.responses.authUnauthorized as ResponseObject;

      expect(
        (
          ((authUnauthorizedResponse.content['application/json'].schema as SchemaObject).oneOf[0] as SchemaObject)
            .allOf[0] as SchemaObject
        ).properties.docs
      ).toStrictEqual({
        type: 'string',
        format: 'url',
        description: expect.stringContaining('log URL where you can see more information'),
        // The original spec should have **not** been updated to the `examples` format that we
        // reshape this to in `getResponseAsJsonSchema`.
        example: 'https://docs.readme.com/logs/6883d0ee-cf79-447a-826f-a48f7d5bdf5f',
      });

      // The original spec should still validate too!
      await expect(openapiParser.validate(cloneObject(definition))).resolves.toStrictEqual(
        expect.objectContaining({
          openapi: '3.0.2',
        })
      );
    });
  });
});
