import type { HttpMethods } from '../../src/rmoas.types';
import Oas from '../../src';

import createOas from '../__fixtures__/create-oas';

let circular: Oas;
let petstore: Oas;
let responses: Oas;

beforeAll(async () => {
  petstore = await import('@readme/oas-examples/3.0/json/petstore.json').then(Oas.init);
  await petstore.dereference();

  circular = await import('../__datasets__/circular.json').then(Oas.init);

  responses = await import('../__datasets__/responses.json').then(Oas.init);
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
        schema: { type: 'string' },
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
          components: circular.api.components,
        },
      },
    ]);
  });
});
