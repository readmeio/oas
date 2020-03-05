const petstore = require('@readme/oas-examples/3.0/json/petstore.json');
const findSchemaDefinition = require('../../src/lib/find-schema-definition');

test('should return a definition for a given ref', () => {
  expect(findSchemaDefinition('#/components/schemas/Pet', petstore)).toStrictEqual(petstore.components.schemas.Pet);
});

test('should return a definition for a given ref that is escaped', () => {
  expect(
    findSchemaDefinition('#/components/schemas/Pet~1Error', {
      components: {
        schemas: {
          'Pet/Error': petstore.components.schemas.Error,
        },
      },
    })
  ).toStrictEqual(petstore.components.schemas.Error);
});

test('should throw an error if there is an invalid ref', () => {
  expect(() => findSchemaDefinition('some-other-ref', {})).toThrow(/Could not find a definition for/);
});

test('should throw an error if there is a missing ref', () => {
  expect(() => findSchemaDefinition('#/components/schemas/user', {})).toThrow(/Could not find a definition for/);
});

test("should throw an error if an escaped ref isn't present its non-escaped format", () => {
  expect(() => {
    findSchemaDefinition('#/components/schemas/Pet~1Error', {
      components: {
        schemas: {
          // This should be written in the schema as `Pet/Error`.
          'Pet~1Error': {},
        },
      },
    });
  }).toThrow(/Could not find a definition for/);
});
