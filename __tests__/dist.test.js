/**
 * These are just some sanity tests to ensure that our TS build process works as expected.
 */
const Oas = require('../dist');
const petstore = require('@readme/oas-examples/3.0/json/petstore.json');

test('should return an instance of the `Oas` class', () => {
  expect(new Oas()).toBeInstanceOf(Oas);
});

test('should return an instance of the `Operation` class', () => {
  expect(new Oas(petstore).operation('/pet', 'post').getOperationId()).toBe('addPet');
});

test('should be able to dereference an OpenAPI definition', async () => {
  const oas = new Oas(JSON.parse(JSON.stringify(petstore)));
  await oas.dereference();

  expect(petstore.paths['/pet'].post.requestBody).toStrictEqual({
    $ref: '#/components/requestBodies/Pet',
  });

  const operation = oas.operation('/pet', 'post');
  expect(operation.schema.requestBody).toStrictEqual({
    content: {
      'application/json': { schema: expect.any(Object) },
      'application/xml': { schema: expect.any(Object) },
    },
    description: 'Pet object that needs to be added to the store',
    required: true,
  });
});
