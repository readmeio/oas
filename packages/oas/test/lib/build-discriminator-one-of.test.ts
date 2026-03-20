import { describe, expect, it } from 'vitest';

import Oas from '../../src/index.js';
import { findDiscriminatorChildren } from '../../src/lib/build-discriminator-one-of.js';
import embeddedDiscriminator from '../__datasets__/embeded-discriminator.json' with { type: 'json' };
import embeddedDiscriminatorWithMapping from '../__datasets__/embeded-discriminator-with-mapping.json' with { type: 'json' };
import nestedOneOfDiscriminator from '../__datasets__/nested-oneof-discriminator.json' with { type: 'json' };
import oneOfWithDiscriminatorMapping from '../__datasets__/oneof-with-discriminator-mapping.json' with { type: 'json' };
import { createCatSchema, createDogSchema, createOASDocument, createPetSchema } from '../__fixtures__/create-oas.js';

describe('#findDiscriminatorChildren', () => {
  it('should find child schema names for discriminator schemas', () => {
    const api = createOASDocument({
      Pet: createPetSchema(),
      Cat: createCatSchema(),
      Dog: createDogSchema(),
    });

    const { children: childrenMap, refs: childrenRefMap } = findDiscriminatorChildren(api);

    expect(childrenMap.get('Pet')).toEqual(['Cat', 'Dog']);
    expect(childrenRefMap.get('Cat')).toEqual('#/components/schemas/Cat');
    expect(childrenRefMap.get('Dog')).toEqual('#/components/schemas/Dog');
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

    const { children: childrenMap, refs: childrenRefMap } = findDiscriminatorChildren(api);

    // Should only include Cat and Dog from mapping, not Bird
    expect(childrenMap.get('Pet')).toEqual(['Cat', 'Dog']);
    expect(childrenRefMap.get('Cat')).toEqual('#/components/schemas/Cat');
    expect(childrenRefMap.get('Dog')).toEqual('#/components/schemas/Dog');
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

    const { children: childrenMap, refs: childrenRefMap } = findDiscriminatorChildren(api);

    // Should not include Pet since oneOf already exists
    expect(childrenMap.has('Pet')).toBe(false);
    expect(childrenRefMap.size).toBe(0);
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

    const { children: childrenMap, refs: childrenRefMap } = findDiscriminatorChildren(api);

    expect(childrenMap.has('Pet')).toBe(false);
    expect(childrenRefMap.size).toBe(0);
  });

  it('should handle API without components', () => {
    const api = createOASDocument();

    const { children: childrenMap, refs: childrenRefMap } = findDiscriminatorChildren(api);

    expect(childrenMap.size).toBe(0);
    expect(childrenRefMap.size).toBe(0);
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

  it('response schema correctly shows polymorphic options in nested references', () => {
    const spec = Oas.init(structuredClone(inputSpec));
    const operation = spec.operation('/pets', 'get');

    const jsonSchema = operation.getResponseAsJSONSchema('200');

    const responseSchema = jsonSchema?.[0].schema as any;
    expect(responseSchema.properties.pets.items).toStrictEqual({
      $ref: '#/components/schemas/Pet',
    });

    const petSchema = responseSchema.components.schemas.Pet;

    expect(petSchema.discriminator).toEqual({ propertyName: 'pet_type' });
    expect(petSchema.oneOf).toStrictEqual([{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }]);
  });

  it('should NOT add oneOf to child schema (Cat) when referenced directly', () => {
    const spec = Oas.init(structuredClone(embeddedDiscriminator));
    const operation = spec.operation('/reference-child-directly', 'post');

    const jsonSchema = operation.getParametersAsJSONSchema();
    const catSchema = jsonSchema?.[0].schema.components?.schemas?.Cat;

    expect(catSchema?.oneOf).toBeUndefined();
    expect(catSchema?.properties).toStrictEqual({
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
    expect(catSchema?.['x-readme-ref-name']).toBe('Cat');
  });

  it('should NOT add oneOf to child schema (Cat) when Pet has discriminator.mapping', () => {
    const spec = Oas.init(structuredClone(embeddedDiscriminatorWithMapping));
    const operation = spec.operation('/reference-child-directly', 'post');

    const jsonSchema = operation.getParametersAsJSONSchema();
    const catSchema = jsonSchema?.[0].schema.components?.schemas?.Cat;

    expect(catSchema?.oneOf).toBeUndefined();
    expect(catSchema?.properties).toStrictEqual({
      pet_type: {
        type: 'string',
      },
      meow: {
        type: 'string',
      },
    });
    expect(catSchema?.['x-readme-ref-name']).toBe('Cat');
  });

  it('should NOT add oneOf to child schema when oneOf is nested inside properties', () => {
    const spec = Oas.init(structuredClone(nestedOneOfDiscriminator));
    const operation = spec.operation('/pets', 'post');

    const jsonSchema = operation.getParametersAsJSONSchema();
    const bodySchema = jsonSchema?.find(p => p.type === 'body')?.schema as any;

    expect(bodySchema.properties.test.oneOf).toStrictEqual([
      { $ref: '#/components/schemas/Cat' },
      {
        $ref: '#/components/schemas/Dog',
      },
    ]);

    expect(bodySchema.components.schemas.Cat.oneOf).toBeUndefined();
    expect(bodySchema.components.schemas.Dog.oneOf).toBeUndefined();
  });

  it('should NOT add oneOf to child schema when oneOf is nested inside array items', () => {
    const spec = Oas.init(structuredClone(nestedOneOfDiscriminator));
    const operation = spec.operation('/pets-array', 'post');

    const jsonSchema = operation.getParametersAsJSONSchema();
    const bodySchema = jsonSchema?.find(p => p.type === 'body')?.schema as any;

    expect(bodySchema.items.oneOf).toStrictEqual([
      { $ref: '#/components/schemas/Cat' },
      { $ref: '#/components/schemas/Dog' },
    ]);

    expect(bodySchema.components.schemas.Cat.oneOf).toBeUndefined();
    expect(bodySchema.components.schemas.Dog.oneOf).toBeUndefined();
  });

  it('should NOT add oneOf to child schema when parent has discriminator.mapping and oneOf is at root', () => {
    const spec = Oas.init(structuredClone(oneOfWithDiscriminatorMapping));
    const operation = spec.operation('/pets', 'post');

    const jsonSchema = operation.getParametersAsJSONSchema();
    const bodySchema = jsonSchema?.find(p => p.type === 'body')?.schema as any;

    expect(bodySchema.oneOf).toStrictEqual([
      { $ref: '#/components/schemas/Cat' },
      { $ref: '#/components/schemas/Dog' },
    ]);

    expect(bodySchema.components.schemas.Cat.oneOf).toBeUndefined();
    expect(bodySchema.components.schemas.Dog.oneOf).toBeUndefined();
  });

  it('should respect discriminator.mapping when explicitly defined', () => {
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
    const operation = spec.operation('/pets', 'get');

    const schemas = operation.getResponseAsJSONSchema('200');

    const petSchema = schemas?.[0]?.schema?.components?.schemas?.Pet;

    expect(petSchema?.oneOf).toStrictEqual([{ $ref: '#/components/schemas/Cat' }]);
  });

  it('should still build oneOf on parent when both direct parent ref and child oneOf exist', () => {
    const spec = Oas.init(structuredClone(embeddedDiscriminator));
    const operation = spec.operation('/reference-parent-directly', 'patch');

    const schemas = operation.getParametersAsJSONSchema();

    // Pet should still have oneOf even though children are also used in a oneOf elsewhere
    expect(schemas?.[0].schema.components?.schemas?.Pet).toStrictEqual({
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
          $ref: '#/components/schemas/Cat',
        },
        {
          $ref: '#/components/schemas/Dog',
        },
      ],
      'x-readme-ref-name': 'Pet',
    });

    // `Cat` should have also been merged with `Pet` because it's got its own `allOf` configuration.
    expect(schemas?.[0].schema.components?.schemas?.Cat).toStrictEqual({
      type: 'object',
      required: ['pet_type'],
      discriminator: {
        propertyName: 'pet_type',
      },
      properties: {
        age: {
          description: 'Age of the cat in years',
          minimum: 0,
          type: 'integer',
        },
        hunts: {
          description: 'Whether the cat hunts',
          type: 'boolean',
        },
        meow: {
          default: 'Meow',
          description: "The cat's meow sound",
          type: 'string',
        },
        // `pet_type` is included here because it's part of the `Pet` schema.
        pet_type: {
          description: 'The type of pet',
          type: 'string',
        },
      },
      'x-readme-ref-name': 'Cat',
    });
  });
});
