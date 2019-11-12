const findSchemaDefinition = require('../../src/lib/find-schema-definition');

test('should throw an error if there is an invalid ref', () => {
  expect(() => findSchemaDefinition('some-other-ref', {})).toThrow(
    /Could not find a definition for/,
  );
});

test('should throw an error if there is a missing ref', () => {
  expect(() => findSchemaDefinition('#/components/schemas/user', {})).toThrow(
    /Could not find a definition for/,
  );
});
