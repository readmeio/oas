import type { ValidAPIDefinition } from '../../utils.js';

import { describe, expect, it } from 'vitest';

import { bundle, dereference, validate } from '../../../src/index.js';
import { stripOrphanedIds } from '../../../src/repair.js';

/**
 * OpenAPI 3.1 inherits JSON Schema's `$id`, which establishes a new base URI
 * for `$ref` resolution within its subschema. When bundling inlines an external schema that carried
 * a `$id` and rewrites that schema's own refs into internal `#/…` pointers, the leftover `$id`
 * re-scopes those pointers so they resolve against the (non-existent) `$id` document instead of the
 * definition root, throwing a spurious "Missing $ref pointer" error. We drop `$id`s that no `$ref`
 * targets before resolving.
 */

/** A definition whose `Pets.items` pointer is mis-scoped by a sibling orphaned `$id`. */
function definitionWithOrphanedId() {
  return {
    openapi: '3.1.0',
    info: { title: 't', version: '1' },
    paths: {
      '/petsl': {
        get: {
          responses: {
            '200': {
              description: 'ok',
              content: {
                'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Pets: {
          type: 'array',
          $id: 'requests/search.schema.json',
          items: { $ref: '#/paths/~1petsl/get/responses/200/content/application~1json/schema' },
        },
      },
    },
  };
}

describe('orphaned `$id` keywords', () => {
  it('should bundle a definition whose internal pointer is mis-scoped by an orphaned `$id`', async () => {
    const api = await bundle<ValidAPIDefinition>(definitionWithOrphanedId());

    expect(api.components.schemas.Pets).not.toHaveProperty('$id');
    expect(api.components.schemas.Pets.items).toStrictEqual({
      $ref: '#/paths/~1petsl/get/responses/200/content/application~1json/schema',
    });
  });

  it('should dereference a definition with an orphaned `$id`', async () => {
    const api = await dereference<ValidAPIDefinition>(definitionWithOrphanedId());

    expect(api.components.schemas.Pets).not.toHaveProperty('$id');
  });

  it('should validate a definition with an orphaned `$id`', async () => {
    const result = await validate<ValidAPIDefinition, never>(definitionWithOrphanedId());

    expect(result.valid).toBe(true);
  });

  describe('stripOrphanedIds()', () => {
    it('should remove a nested `$id` that no `$ref` targets', () => {
      const schema = { components: { schemas: { Pets: { type: 'array', $id: 'search.json', items: {} } } } };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Pets).not.toHaveProperty('$id');
    });

    it('should strip an orphaned `$id` whose value is a substring of an unrelated `$ref`', () => {
      const schema = {
        components: {
          schemas: {
            Pet: { $id: 'pet', items: { $ref: '#/paths' } },
            Cart: { properties: { item: { $ref: '#/components/schemas/carpet' } } },
            carpet: { type: 'object' },
          },
        },
      };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Pet).not.toHaveProperty('$id');
    });

    it('should preserve a `$id` that a `$ref` targets by its URI', () => {
      const schema = {
        components: {
          schemas: {
            Address: { $id: 'https://ex.com/address.json', type: 'object' },
            Person: { properties: { home: { $ref: 'https://ex.com/address.json' } } },
          },
        },
      };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Address).toHaveProperty('$id', 'https://ex.com/address.json');
    });

    it('should strip only the orphaned `$id` when referenced and orphaned ones are mixed', () => {
      const schema = {
        components: {
          schemas: {
            Address: { $id: 'https://ex.com/address.json', type: 'object' },
            Person: { properties: { home: { $ref: 'https://ex.com/address.json' } } },
            Pets: { $id: 'search.json', items: {} },
          },
        },
      };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Address).toHaveProperty('$id');
      expect(schema.components.schemas.Pets).not.toHaveProperty('$id');
    });

    it("should never remove the root document's own `$id`", () => {
      const schema = { $id: 'https://acme.com/my-api', openapi: '3.1.0', paths: {} };

      stripOrphanedIds(schema);
      expect(schema).toHaveProperty('$id', 'https://acme.com/my-api');
    });

    it('should preserve a `$id` that a relative `$ref` beneath it resolves against as a base', () => {
      const schema = {
        components: {
          schemas: {
            Foo: { $id: 'schemas/foo.json', properties: { bar: { $ref: 'bar.json' } } },
          },
        },
      };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Foo).toHaveProperty('$id', 'schemas/foo.json');
    });

    it('should still strip a `$id` whose only descendant refs are fragment or absolute', () => {
      const schema = {
        components: {
          schemas: {
            Foo: {
              $id: 'schemas/foo.json',
              allOf: [{ $ref: '#/components/schemas/Real' }, { $ref: 'https://ex.com/other.json' }],
            },
            Real: { type: 'object' },
          },
        },
      };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Foo).not.toHaveProperty('$id');
    });

    it('should not remove a property literally named `$id`', () => {
      const schema = { components: { schemas: { Thing: { properties: { $id: { type: 'string' } } } } } };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Thing.properties).toHaveProperty('$id');
    });

    it('should not touch a `$id` string embedded in example data', () => {
      const schema = { components: { schemas: { Thing: { type: 'object', example: { $id: 'keep-me' } } } } };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Thing.example).toStrictEqual({ $id: 'keep-me' });
    });
  });
});
