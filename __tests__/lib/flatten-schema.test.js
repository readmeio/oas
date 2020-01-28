const flattenSchema = require('../../src/lib/flatten-schema');

const petstore = require('../fixtures/petstore');

test('should flatten schema to an array', () => {
  const schema = {
    type: 'object',
    properties: {
      category: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    },
  };

  expect(flattenSchema(schema)).toStrictEqual([
    {
      name: 'category',
      type: '[String]',
      description: undefined,
    },
  ]);
});

test('should flatten a component schema to an array', () => {
  const schema = petstore.components.schemas.Pet;

  expect(flattenSchema(schema, petstore)).toStrictEqual([
    { name: 'id', type: 'Integer', description: undefined },
    { name: 'category', type: 'Object', description: undefined },
    { name: 'category.id', type: 'Integer', description: undefined },
    { name: 'category.name', type: 'String', description: undefined },
    { name: 'name', type: 'String', description: undefined },
    { name: 'photoUrls', type: '[String]', description: undefined },
    { name: 'tags', type: '[Object]', description: undefined },
    { name: 'tags[].id', type: 'Integer', description: undefined },
    { name: 'tags[].name', type: 'String', description: undefined },
    { name: 'status', type: 'String', description: 'pet status in the store' },
  ]);
});

describe('$ref usages', () => {
  const schema = {
    properties: {
      responses: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/ApiResponse',
        },
      },
      tag: {
        $ref: '#/components/schemas/Tag',
      },
    },
  };

  const expected = [
    { name: 'responses', type: '[Object]', description: undefined },
    { name: 'responses[].code', type: 'Integer', description: undefined },
    { name: 'responses[].type', type: 'String', description: undefined },
    { name: 'responses[].message', type: 'String', description: undefined },
    { name: 'tag', type: 'Object', description: undefined },
    { name: 'tag.id', type: 'Integer', description: undefined },
    { name: 'tag.name', type: 'String', description: undefined },
  ];

  it('should flatten a schema that is a mix of objects and arrays', () => {
    expect(flattenSchema(schema, petstore)).toStrictEqual(expected);
  });

  it('should flatten a schema that is a mix of objects and arrays but without explicit `type` properties set`', () => {
    const oas = {
      components: {
        schemas: {
          ApiResponse: {
            properties: petstore.components.schemas.ApiResponse.properties,
          },
          Tag: {
            properties: petstore.components.schemas.Tag.properties,
          },
        },
      },
    };

    expect(flattenSchema(schema, oas)).toStrictEqual(expected);
  });
});
