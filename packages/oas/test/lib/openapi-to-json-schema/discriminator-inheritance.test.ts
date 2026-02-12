import { inspect } from 'util';

import { describe, expect, it } from 'vitest';

import Oas from '../../../src/index.js';
import embeddedDiscriminator from '../../__datasets__/embeded-discriminator.json' with { type: 'json' };

declare global {
  interface Console {
    logx: any;
  }
}

console.logx = (obj: any) => {
  console.log(inspect(obj, false, null, true));
};

describe('discriminator property inheritance via allOf', () => {
  it.only('should strip inherited oneOf and discriminator from children when parent oneOf has discriminator', async () => {
    const spec = Oas.init(structuredClone(embeddedDiscriminator));
    await spec.dereference();

    console.logx(spec.api);

    const operation = spec.operation('/embedded-discriminator-with-parent-discriminator', 'patch');
    const jsonSchema = operation.getParametersAsJSONSchema();
    const bodySchema = jsonSchema?.find(s => s.type === 'body')?.schema;

    expect(bodySchema).toStrictEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema#',
      discriminator: {
        propertyName: 'pet_type',
      },
      /* oneOf: [
        {
          type: 'object',
          required: ['pet_type'],
          properties: {
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
          },
          'x-readme-ref-name': 'Cat',
        },
        {
          type: 'object',
          required: ['pet_type'],
          properties: {
            pet_type: {
              type: 'string',
              description: 'The type of pet',
            },
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
          'x-readme-ref-name': 'Dog',
        },
      ], */
    });
  });

  it('should preserve oneOf on parent schema when directly referenced alongside endpoints that use children in oneOf', async () => {
    const spec = Oas.init(structuredClone(embeddedDiscriminator));
    await spec.dereference();
    const operation = spec.operation('/reference-parent-directly', 'patch');
    const jsonSchema = operation.getParametersAsJSONSchema();
    const bodySchema = jsonSchema?.find(s => s.type === 'body')?.schema as any;

    // Pet should have discriminator and oneOf with Cat and Dog
    expect(bodySchema).toStrictEqual({
      type: 'object',
      required: ['pet_type'],
      discriminator: {
        propertyName: 'pet_type',
      },
      oneOf: [
        {
          type: 'object',
          required: ['pet_type'],
          properties: {
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
          },
          'x-readme-ref-name': 'Cat',
        },
        {
          type: 'object',
          required: ['pet_type'],
          properties: {
            pet_type: {
              type: 'string',
              description: 'The type of pet',
            },
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
          'x-readme-ref-name': 'Dog',
        },
      ],
      'x-readme-ref-name': 'Pet',
      $schema: 'https://json-schema.org/draft/2020-12/schema#',
    });
  });
});
