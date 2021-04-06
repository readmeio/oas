const Oas = require('../../../tooling');

const createOas = (responses, components) => {
  const schema = {
    paths: { '/': { get: { responses } } },
  };

  if (components) {
    schema.components = components;
  }

  return new Oas(schema);
};

const simpleObjectSchema = () => ({
  type: 'object',
  properties: {
    foo: { type: 'string' },
    bar: { type: 'number' },
  },
});

test('it should return with null if there is not a response', () => {
  expect(createOas({}).operation('/', 'get').getResponseAsJsonSchema('200')).toBeNull();
});

test('it should return a schema when one is present', () => {
  expect(
    createOas({
      200: {
        description: 'response level description',
        content: {
          'application/json': {
            schema: simpleObjectSchema(),
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

test('the returned schema should include components if they exist', () => {
  const components = {
    schemas: {
      unusedSchema: simpleObjectSchema(),
    },
  };

  expect(
    createOas(
      {
        200: {
          description: 'response level description',
          content: {
            'application/json': {
              schema: simpleObjectSchema(),
            },
          },
        },
      },
      components
    )
      .operation('/', 'get')
      .getResponseAsJsonSchema('200')
  ).toStrictEqual([
    {
      schema: { ...simpleObjectSchema(), components },
      type: 'object',
      label: 'Response body',
      description: 'response level description',
    },
  ]);
});

test('the returned schema should include headers (OAS 3.0.3) if they exist', () => {
  expect(
    createOas({
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
    })
      .operation('/', 'get')
      .getResponseAsJsonSchema('200')
  ).toStrictEqual([
    {
      schema: simpleObjectSchema(),
      type: 'object',
      label: 'Headers',
      description: 'response level description',
    },
  ]);
});
