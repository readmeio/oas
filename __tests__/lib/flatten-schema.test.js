const Oas = require('../../src');
const flattenSchema = require('../../src/lib/flatten-schema');

const petstore = require('@readme/oas-examples/3.0/json/petstore.json');
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

test('should flatten a component schema to an array', async () => {
  const oas = new Oas(petstore);
  await oas.dereference();

  const schema = oas.components.schemas.Pet;

  expect(flattenSchema(schema)).toStrictEqual([
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
  it.each([
    ['should flatten a schema that is a mix of objects and arrays', false],
    ['should flatten a schema that is a mix of objects and arrays but without explicit `type` properties set`', true],
  ])('%s', async (tc, withMissingTypes = false) => {
    const schema = { ...petstore };
    schema.components.schemas.refUsages = {
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

    if (withMissingTypes) {
      schema.components.schemas.ApiResponse = {
        properties: schema.components.schemas.ApiResponse.properties,
      };

      schema.components.schemas.Tag = {
        properties: schema.components.schemas.Tag.properties,
      };
    }

    const oas = new Oas(schema);
    await oas.dereference();

    expect(flattenSchema(oas.components.schemas.refUsages)).toStrictEqual([
      { name: 'responses', type: '[Object]', description: undefined },
      { name: 'responses[].code', type: 'Integer', description: undefined },
      { name: 'responses[].type', type: 'String', description: undefined },
      { name: 'responses[].message', type: 'String', description: undefined },
      { name: 'tag', type: 'Object', description: undefined },
      { name: 'tag.id', type: 'Integer', description: undefined },
      { name: 'tag.name', type: 'String', description: undefined },
    ]);
  });

  it('should flatten a complex schema that mixes $ref and allOf', async () => {
    const oas = new Oas({
      components: {
        schemas: {
          complexSchema: {
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
          },
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
    });

    await oas.dereference();

    expect(await flattenSchema(oas.components.schemas.complexSchema)).toStrictEqual([
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

  describe('external $refs', () => {
    it('should ignore an external $ref inside of an array', async () => {
      const schema = { ...petstore };
      schema.components.schemas.externalSchema = {
        properties: {
          responses: {
            type: 'array',
            items: {
              $ref: 'https://example.com/ApiResponse.yaml',
            },
          },
          tag: {
            $ref: '#/components/schemas/Tag',
          },
        },
      };

      const oas = new Oas(schema);
      await oas.dereference();

      expect(await flattenSchema(oas.components.schemas.externalSchema)).toStrictEqual([
        { name: 'responses', type: '[Circular]', description: undefined },
        { name: 'tag', type: 'Object', description: undefined },
        { name: 'tag.id', type: 'Integer', description: undefined },
        { name: 'tag.name', type: 'String', description: undefined },
      ]);
    });

    it('should ignore an external $ref on an object', async () => {
      const schema = { ...petstore };
      schema.components.schemas.externalSchema = {
        properties: {
          responses: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/ApiResponse',
            },
          },
          tag: {
            $ref: 'https://example.com/Tag.yaml',
          },
        },
      };

      const oas = new Oas(schema);
      await oas.dereference();

      expect(await flattenSchema(oas.components.schemas.externalSchema)).toStrictEqual([
        { name: 'responses', type: '[Object]', description: undefined },
        { name: 'responses[].code', type: 'Integer', description: undefined },
        { name: 'responses[].type', type: 'String', description: undefined },
        { name: 'responses[].message', type: 'String', description: undefined },
        { name: 'tag', type: 'Circular', description: undefined },
      ]);
    });
  });

  describe('circular $ref', () => {
    const schema = {
      components: {
        schemas: {
          Customfields: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Customfields',
            },
          },
          offset: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              rules: { $ref: '#/components/schemas/rules' },
            },
          },
          offsetTransition: {
            type: 'object',
            properties: {
              dateTime: { type: 'string', format: 'date-time' },
              offsetAfter: { $ref: '#/components/schemas/offset' },
              offsetBefore: { $ref: '#/components/schemas/offset' },
            },
          },
          rules: {
            type: 'object',
            properties: {
              transitions: {
                type: 'array',
                items: { $ref: '#/components/schemas/offsetTransition' },
              },
            },
          },
        },
      },
    };

    it('should not recurse a circular $ref inside of an objects properties', async () => {
      schema.components.schemas.circularSchema = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
            },
            fields: {
              $ref: '#/components/schemas/Customfields',
            },
          },
        },
      };

      const oas = new Oas(schema);
      await oas.dereference();

      expect(flattenSchema(oas.components.schemas.circularSchema)).toStrictEqual([
        { name: 'id', type: 'Number', description: undefined },
        { name: 'fields', type: 'Circular', description: undefined },
      ]);
    });

    it('should not recurse a circular $ref inside of an array', async () => {
      schema.components.schemas.circularSchema = {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Customfields',
        },
      };

      const oas = new Oas(schema);
      await oas.dereference();

      expect(flattenSchema(oas.components.schemas.circularSchema)).toStrictEqual([]);
    });

    it("should handle a circular ref that's not harmful", async () => {
      schema.components.schemas.circularSchema = {
        type: 'object',
        properties: {
          dateTime: { type: 'string', format: 'date-time' },
          offsetAfter: { $ref: '#/components/schemas/offset' },
          offsetBefore: { $ref: '#/components/schemas/offset' },
        },
      };

      const oas = new Oas(schema);
      await oas.dereference();

      expect(await flattenSchema(oas.components.schemas.circularSchema)).toStrictEqual([
        { name: 'dateTime', type: 'String', description: undefined },
        { name: 'offsetAfter', type: 'Circular', description: undefined },
        { name: 'offsetBefore', type: 'Circular', description: undefined },
      ]);
    });
  });
});

describe('polymorphism cases', () => {
  describe('allOf', () => {
    // Though this is testing flattening `array<allOf>` into an array, we don't actually support rendering flattening
    // a schema as an array so we're just testing the contents of the array instead. `allOf_contents` vs
    // `array<allOf_contents>`.
    it('should flatten a schema to an array', async () => {
      const schema = { ...petstoreExpanded };
      schema.components.schemas.arrayOfPets = {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Pet',
        },
      };

      const oas = new Oas(schema);
      await oas.dereference();

      expect(flattenSchema(oas.components.schemas.arrayOfPets)).toStrictEqual([
        { name: 'name', type: 'String', description: undefined },
        { name: 'tag', type: 'String', description: undefined },
        { name: 'id', type: 'Integer', description: undefined },
      ]);
    });

    it("should be able to handle an allOf that's nested a level down", async () => {
      // eslint-disable-next-line global-require
      const schema = require('../__datasets__/nested-allof-flattening.json');
      const oas = new Oas(schema);
      await oas.dereference();

      expect(flattenSchema(oas.components.schemas.extendedAttribute)).toStrictEqual([
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

    it('should be able to handle an allOf that contains deep $refs', async () => {
      const schema = { ...petstore };
      schema.components.schemas.allOfWithDeepRefs = {
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

      schema.components.schemas.NewPet = { ...schema.components.schemas.Pet };
      delete schema.components.schemas.NewPet.properties.id;

      const oas = new Oas(schema);
      await oas.dereference();

      expect(flattenSchema(schema.components.schemas.allOfWithDeepRefs)).toStrictEqual([
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
    it('should flatten only the first schema listed', async () => {
      const oas = new Oas({
        components: {
          schemas: {
            PetByAgeOrType: {
              anyOf: [{ $ref: '#/components/schemas/PetByAge' }, { $ref: '#/components/schemas/PetByType' }],
            },
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
      });

      await oas.dereference();

      expect(flattenSchema(oas.components.schemas.PetByAgeOrType)).toStrictEqual([
        { name: 'age', type: 'Integer', description: undefined },
        { name: 'nickname', type: 'String', description: undefined },
      ]);
    });
  });

  describe('oneOf', () => {
    it('should flatten only the first schema listed', async () => {
      const oas = new Oas({
        components: {
          schemas: {
            DogOrCat: {
              oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
            },
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
      });

      await oas.dereference();

      expect(flattenSchema(oas.components.schemas.DogOrCat)).toStrictEqual([
        { name: 'hunts', type: 'Boolean', description: undefined },
        { name: 'age', type: 'Integer', description: undefined },
      ]);
    });
  });
});

test('should retain descriptions on objects', () => {
  const schema = {
    type: 'object',
    properties: {
      products: {
        type: 'array',
        items: {
          description: 'product schema description',
          type: 'object',
          properties: {
            cash: {
              description: 'cash schema description',
              type: 'object',
              properties: {
                accounts: {
                  type: 'array',
                  items: {
                    description: 'account schema description',
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        description: 'account id',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  expect(flattenSchema(schema)).toStrictEqual([
    {
      name: 'products',
      type: '[Object]',
      description: 'product schema description',
    },
    {
      name: 'products[].cash',
      type: 'Object',
      description: 'cash schema description',
    },
    {
      name: 'products[].cash.accounts',
      type: '[Object]',
      description: 'account schema description',
    },
  ]);
});
