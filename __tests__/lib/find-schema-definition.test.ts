import petstore from '@readme/oas-examples/3.0/json/petstore.json';

import findSchemaDefinition from '../../src/lib/find-schema-definition';

test('should return a definition for a given ref', () => {
  expect(findSchemaDefinition('#/components/schemas/Pet', petstore)).toStrictEqual(petstore.components.schemas.Pet);
});

test('should return a definition for a given ref that is escaped', () => {
  expect(
    findSchemaDefinition('#/components/schemas/Pet~1Error', {
      components: {
        schemas: {
          'Pet/Error': petstore.components.schemas.ApiResponse,
        },
      },
    })
  ).toStrictEqual(petstore.components.schemas.ApiResponse);
});

test('should return false for an empty ref', () => {
  expect(findSchemaDefinition('', {})).toBe(false);
});

test('should throw an error if there is an invalid ref', () => {
  expect(() => findSchemaDefinition('some-other-ref', {})).toThrow(/Could not find a definition for/);
});

test('should throw an error if there is a missing ref', () => {
  expect(() => findSchemaDefinition('#/components/schemas/user', {})).toThrow(/Could not find a definition for/);
});

test("should throw an error if an escaped ref isn't present its non-escaped format", () => {
  expect(() => {
    findSchemaDefinition('#/components/schemas/Pet~1Errore', {
      components: {
        schemas: {
          // This should be written in the schema as `Pet/Error`.
          'Pet~1Error': {},
        },
      },
    });
  }).toThrow(/Could not find a definition for/);
});
