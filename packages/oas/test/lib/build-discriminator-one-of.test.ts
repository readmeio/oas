import type { OASDocument } from '../../src/types.js';

import { describe, expect, it } from 'vitest';

import Oas from '../../src/index.js';
import { buildDiscriminatorOneOf, findDiscriminatorChildren } from '../../src/lib/build-discriminator-one-of.js';

/**
 * Creates a base OAS document structure with empty paths and optional schemas.
 */
function createOASDocument(schemas?: Record<string, unknown>): OASDocument {
  return {
    openapi: '3.0.3',
    info: { title: 'Test', version: '1.0.0' },
    paths: {},
    ...(schemas && {
      components: {
        schemas: schemas as Record<string, unknown>,
      },
    }),
  } as OASDocument;
}

/**
 * Creates a Pet schema with discriminator.
 */
function createPetSchema(discriminatorOverrides?: Record<string, unknown>) {
  return {
    type: 'object',
    properties: {
      pet_type: { type: 'string' },
    },
    discriminator: {
      propertyName: 'pet_type',
      ...discriminatorOverrides,
    },
  };
}

/**
 * Creates a Cat schema that extends Pet via allOf.
 */
function createCatSchema() {
  return {
    allOf: [
      { $ref: '#/components/schemas/Pet' },
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
    ],
  };
}

/**
 * Creates a Dog schema that extends Pet via allOf.
 */
function createDogSchema() {
  return {
    allOf: [
      { $ref: '#/components/schemas/Pet' },
      {
        type: 'object',
        properties: {
          bark: { type: 'string' },
        },
      },
    ],
  };
}

/**
 * Creates a dereferenced Cat schema (already merged).
 */
function createDereferencedCatSchema() {
  return {
    type: 'object',
    properties: {
      pet_type: { type: 'string' },
      name: { type: 'string' },
    },
    'x-readme-ref-name': 'Cat',
  };
}

/**
 * Creates a dereferenced Dog schema (already merged).
 */
function createDereferencedDogSchema() {
  return {
    type: 'object',
    properties: {
      pet_type: { type: 'string' },
      bark: { type: 'string' },
    },
    'x-readme-ref-name': 'Dog',
  };
}

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

    const petSchema = api.components.schemas.Pet as any;

    // Should have oneOf with cloned child schemas
    expect(petSchema.oneOf).toHaveLength(2);
    expect(petSchema.oneOf[0]['x-readme-ref-name']).toBe('Cat');
    expect(petSchema.oneOf[1]['x-readme-ref-name']).toBe('Dog');
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

    const petSchema = api.components.schemas.Pet as any;

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
    expect((api.components.schemas.Pet as any).oneOf).toBeUndefined();
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

    expect((api.components.schemas.Animal as any).oneOf).toHaveLength(2);
    expect((api.components.schemas.Vehicle as any).oneOf).toHaveLength(1);
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
    const spec = Oas.init(JSON.parse(JSON.stringify(inputSpec)));

    await spec.dereference();

    const petSchema = spec.api.components.schemas.Pet as any;

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
    const spec = Oas.init(JSON.parse(JSON.stringify(inputSpec)));
    await spec.dereference();

    const operation = spec.operation('/pets', 'get');
    const jsonSchema = operation.getResponseAsJSONSchema('200');

    const responseSchema = jsonSchema[0].schema as any;
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

    const spec = Oas.init(JSON.parse(JSON.stringify(specWithMapping)));
    await spec.dereference();

    const petSchema = spec.api.components.schemas.Pet as any;

    expect(petSchema.oneOf).toHaveLength(1);
    expect(petSchema.oneOf[0]['x-readme-ref-name']).toBe('Cat');
  });
});
