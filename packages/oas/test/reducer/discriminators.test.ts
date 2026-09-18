import type { OAS31Document, OASDocument, SchemaObject } from '../../src/types.js';

import { describe, expect, it } from 'vitest';

import Oas from '../../src/index.js';
import { OpenAPIPruner } from '../../src/pruner/index.js';
import { OpenAPIReducer } from '../../src/reducer/index.js';
import petDiscriminator from '../__datasets__/pet-discriminator-allof.json' with { type: 'json' };
import { createOasForOperation, createPetSchema } from '../__fixtures__/create-oas.js';

describe('OpenAPIReducer discriminator dependencies', () => {
  it.each<{ name: string; mapping?: Record<string, string>; expectedChildren: string[] }>([
    { name: 'implicit inheritance', expectedChildren: ['Cat', 'Dog', 'Lizard'] },
    {
      name: 'explicit mapping',
      mapping: { cat: '#/components/schemas/Cat', dog: '#/components/schemas/Dog' },
      expectedChildren: ['Cat', 'Dog'],
    },
    { name: 'schema-name mapping', mapping: { cat: 'Cat' }, expectedChildren: ['Cat'] },
  ])('retains discriminator children discovered through $name', ({ mapping, expectedChildren }) => {
    // GET /pets references Pet. Cat, Dog, and Lizard each inherit from Pet through allOf.
    const definition = structuredClone(petDiscriminator) as OASDocument;
    const parent = definition.components!.schemas!.Pet as SchemaObject;
    if (mapping) {
      parent.discriminator!.mapping = mapping;
    }
    const original = structuredClone(definition);

    const reduced = OpenAPIReducer.init(definition).byOperation('/pets', 'get').reduce();

    expect(Object.keys(reduced.components!.schemas!).toSorted()).toStrictEqual(['Pet', ...expectedChildren].toSorted());
    expect(reduced.components!.schemas!.Pet).toStrictEqual(parent);
    expect(definition).toStrictEqual(original);

    // Keeping the children lets response conversion build the discriminator's oneOf choices.
    const response = new Oas(reduced).operation('/pets', 'get').getResponseAsJSONSchema('200');
    expect(response?.[0].schema.components?.schemas?.Pet).toMatchObject({
      oneOf: expectedChildren.map(name => ({ $ref: `#/components/schemas/${name}` })),
    });
  });

  it('retains escaped parent and child refs and their response schema choices', () => {
    const oas = createOasForOperation(
      {
        responses: {
          '200': {
            description: 'Pet',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet~1Base~01' } } },
          },
        },
      },
      {
        schemas: {
          'Pet/Base~1': createPetSchema(),
          'Cat/Type~1': {
            allOf: [
              { $ref: '#/components/schemas/Pet~1Base~01' },
              { type: 'object', properties: { name: { type: 'string' } } },
            ],
          },
        },
      },
    );

    const reduced = OpenAPIReducer.init(oas.api).byOperation('/', 'get').reduce();

    expect(reduced.components?.schemas).toStrictEqual(oas.api.components?.schemas);
    const fullResponse = oas.operation('/', 'get').getResponseAsJSONSchema('200');
    const reducedResponse = new Oas(reduced).operation('/', 'get').getResponseAsJSONSchema('200');
    expect(reducedResponse).toStrictEqual(fullResponse);
    expect(reducedResponse?.[0].schema.components?.schemas?.['Pet/Base~1']).toMatchObject({
      oneOf: [{ $ref: '#/components/schemas/Cat~1Type~01' }],
    });
  });

  it('retains dependencies of discriminator children, including circular references', () => {
    const definition = structuredClone(petDiscriminator) as OASDocument;
    const schemas = definition.components!.schemas!;

    // Pet discovers Cat through inheritance; Cat references Collar, which references Cat again.
    (schemas.Cat as SchemaObject).allOf!.push({
      type: 'object',
      properties: { collar: { $ref: '#/components/schemas/Collar' } },
    });
    schemas.Collar = { type: 'object', properties: { pet: { $ref: '#/components/schemas/Cat' } } };

    const reduced = OpenAPIReducer.init(definition).byOperation('/pets', 'get').reduce();

    expect(reduced.components?.schemas).toStrictEqual(schemas);
  });

  it('retains discriminator children referenced by a webhook', () => {
    const definition = structuredClone(petDiscriminator) as OAS31Document;
    definition.webhooks = { petsChanged: { post: definition.paths!['/pets']!.get } };

    const reduced = OpenAPIReducer.init(definition).byWebhook('petsChanged', 'post').reduce();

    expect(reduced).not.toHaveProperty('paths');
    expect(reduced.components?.schemas).toStrictEqual(definition.components?.schemas);
    const response = new Oas(reduced)
      .operation('petsChanged', 'post', { isWebhook: true })
      .getResponseAsJSONSchema('200');
    expect(response?.[0].schema.components?.schemas?.Pet).toMatchObject({
      oneOf: ['Cat', 'Dog', 'Lizard'].map(name => ({ $ref: `#/components/schemas/${name}` })),
    });
  });
});

describe('OpenAPIPruner discriminator dependencies', () => {
  it('removes the unused discriminator family and retains the family referenced by the remaining path', () => {
    const definition = structuredClone(petDiscriminator) as OASDocument;
    const schemas = definition.components!.schemas!;
    schemas.UnusedParent = { type: 'object', discriminator: { propertyName: 'kind' } };
    schemas.UnusedChild = { allOf: [{ $ref: '#/components/schemas/UnusedParent' }] };
    definition.paths!['/unused'] = {
      get: {
        responses: {
          '200': {
            description: 'Unused',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UnusedParent' } } },
          },
        },
      },
    };

    const pruned = OpenAPIPruner.init(definition).removePath('/unused').prune();

    expect(pruned.paths).not.toHaveProperty('/unused');
    expect(pruned.components?.schemas).toStrictEqual(petDiscriminator.components.schemas);
  });
});
