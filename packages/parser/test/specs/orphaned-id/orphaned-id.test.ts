import type { ValidAPIDefinition } from '../../utils.js';

import { describe, expect, it } from 'vitest';

import { bundle, dereference, validate } from '../../../src/index.js';
import { stripOrphanedIds } from '../../../src/repair.js';

/**
 * OpenAPI 3.1 inherits JSON Schema's `$id`, which establishes a new base URI for `$ref` resolution
 * within its subschema. When bundling inlines an external schema that carried a `$id` and rewrites
 * that schema's own refs into internal `#/…` pointers, the leftover `$id` re-scopes those pointers
 * so they resolve against the (non-existent) `$id` document instead of the definition root, throwing
 * a spurious "Missing $ref pointer" error. We drop orphaned `$id`s before resolving.
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

  it('should dereference a schema whose `$id` scopes a `#/$defs` `$ref`', async () => {
    const api = await dereference<ValidAPIDefinition>({
      openapi: '3.1.0',
      info: { title: 't', version: '1' },
      paths: {},
      components: {
        schemas: {
          Outer: {
            $id: 'outer.json',
            type: 'object',
            properties: { x: { $ref: '#/$defs/inner' } },
            $defs: { inner: { type: 'string' } },
          },
        },
      },
    });

    expect(api.components.schemas.Outer).toHaveProperty('$id', 'outer.json');
    expect(api.components.schemas.Outer.properties.x).toStrictEqual({ type: 'string' });
  });

  it('should dereference a schema whose `$id` scopes a percent-encoded `#/$defs` `$ref`', async () => {
    const api = await dereference<ValidAPIDefinition>({
      openapi: '3.1.0',
      info: { title: 't', version: '1' },
      paths: {},
      components: {
        schemas: {
          Outer: {
            $id: 'outer.json',
            type: 'object',
            properties: { x: { $ref: '#/$defs/a%20b' } },
            $defs: { 'a b': { type: 'string' } },
          },
        },
      },
    });

    expect(api.components.schemas.Outer).toHaveProperty('$id', 'outer.json');
    expect(api.components.schemas.Outer.properties.x).toStrictEqual({ type: 'string' });
  });

  it('should bundle a schema whose `$id` scopes a `#/$defs` `$ref`', async () => {
    const api = await bundle<ValidAPIDefinition>({
      openapi: '3.1.0',
      info: { title: 't', version: '1' },
      paths: {},
      components: {
        schemas: {
          Outer: {
            $id: 'outer.json',
            type: 'object',
            properties: { x: { $ref: '#/$defs/inner' } },
            $defs: { inner: { type: 'string' } },
          },
        },
      },
    });

    expect(api.components.schemas.Outer).toHaveProperty('$id', 'outer.json');
    expect(api.components.schemas.Outer.properties.x).toStrictEqual({ $ref: '#/$defs/inner' });
  });

  it('should validate a definition that uses `$id` + `#/$defs`', async () => {
    const result = await validate<ValidAPIDefinition, never>({
      openapi: '3.1.0',
      info: { title: 't', version: '1' },
      paths: {},
      components: {
        schemas: {
          Outer: {
            $id: 'outer.json',
            type: 'object',
            properties: { x: { $ref: '#/$defs/inner' } },
            $defs: { inner: { type: 'string' } },
          },
        },
      },
    });

    expect(result.valid).toBe(true);
  });

  it('should dereference a recursive `$ref: "#"` against its enclosing `$id`, not the document', async () => {
    const api = await dereference<ValidAPIDefinition>({
      openapi: '3.1.0',
      info: { title: 't', version: '1' },
      paths: {},
      components: {
        schemas: {
          Node: {
            $id: 'node.json',
            type: 'object',
            properties: { child: { $ref: '#' } },
          },
        },
      },
    });

    expect(api.components.schemas.Node).toHaveProperty('$id', 'node.json');
    expect(api.components.schemas.Node.properties.child).toBe(api.components.schemas.Node);
    expect(api.components.schemas.Node.properties.child).not.toHaveProperty('openapi');
  });

  describe('stripOrphanedIds()', () => {
    it('should remove a nested `$id` that no `$ref` targets', () => {
      const schema = { components: { schemas: { Pets: { type: 'array', $id: 'search.json', items: {} } } } };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Pets).not.toHaveProperty('$id');
    });

    it('should preserve a relative `$id` targeted by a `$ref` that resolves to it', () => {
      // `inner.json` resolves against `schemas/outer.json` to `schemas/inner.json`, which is exactly
      // what the `$ref` targets. A substring match keeps the live `$id`; an exact match would strip
      // it and break the reference.
      const schema = {
        components: {
          schemas: {
            Outer: { $id: 'schemas/outer.json', properties: { inner: { $id: 'inner.json', type: 'object' } } },
            Consumer: { properties: { x: { $ref: 'schemas/inner.json' } } },
          },
        },
      };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Outer.properties.inner).toHaveProperty('$id', 'inner.json');
    });

    it('should preserve a `$id` that a `$ref` targets by its URI (in-document anchor)', () => {
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

    it('should strip an orphaned `$id` when a nested absolute `$id` shields the only relative `$ref`', () => {
      // The relative ref `sibling.json` belongs to the nested absolute `inner.json` scope, which is
      // self-contained, so it must not pin the orphaned outer `$id`.
      const schema = {
        components: {
          schemas: {
            Outer: {
              $id: 'outer.json',
              items: { $ref: '#/paths' },
              properties: { inner: { $id: 'https://ex.com/inner.json', addr: { $ref: 'sibling.json' } } },
            },
          },
        },
      };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Outer).not.toHaveProperty('$id');
      expect(schema.components.schemas.Outer.properties.inner).toHaveProperty('$id', 'https://ex.com/inner.json');
    });

    it('should preserve an outer `$id` that a nested relative `$id` resolves against as a base', () => {
      // `inner.json` is relative, so it resolves against `Outer`'s base; removing `Outer.$id` would
      // re-base the nested scope and shift where `sibling.json` resolves.
      const schema = {
        components: {
          schemas: {
            Outer: {
              $id: 'schemas/outer.json',
              properties: { inner: { $id: 'inner.json', addr: { $ref: 'sibling.json' } } },
            },
          },
        },
      };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Outer).toHaveProperty('$id', 'schemas/outer.json');
    });

    it('should strip an outer `$id` once its orphaned nested relative `$id` is itself removed', () => {
      const schema = {
        components: {
          schemas: {
            Outer: {
              $id: 'outer.json',
              items: { $ref: '#/paths' },
              properties: { inner: { $id: 'inner.json', type: 'object' } },
            },
          },
        },
      };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Outer).not.toHaveProperty('$id');
      expect(schema.components.schemas.Outer.properties.inner).not.toHaveProperty('$id');
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

    it('should preserve a `$id` that scopes a `#/$defs` fragment `$ref`', () => {
      const schema = {
        components: {
          schemas: {
            Outer: {
              $id: 'outer.json',
              type: 'object',
              properties: { x: { $ref: '#/$defs/inner' } },
              $defs: { inner: { type: 'string' } },
            },
          },
        },
      };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Outer).toHaveProperty('$id', 'outer.json');
    });

    it('should preserve a `$id` that scopes a percent-encoded `#/$defs` fragment `$ref`', () => {
      const schema = {
        components: {
          schemas: {
            Outer: {
              $id: 'outer.json',
              type: 'object',
              properties: { x: { $ref: '#/$defs/a%20b' } },
              $defs: { 'a b': { type: 'string' } },
            },
          },
        },
      };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Outer).toHaveProperty('$id', 'outer.json');
    });

    it('should preserve a `$id` that a recursive `$ref: "#"` resolves against', () => {
      const schema = {
        components: {
          schemas: {
            Node: {
              $id: 'node.json',
              type: 'object',
              properties: { child: { $ref: '#' } },
            },
          },
        },
      };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Node).toHaveProperty('$id', 'node.json');
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
