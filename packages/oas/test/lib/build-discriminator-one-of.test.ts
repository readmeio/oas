import type { SchemaObject } from '../../src/types.js';

import { describe, expect, it } from 'vitest';

import Oas from '../../src/index.js';
import { buildDiscriminatorOneOf, findDiscriminatorChildren } from '../../src/lib/build-discriminator-one-of.js';
import embeddedDiscriminator from '../__datasets__/embeded-discriminator.json' with { type: 'json' };
import embeddedDiscriminatorWithMapping from '../__datasets__/embeded-discriminator-with-mapping.json' with { type: 'json' };
import nestedOneOfDiscriminator from '../__datasets__/nested-oneof-discriminator.json' with { type: 'json' };
import oneOfWithDiscriminatorMapping from '../__datasets__/oneof-with-discriminator-mapping.json' with { type: 'json' };
import {
  createCatSchema,
  createDereferencedCatSchema,
  createDereferencedDogSchema,
  createDogSchema,
  createOASDocument,
  createPetSchema,
} from '../__fixtures__/create-oas.js';

describe('findDiscriminatorChildren', () => {
  it('should find child schema names for discriminator schemas', () => {
    const api = createOASDocument({
      Pet: createPetSchema(),
      Cat: createCatSchema(),
      Dog: createDogSchema(),
    });

    const childrenMap = findDiscriminatorChildren(api);

    expect(childrenMap.get('Pet')).toEqual(['Cat', 'Dog']);
  });

  it('should use discriminator mapping when available', () => {
    const api = createOASDocument({
      Pet: createPetSchema({
        mapping: {
          cat: '#/components/schemas/Cat',
          dog: '#/components/schemas/Dog',
        },
      }),
      Cat: createCatSchema(),
      Dog: createDogSchema(),
      Bird: {
        allOf: [{ $ref: '#/components/schemas/Pet' }, { type: 'object', properties: { fly: { type: 'boolean' } } }],
      },
    });

    const childrenMap = findDiscriminatorChildren(api);

    // Should only include Cat and Dog from mapping, not Bird
    expect(childrenMap.get('Pet')).toEqual(['Cat', 'Dog']);
  });

  it('should not include schemas that already have oneOf', () => {
    const api = createOASDocument({
      Pet: {
        type: 'object',
        oneOf: [{ $ref: '#/components/schemas/Cat' }],
        discriminator: {
          propertyName: 'pet_type',
        },
      },
      Cat: createCatSchema(),
    });

    const childrenMap = findDiscriminatorChildren(api);

    // Should not include Pet since oneOf already exists
    expect(childrenMap.has('Pet')).toBe(false);
  });

  it('should not include schemas with no child schemas found', () => {
    const api = createOASDocument({
      Pet: createPetSchema(),
      // No child schemas that extend Pet via allOf
      Cat: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
    });

    const childrenMap = findDiscriminatorChildren(api);

    expect(childrenMap.has('Pet')).toBe(false);
  });

  it('should handle API without components', () => {
    const api = createOASDocument();

    const childrenMap = findDiscriminatorChildren(api);

    expect(childrenMap.size).toBe(0);
  });
});

describe('buildDiscriminatorOneOf', () => {
  it('should build oneOf from the children map', () => {
    const api = createOASDocument({
      Pet: createPetSchema(),
      Cat: createDereferencedCatSchema(),
      Dog: createDereferencedDogSchema(),
    });

    const childrenMap = new Map([['Pet', ['Cat', 'Dog']]]);

    buildDiscriminatorOneOf(api, childrenMap);

    const petSchema = api.components?.schemas?.Pet as SchemaObject;

    // Should have oneOf with cloned child schemas
    expect(petSchema.oneOf).toHaveLength(2);
    expect(petSchema.oneOf?.[0]['x-readme-ref-name']).toBe('Cat');
    expect(petSchema.oneOf?.[1]['x-readme-ref-name']).toBe('Dog');
  });

  it('should handle missing child schemas gracefully', () => {
    const api = createOASDocument({
      Pet: {
        type: 'object',
        discriminator: { propertyName: 'pet_type' },
      },
      Cat: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
    });

    const childrenMap = new Map([['Pet', ['Cat', 'NonExistent']]]);

    buildDiscriminatorOneOf(api, childrenMap);

    const petSchema = api.components?.schemas?.Pet as any;

    // Should only have Cat since NonExistent doesn't exist
    expect(petSchema.oneOf).toHaveLength(1);
  });

  it('should handle empty children map', () => {
    const api = createOASDocument({
      Pet: {
        type: 'object',
        discriminator: { propertyName: 'pet_type' },
      },
    });

    const childrenMap = new Map();

    buildDiscriminatorOneOf(api, childrenMap);

    // Should not add oneOf since map is empty
    expect((api.components?.schemas?.Pet as any).oneOf).toBeUndefined();
  });

  it('should handle multiple discriminator schemas independently', () => {
    const api = createOASDocument({
      Animal: {
        type: 'object',
        discriminator: { propertyName: 'animal_type' },
      },
      Vehicle: {
        type: 'object',
        discriminator: { propertyName: 'vehicle_type' },
      },
      Cat: { type: 'object', 'x-readme-ref-name': 'Cat' },
      Dog: { type: 'object', 'x-readme-ref-name': 'Dog' },
      Car: { type: 'object', 'x-readme-ref-name': 'Car' },
    });

    const childrenMap = new Map([
      ['Animal', ['Cat', 'Dog']],
      ['Vehicle', ['Car']],
    ]);

    buildDiscriminatorOneOf(api, childrenMap);

    expect((api.components?.schemas?.Animal as SchemaObject).oneOf).toHaveLength(2);
    expect((api.components?.schemas?.Vehicle as SchemaObject).oneOf).toHaveLength(1);
  });
});

describe('before/after transformation', () => {
  const inputSpec = {
    openapi: '3.1.0',
    info: { title: 'Pet API', version: '1.0.0' },
    paths: {
      '/pets': {
        get: {
          summary: 'Get all pets',
          responses: {
            '200': {
              description: 'A list of pets',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      pets: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Pet' },
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
    components: {
      schemas: {
        Pet: {
          type: 'object',
          required: ['pet_type'],
          properties: {
            pet_type: { type: 'string' },
          },
          discriminator: {
            propertyName: 'pet_type',
          },
        },
        Cat: {
          allOf: [
            { $ref: '#/components/schemas/Pet' },
            {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          ],
        },
        Dog: {
          allOf: [
            { $ref: '#/components/schemas/Pet' },
            {
              type: 'object',
              properties: {
                bark: { type: 'string' },
              },
            },
          ],
        },
      },
    },
  };

  it('Pet schema has oneOf listing all child schemas', async () => {
    const spec = Oas.init(structuredClone(inputSpec));
    await spec.dereference();

    const petSchema = spec.api.components?.schemas?.Pet as any;

    // Pet now has oneOf listing Cat and Dog
    expect(petSchema.discriminator).toEqual({ propertyName: 'pet_type' });
    expect(petSchema.oneOf).toBeDefined();
    expect(petSchema.oneOf).toHaveLength(2);

    // Each oneOf option has x-readme-ref-name identifying it
    const refNames = petSchema.oneOf.map((s: any) => s['x-readme-ref-name']);
    expect(refNames).toContain('Cat');
    expect(refNames).toContain('Dog');
  });

  it('AFTER: response schema correctly shows polymorphic options in nested references', async () => {
    const spec = Oas.init(structuredClone(inputSpec));
    await spec.dereference();

    const operation = spec.operation('/pets', 'get');
    const jsonSchema = operation.getResponseAsJSONSchema('200');

    const responseSchema = jsonSchema?.[0].schema as any;
    const itemsSchema = responseSchema.properties.pets.items;

    expect(itemsSchema.discriminator).toEqual({ propertyName: 'pet_type' });
    expect(itemsSchema.oneOf).toHaveLength(2);

    const refNames = itemsSchema.oneOf.map((s: any) => s['x-readme-ref-name']);
    expect(refNames).toContain('Cat');
    expect(refNames).toContain('Dog');
  });

  it('should respect discriminator.mapping when explicitly defined', async () => {
    const specWithMapping = {
      ...inputSpec,
      components: {
        schemas: {
          Pet: {
            type: 'object',
            required: ['pet_type'],
            properties: { pet_type: { type: 'string' } },
            discriminator: {
              propertyName: 'pet_type',
              mapping: {
                cat: '#/components/schemas/Cat',
                // Dog is NOT in the mapping
              },
            },
          },
          Cat: {
            allOf: [{ $ref: '#/components/schemas/Pet' }, { type: 'object', properties: { name: { type: 'string' } } }],
          },
          Dog: {
            allOf: [{ $ref: '#/components/schemas/Pet' }, { type: 'object', properties: { bark: { type: 'string' } } }],
          },
        },
      },
    };

    const spec = Oas.init(structuredClone(specWithMapping));
    await spec.dereference();

    const petSchema = spec.api.components?.schemas?.Pet as any;

    expect(petSchema.oneOf).toHaveLength(1);
    expect(petSchema.oneOf[0]['x-readme-ref-name']).toBe('Cat');
  });

  it('should NOT add oneOf to child schema (Cat) when referenced directly', async () => {
    const spec = Oas.init(structuredClone(embeddedDiscriminator));
    await spec.dereference();

    // Check raw dereferenced schema - embedded Pet in allOf should NOT have oneOf
    const catSchema = spec.api.components?.schemas?.Cat as any;
    expect(catSchema).toStrictEqual({
      allOf: [
        {
          type: 'object',
          required: ['pet_type'],
          properties: {
            pet_type: {
              type: 'string',
              description: 'The type of pet',
            },
          },
          discriminator: {
            propertyName: 'pet_type',
          },
          'x-readme-ref-name': 'Pet',
        },
        {
          type: 'object',
          properties: {
            hunts: {
              type: 'boolean',
              description: 'Whether the cat hunts',
            },
            age: {
              type: 'integer',
              description: 'Age of the cat in years',
              minimum: 0,
            },
            meow: {
              type: 'string',
              description: "The cat's meow sound",
              default: 'Meow',
            },
          },
        },
      ],
      'x-readme-ref-name': 'Cat',
    });

    // Check final merged schema via getParametersAsJSONSchema - should merge cleanly without oneOf
    const operation = spec.operation('/reference-child-directly', 'post');
    const jsonSchema = operation.getParametersAsJSONSchema();
    const bodySchema = jsonSchema?.find(p => p.type === 'body')?.schema as any;

    // The merged schema should NOT have oneOf
    // Should have merged properties from both Pet and Cat
    expect(bodySchema.oneOf).toBeUndefined();
    expect(bodySchema.properties).toStrictEqual({
      pet_type: {
        type: 'string',
        description: 'The type of pet',
      },
      hunts: {
        type: 'boolean',
        description: 'Whether the cat hunts',
      },
      age: {
        type: 'integer',
        description: 'Age of the cat in years',
        minimum: 0,
      },
      meow: {
        type: 'string',
        description: "The cat's meow sound",
        default: 'Meow',
      },
    });
    expect(bodySchema['x-readme-ref-name']).toBe('Cat');
  });

  it('should NOT add oneOf to child schema (Cat) when Pet has discriminator.mapping', async () => {
    const spec = Oas.init(structuredClone(embeddedDiscriminatorWithMapping));
    await spec.dereference();

    // Check raw dereferenced schema - embedded Pet in allOf should NOT have oneOf
    const catSchema = spec.api.components?.schemas?.Cat;
    expect(catSchema).toStrictEqual({
      allOf: [
        {
          type: 'object',
          required: ['pet_type'],
          properties: {
            pet_type: {
              type: 'string',
            },
          },
          discriminator: {
            propertyName: 'pet_type',
            mapping: {
              cat: '#/components/schemas/Cat',
              dog: '#/components/schemas/Dog',
            },
          },
          'x-readme-ref-name': 'Pet',
        },
        {
          type: 'object',
          properties: {
            meow: {
              type: 'string',
            },
          },
        },
      ],
      'x-readme-ref-name': 'Cat',
    });

    // Check final merged schema via getParametersAsJSONSchema - should merge cleanly without oneOf
    const operation = spec.operation('/reference-child-directly', 'post');
    const jsonSchema = operation.getParametersAsJSONSchema();
    const bodySchema = jsonSchema?.find(p => p.type === 'body')?.schema as any;

    // The merged schema should NOT have oneOf
    // Should have merged properties from both Pet and Cat
    expect(bodySchema.oneOf).toBeUndefined();
    expect(bodySchema.properties).toStrictEqual({
      pet_type: {
        type: 'string',
      },
      meow: {
        type: 'string',
      },
    });
    expect(bodySchema['x-readme-ref-name']).toBe('Cat');
  });

  it('should still build oneOf on parent when both direct parent ref and child oneOf exist', async () => {
    const spec = Oas.init(structuredClone(embeddedDiscriminator));
    await spec.dereference();

    const petSchema = spec.api.components?.schemas?.Pet;

    // Pet should still have oneOf even though children are also used in a oneOf elsewhere
    expect(petSchema).toStrictEqual({
      type: 'object',
      required: ['pet_type'],
      properties: {
        pet_type: {
          type: 'string',
          description: 'The type of pet',
        },
      },
      discriminator: {
        propertyName: 'pet_type',
      },
      oneOf: [
        {
          allOf: [
            {
              type: 'object',
              required: ['pet_type'],
              properties: {
                pet_type: {
                  type: 'string',
                  description: 'The type of pet',
                },
              },
              discriminator: {
                propertyName: 'pet_type',
              },
              'x-readme-ref-name': 'Pet',
            },
            {
              type: 'object',
              properties: {
                hunts: {
                  type: 'boolean',
                  description: 'Whether the cat hunts',
                },
                age: {
                  type: 'integer',
                  description: 'Age of the cat in years',
                  minimum: 0,
                },
                meow: {
                  type: 'string',
                  description: "The cat's meow sound",
                  default: 'Meow',
                },
              },
            },
          ],
          'x-readme-ref-name': 'Cat',
        },
        {
          allOf: [
            {
              type: 'object',
              required: ['pet_type'],
              properties: {
                pet_type: {
                  type: 'string',
                  description: 'The type of pet',
                },
              },
              discriminator: {
                propertyName: 'pet_type',
              },
              'x-readme-ref-name': 'Pet',
            },
            {
              type: 'object',
              properties: {
                bark: {
                  type: 'boolean',
                  description: 'Whether the dog barks',
                },
                breed: {
                  type: 'string',
                  enum: ['Dingo', 'Husky', 'Retriever', 'Shepherd'],
                  description: 'Breed of the dog',
                },
                woof: {
                  type: 'string',
                  description: "The dog's bark sound",
                  default: 'Woof',
                },
              },
            },
          ],
          'x-readme-ref-name': 'Dog',
        },
      ],
      'x-readme-ref-name': 'Pet',
    });
  });

  it('should NOT add oneOf to child schema when oneOf is nested inside properties', async () => {
    const spec = Oas.init(structuredClone(nestedOneOfDiscriminator));
    await spec.dereference();

    // Check raw dereferenced Cat schema - embedded Pet in allOf should NOT have oneOf
    const catSchema = spec.api.components?.schemas?.Cat;
    expect(catSchema).toStrictEqual({
      allOf: [
        {
          type: 'object',
          required: ['pet_type'],
          properties: {
            pet_type: {
              type: 'string',
            },
          },
          discriminator: {
            propertyName: 'pet_type',
          },
          'x-readme-ref-name': 'Pet',
        },
        {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
            pet_type: {
              type: 'string',
              enum: ['Cat'],
            },
          },
        },
      ],
      'x-readme-ref-name': 'Cat',
    });

    // Check final schema via getParametersAsJSONSchema - each oneOf option should NOT have nested oneOf
    const operation = spec.operation('/pets', 'post');
    const jsonSchema = operation.getParametersAsJSONSchema();
    const bodySchema = jsonSchema?.find(p => p.type === 'body')?.schema as any;

    // The nested oneOf options should merge cleanly without their own oneOf
    expect(bodySchema.properties.test.oneOf).toHaveLength(2);
    for (const option of bodySchema.properties.test.oneOf) {
      expect(option.oneOf).toBeUndefined();
    }
  });

  it('should NOT add oneOf to child schema when oneOf is nested inside array items', async () => {
    const spec = Oas.init(structuredClone(nestedOneOfDiscriminator));
    await spec.dereference();

    // Check raw dereferenced Cat schema - embedded Pet in allOf should NOT have oneOf
    const catSchema = spec.api.components?.schemas?.Cat;
    expect(catSchema).toStrictEqual({
      allOf: [
        {
          type: 'object',
          required: ['pet_type'],
          properties: {
            pet_type: {
              type: 'string',
            },
          },
          discriminator: {
            propertyName: 'pet_type',
          },
          'x-readme-ref-name': 'Pet',
        },
        {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
            pet_type: {
              type: 'string',
              enum: ['Cat'],
            },
          },
        },
      ],
      'x-readme-ref-name': 'Cat',
    });

    // Check final schema via getParametersAsJSONSchema - each oneOf option should NOT have nested oneOf
    const operation = spec.operation('/pets-array', 'post');
    const jsonSchema = operation.getParametersAsJSONSchema();
    const bodySchema = jsonSchema?.find(p => p.type === 'body')?.schema as any;

    // The nested oneOf options should merge cleanly without their own oneOf
    expect(bodySchema.items.oneOf).toHaveLength(2);
    for (const option of bodySchema.items.oneOf) {
      expect(option.oneOf).toBeUndefined();
    }
  });

  it('should NOT add oneOf to child schema when parent has discriminator.mapping and oneOf is at root', async () => {
    const spec = Oas.init(structuredClone(oneOfWithDiscriminatorMapping));
    await spec.dereference();

    // Check raw dereferenced Cat schema - embedded Pet in allOf should NOT have oneOf
    const catSchema = spec.api.components?.schemas?.Cat;
    expect(catSchema).toStrictEqual({
      allOf: [
        {
          type: 'object',
          required: ['pet_type'],
          properties: {
            pet_type: {
              type: 'string',
            },
          },
          discriminator: {
            propertyName: 'pet_type',
            mapping: {
              Cat: '#/components/schemas/Cat',
              Dog: '#/components/schemas/Dog',
              Lizard: '#/components/schemas/Lizard',
            },
          },
          'x-readme-ref-name': 'Pet',
        },
        {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
            pet_type: {
              type: 'string',
              enum: ['Cat'],
            },
          },
        },
      ],
      'x-readme-ref-name': 'Cat',
    });

    // Check final schema via getParametersAsJSONSchema - each oneOf option should NOT have nested oneOf
    const operation = spec.operation('/pets', 'post');
    const jsonSchema = operation.getParametersAsJSONSchema();
    const bodySchema = jsonSchema?.find(p => p.type === 'body')?.schema as any;

    // The oneOf options should merge cleanly without their own oneOf
    expect(bodySchema.oneOf).toHaveLength(2);
    for (const option of bodySchema.oneOf) {
      expect(option.oneOf).toBeUndefined();
    }
  });
});
