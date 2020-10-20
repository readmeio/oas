const getSchema = require('../../../tooling/lib/get-schema');

const schema = { type: 'string' };

test('should return the first type if there is content', () => {
  expect(
    getSchema({
      requestBody: {
        content: {
          'application/json': {
            schema,
          },
          'text/xml': {
            schema: { type: 'number' },
          },
        },
      },
    })
  ).toStrictEqual({ type: 'application/json', schema });

  expect(
    getSchema({
      requestBody: {
        content: {
          'text/xml': {
            schema,
          },
          'application/json': {
            schema: { type: 'number' },
          },
        },
      },
    })
  ).toStrictEqual({ type: 'text/xml', schema });
});

test('should return undefined', () => {
  expect(getSchema({})).toBeUndefined();
});

test('should return if theres a $ref on the top level', () => {
  const $ref = '#/definitions/schema';
  expect(getSchema({ requestBody: { $ref } })).toStrictEqual({
    type: 'application/json',
    schema: { $ref },
  });
});

// https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#requestBodyObject
test('should look up the schema if it looks like the first $ref is a request body object', () => {
  const $ref = '#/components/schemas/schema';
  expect(
    getSchema(
      {
        requestBody: { $ref: '#/components/requestBodies/schema' },
      },
      {
        components: {
          requestBodies: { schema: { content: { 'application/json': { schema: { $ref } } } } },
        },
      }
    ).schema.$ref
  ).toStrictEqual($ref);
});

test('should return the inline schema from request body object', () => {
  expect(
    getSchema(
      {
        requestBody: { $ref: '#/components/requestBodies/schema' },
      },
      {
        components: { requestBodies: { schema: { content: { 'application/json': { schema } } } } },
      }
    ).schema
  ).toStrictEqual(schema);
});
