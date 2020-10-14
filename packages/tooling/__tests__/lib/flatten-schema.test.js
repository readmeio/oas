const flattenSchema = require('../../src/lib/flatten-schema');

const petstore = require('@readme/oas-examples/3.0/json/petstore');
const petstoreExpanded = require('@readme/oas-examples/3.0/json/petstore-expanded');

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

  it('should flatten a complex schema that mixes $ref and allOf', () => {
    const complexSchema = {
      allOf: [
        {
          $ref: '#/components/schemas/BaseRecord',
        },
        {
          properties: {
            applicationId: {
              $ref: '#/components/schemas/ApplicationId',
            },
            closingEnd: {
              description: 'Closing end timestamp',
              example: '2019-10-30T04:25:30.000Z',
              format: 'date-time',
              type: 'string',
            },
            itemType: {
              $ref: '#/components/schemas/ItemType',
            },
            documentReferences: {
              description: 'List of documents',
              items: {
                $ref: '#/components/schemas/DocumentReference',
              },
              type: 'array',
            },
          },
          type: 'object',
        },
      ],
    };

    const oas = {
      components: {
        schemas: {
          ApplicationId: {
            description: 'The UUID of the application.',
            type: 'string',
          },
          BaseRecord: {
            type: 'object',
            properties: {
              createdAt: {
                description: 'Creation Date',
                type: 'string',
              },
              id: {
                description: 'Record ID',
                type: 'string',
              },
            },
          },
          DesignationEnum: {
            description: 'The designation enum',
            enum: ['YES', 'NO', 'MAYBE'],
            type: 'string',
          },
          DocumentReference: {
            allOf: [
              {
                $ref: '#/components/schemas/BaseRecord',
              },
              {
                properties: {
                  documentDesignation: {
                    $ref: '#/components/schemas/DesignationEnum',
                  },
                  documentID: {
                    description: 'Document ID',
                    type: 'string',
                  },
                },
                type: 'object',
              },
            ],
          },
          ItemType: {
            description: 'The type of item',
            enum: ['DOG', 'CAT'],
            type: 'string',
          },
        },
      },
    };

    expect(flattenSchema(complexSchema, oas)).toStrictEqual([
      { name: 'createdAt', type: 'String', description: 'Creation Date' },
      { name: 'id', type: 'String', description: 'Record ID' },
      { name: 'applicationId', type: 'String', description: 'The UUID of the application.' },
      { name: 'closingEnd', type: 'String', description: 'Closing end timestamp' },
      { name: 'itemType', type: 'String', description: 'The type of item' },
      { name: 'documentReferences[].createdAt', type: 'String', description: 'Creation Date' },
      { name: 'documentReferences[].id', type: 'String', description: 'Record ID' },
      { name: 'documentReferences[].documentDesignation', type: 'String', description: 'The designation enum' },
      { name: 'documentReferences[].documentID', type: 'String', description: 'Document ID' },
    ]);
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

    it("should be able to handle an allOf that's nested a level down", () => {
      // eslint-disable-next-line global-require
      const oas = require('../__fixtures__/nested-allof-flattening.json');
      const schema = oas.components.schemas.extendedAttribute;

      expect(flattenSchema(schema, oas)).toStrictEqual([
        { name: 'createdOn', type: 'String', description: undefined },
        { name: 'lastModifiedOn', type: 'String', description: undefined },
        { name: 'application.href', type: 'String', description: undefined },
        { name: 'application.title', type: 'String', description: undefined },
        { name: 'application.metadata', type: 'Object', description: undefined },
        { name: 'application.metadata.createdOn', type: 'String', description: undefined },
        { name: 'application.metadata.lastModifiedOn', type: 'String', description: undefined },
        { name: 'application.source', type: 'Object', description: undefined },
        { name: 'application.source.href', type: 'String', description: undefined },
        { name: 'application.source.title', type: 'String', description: undefined },
        { name: 'application.source.metadata', type: 'Object', description: undefined },
        { name: 'value', type: 'String', description: undefined },
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
