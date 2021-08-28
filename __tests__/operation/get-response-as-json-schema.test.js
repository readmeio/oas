const Oas = require('../../src');

const createOas = require('../__fixtures__/create-oas');
const circular = require('../__datasets__/circular.json');
const petstore = require('@readme/oas-examples/3.0/json/petstore.json');

const simpleObjectSchema = () => ({
  type: 'object',
  properties: {
    foo: { type: 'string' },
    bar: { type: 'number' },
  },
});

test('it should return with null if there is not a response', () => {
  expect(createOas({ responses: {} }).operation('/', 'get').getResponseAsJsonSchema('200')).toBeNull();
});

test('it should return a response as JSON Schema', async () => {
  const oas = new Oas(petstore);
  await oas.dereference();

  const operation = oas.operation('/pet/{petId}/uploadImage', 'post');

  expect(operation.getResponseAsJsonSchema('200')).toStrictEqual([
    {
      schema: {
        type: 'object',
        properties: {
          code: { type: 'integer', format: 'int32', maximum: 2147483647, minimum: -2147483648 },
          type: { type: 'string' },
          message: { type: 'string' },
        },
        'x-readme-ref-name': 'ApiResponse',
      },
      type: 'object',
      label: 'Response body',
      description: 'successful operation',
    },
  ]);
});

describe('content type handling', () => {
  it('should return a schema when one is present with a JSON-identifying vendor-prefixed content type', () => {
    expect(
      createOas({
        responses: {
          200: {
            description: 'response level description',
            content: {
              'application/vnd.partytime+json': {
                schema: simpleObjectSchema(),
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
        type: 'object',
        schema: simpleObjectSchema(),
      },
    ]);
  });

  it('should prefer the JSON-identifying content type when multiple content types are present', () => {
    expect(
      createOas({
        responses: {
          200: {
            description: 'response level description',
            content: {
              'img/png': {
                schema: { type: 'string' },
              },
              'application/json': {
                schema: simpleObjectSchema(),
              },
            },
          },
        },
      })
        .operation('/', 'get')
        .getResponseAsJsonSchema('200')
    ).toStrictEqual([
      {
        schema: simpleObjectSchema(),
        type: 'object',
        label: 'Response body',
        description: 'response level description',
      },
    ]);
  });

  it('should not return a JSON Schema object for a content type that is not JSON-identifying', () => {
    expect(
      createOas({
        responses: {
          200: {
            description: 'response level description',
            content: {
              'img/png': {
                schema: { type: 'string' },
              },
            },
          },
        },
      })
        .operation('/', 'get')
        .getResponseAsJsonSchema('200')
    ).toBeNull();
  });
});

describe('`headers` support', () => {
  // https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#responseObject
  it('should include headers (OAS 3.0.3) if they exist', () => {
    const oas = createOas({
      responses: {
        200: {
          description: 'response level description',
          headers: {
            foo: {
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
        schema: simpleObjectSchema(),
      },
    ]);
  });
});

describe('$ref quirks', () => {
  it("should retain $ref pointers in the schema even if they're circular", () => {
    const oas = new Oas(circular);
    const operation = oas.operation('/', 'put');

    expect(operation.getResponseAsJsonSchema('200')).toMatchSnapshot();
  });

  it('should default the root schema to a `string` if there is a circular `$ref` at the root', () => {
    const oas = new Oas(circular);
    const operation = oas.operation('/', 'put');

    expect(operation.getResponseAsJsonSchema('201')).toStrictEqual([
      {
        description: 'OK',
        label: 'Response body',
        type: 'string',
        schema: {
          $ref: '#/components/schemas/SalesLine',
          components: circular.components,
        },
      },
    ]);
  });
});
