const flattenSchema = require('../../src/lib/flatten-schema');

const petstore = require('../__fixtures__/petstore.json');
const petstoreExpanded = require('@readme/oas-examples/3.0/json/petstore-expanded.json');

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

describe('polymorphism cases', () => {
  describe('allOf', () => {
    it('should flatten a schema to an array', () => {
      const schema = {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Pet',
        },
      };

      expect(flattenSchema(schema, petstoreExpanded)).toStrictEqual([
        { name: 'name', type: 'String', description: undefined },
        { name: 'tag', type: 'String', description: undefined },
        { name: 'id', type: 'Integer', description: undefined },
      ]);
    });

    it('should flatten a component schema to an array', () => {
      const schema = petstoreExpanded.components.schemas.Pet;

      expect(flattenSchema(schema, petstoreExpanded)).toStrictEqual([
        { name: 'name', type: 'String', description: undefined },
        { name: 'tag', type: 'String', description: undefined },
        { name: 'id', type: 'Integer', description: undefined },
      ]);
    });

    it('should be able to handle an allOf that contains deep $refs', () => {
      const schema = {
        allOf: [
          {
            $ref: '#/components/schemas/NewPet',
          },
          {
            type: 'object',
            required: ['id'],
            properties: {
              id: {
                type: 'integer',
                format: 'int64',
              },
            },
          },
        ],
      };

      const newPetSchema = petstore.components.schemas.Pet;
      delete newPetSchema.properties.id;

      expect(
        flattenSchema(schema, {
          components: {
            schemas: {
              Category: petstore.components.schemas.Category,
              NewPet: newPetSchema,
              Tag: petstore.components.schemas.Tag,
            },
          },
        })
      ).toStrictEqual([
        { name: 'category', type: 'Object', description: undefined },
        { name: 'category.id', type: 'Integer', description: undefined },
        { name: 'category.name', type: 'String', description: undefined },
        { name: 'name', type: 'String', description: undefined },
        { name: 'photoUrls', type: '[String]', description: undefined },
        { name: 'tags', type: '[Object]', description: undefined },
        { name: 'tags[].id', type: 'Integer', description: undefined },
        { name: 'tags[].name', type: 'String', description: undefined },
        { name: 'status', type: 'String', description: 'pet status in the store' },
        { name: 'id', type: 'Integer', description: undefined },
      ]);
    });
  });

  describe('anyOf', () => {
    it('should flatten only the first schema listed', () => {
      const schema = {
        anyOf: [{ $ref: '#/components/schemas/PetByAge' }, { $ref: '#/components/schemas/PetByType' }],
      };

      expect(
        flattenSchema(schema, {
          components: {
            schemas: {
              PetByAge: {
                type: 'object',
                properties: {
                  age: {
                    type: 'integer',
                  },
                  nickname: {
                    type: 'string',
                  },
                },
                required: ['age'],
              },
              PetByType: {
                type: 'object',
                properties: {
                  pet_type: {
                    type: 'string',
                    enum: ['Cat', 'Dog'],
                  },
                  hunts: {
                    type: 'boolean',
                  },
                },
                required: ['pet_type'],
              },
            },
          },
        })
      ).toStrictEqual([
        { name: 'age', type: 'Integer', description: undefined },
        { name: 'nickname', type: 'String', description: undefined },
      ]);
    });
  });

  describe('oneOf', () => {
    it('should flatten only the first schema listed', () => {
      const schema = {
        oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
      };

      expect(
        flattenSchema(schema, {
          components: {
            schemas: {
              Dog: {
                type: 'object',
                properties: {
                  bark: {
                    type: 'boolean',
                  },
                  breed: {
                    type: 'string',
                    enum: ['Dingo', 'Husky', 'Retriever', 'Shepherd'],
                  },
                },
              },
              Cat: {
                type: 'object',
                properties: {
                  hunts: {
                    type: 'boolean',
                  },
                  age: {
                    type: 'integer',
                  },
                },
              },
            },
          },
        })
      ).toStrictEqual([
        { name: 'hunts', type: 'Boolean', description: undefined },
        { name: 'age', type: 'Integer', description: undefined },
      ]);
    });
  });
});
