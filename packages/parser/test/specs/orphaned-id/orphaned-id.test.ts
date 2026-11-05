import type { ValidAPIDefinition } from '../../utils.js';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

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
function definitionWithOrphanedId(id = 'requests/search.schema.json') {
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
          $id: id,
          items: { $ref: '#/paths/~1petsl/get/responses/200/content/application~1json/schema' },
        },
      },
    },
  };
}

/**
 * A circular component schema whose `$id` is the schema name. Generators commonly emit this, and
 * the self `$ref` is a document-root pointer that used to substring-match the `$id` and block
 * stripping.
 */
function definitionWithNamedCircularId() {
  return {
    openapi: '3.1.0',
    info: { title: 't', version: '1' },
    paths: {
      '/pets': {
        get: {
          responses: {
            '200': {
              description: 'ok',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Pet: {
          $id: 'Pet',
          type: 'object',
          properties: {
            id: { type: 'integer' },
            friend: { $ref: '#/components/schemas/Pet' },
          },
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

  it.each(['schema', 'json', 'get', 'petsl'])(
    'should dereference when an orphaned `$id` is a substring of a document-root pointer (`%s`)',
    async id => {
      const api = await dereference<ValidAPIDefinition>(definitionWithOrphanedId(id));

      expect(api.components.schemas.Pets).not.toHaveProperty('$id');
      expect(api.components.schemas.Pets.items).toMatchObject({
        type: 'object',
        properties: { id: { type: 'integer' } },
      });
    },
  );

  it('should dereference a circular component schema whose `$id` matches its name', async () => {
    const api = await dereference<ValidAPIDefinition>(definitionWithNamedCircularId());

    expect(api.components.schemas.Pet).not.toHaveProperty('$id');
    expect(api.components.schemas.Pet.properties.friend).toBe(api.components.schemas.Pet);
  });

  it('should strip `$id` when a circular self `$ref` percent-encodes the pointer slash', async () => {
    const spec = definitionWithNamedCircularId();
    spec.components.schemas.Pet.properties.friend = { $ref: '#%2Fcomponents%2Fschemas%2FPet' };

    const api = await dereference<ValidAPIDefinition>(spec);

    // The leftover `$id` must not be kept just because `#%2Fcomponents%2Fschemas%2FPet` contains
    // "Pet". Whether the encoded pointer is then fully inlined is the resolver's job.
    expect(api.components.schemas.Pet).not.toHaveProperty('$id');
  });

  it('should bundle a circular component schema whose `$id` matches its name', async () => {
    const api = await bundle<ValidAPIDefinition>(definitionWithNamedCircularId());

    expect(api.components.schemas.Pet).not.toHaveProperty('$id');
    expect(api.components.schemas.Pet.properties.friend).toStrictEqual({ $ref: '#/components/schemas/Pet' });
  });

  it('should validate a circular component schema whose `$id` matches its name', async () => {
    const result = await validate<ValidAPIDefinition, never>(definitionWithNamedCircularId());

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

  describe('file path sources', () => {
    const writtenFiles: string[] = [];

    afterEach(() => {
      for (const file of writtenFiles) {
        fs.rmSync(path.dirname(file), { recursive: true, force: true });
      }
      writtenFiles.length = 0;
    });

    function writeDefinition(): string {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orphaned-id-'));
      const file = path.join(dir, 'spec.json');
      fs.writeFileSync(file, JSON.stringify(definitionWithOrphanedId()));
      writtenFiles.push(file);
      return file;
    }

    it('should bundle a file path whose internal pointer is mis-scoped by an orphaned `$id`', async () => {
      const api = await bundle<ValidAPIDefinition>(writeDefinition());

      expect(api.components.schemas.Pets).not.toHaveProperty('$id');
      expect(api.components.schemas.Pets.items).toStrictEqual({
        $ref: '#/paths/~1petsl/get/responses/200/content/application~1json/schema',
      });
    });

    it('should dereference a file path with an orphaned `$id`', async () => {
      const api = await dereference<ValidAPIDefinition>(writeDefinition());

      expect(api.components.schemas.Pets).not.toHaveProperty('$id');
    });

    it('should validate a file path with an orphaned `$id`', async () => {
      const result = await validate<ValidAPIDefinition, never>(writeDefinition());

      expect(result.valid).toBe(true);
    });

    it('should still resolve relative file `$ref`s after stripping orphaned `$id`s from a path source', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orphaned-id-ext-'));
      const spec = path.join(dir, 'spec.json');
      writtenFiles.push(spec);

      fs.writeFileSync(
        path.join(dir, 'pet.json'),
        JSON.stringify({ type: 'object', properties: { id: { type: 'integer' } } }),
      );
      fs.writeFileSync(
        spec,
        JSON.stringify({
          openapi: '3.1.0',
          info: { title: 't', version: '1' },
          paths: {
            '/pets': {
              get: {
                responses: {
                  '200': {
                    description: 'ok',
                    content: { 'application/json': { schema: { $ref: './pet.json' } } },
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
                items: { $ref: '#/paths/~1pets/get/responses/200/content/application~1json/schema' },
              },
            },
          },
        }),
      );

      const api = await bundle<ValidAPIDefinition>(spec);

      expect(api.components.schemas.Pets).not.toHaveProperty('$id');
      expect(api.paths['/pets'].get.responses['200'].content['application/json'].schema).toMatchObject({
        type: 'object',
        properties: { id: { type: 'integer' } },
      });
    });

    it('should not emit absolute file paths when an external `$id` schema references the same file twice', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orphaned-id-dupe-'));
      const spec = path.join(dir, 'spec.json');
      writtenFiles.push(spec);

      fs.mkdirSync(path.join(dir, 'schemas/requests'), { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'schemas/requests/test.json'),
        JSON.stringify({ type: 'object', properties: { name: { type: 'string' } } }),
      );
      fs.writeFileSync(
        path.join(dir, 'schemas/requests/search.schema.json'),
        JSON.stringify({
          $id: 'requests/search.schema.json',
          type: 'object',
          properties: { test1: { $ref: '../test.json' }, test2: { $ref: '../test.json' } },
        }),
      );
      fs.writeFileSync(
        spec,
        JSON.stringify({
          openapi: '3.1.0',
          info: { title: 't', version: '1' },
          paths: {
            '/pets': {
              get: {
                responses: {
                  '200': {
                    description: 'ok',
                    content: { 'application/json': { schema: { $ref: 'schemas/requests/search.schema.json' } } },
                  },
                },
              },
            },
          },
        }),
      );

      const api = await bundle<ValidAPIDefinition>(spec);
      const schema = api.paths['/pets'].get.responses['200'].content['application/json'].schema;

      expect(schema).not.toHaveProperty('$id');
      expect(schema.properties.test2).toStrictEqual({
        $ref: '#/paths/~1pets/get/responses/200/content/application~1json/schema/properties/test1',
      });

      // The bundle must stand on its own once it leaves this machine.
      fs.rmSync(dir, { recursive: true, force: true });
      await expect(validate(api)).resolves.toMatchObject({ valid: true });
    });

    /** An object definition whose response schema is an external `$id` schema that refs `test.json` twice. */
    function objectDefinitionWithExternalId(
      searchSchemaFor: (requestsDir: string) => Record<string, unknown> = () => ({}),
    ) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orphaned-id-object-'));
      writtenFiles.push(path.join(dir, 'spec.json'));
      const searchSchema = searchSchemaFor(path.join(dir, 'requests'));

      fs.mkdirSync(path.join(dir, 'requests'));
      fs.writeFileSync(
        path.join(dir, 'requests/test.json'),
        JSON.stringify({ type: 'object', properties: { name: { type: 'string' } } }),
      );
      fs.writeFileSync(
        path.join(dir, 'pet.json'),
        JSON.stringify({ $id: 'https://example.com/pet', type: 'object', properties: { id: { type: 'integer' } } }),
      );
      fs.writeFileSync(
        path.join(dir, 'requests/search.schema.json'),
        JSON.stringify({
          $id: 'requests/search.schema.json',
          type: 'object',
          ...searchSchema,
          properties: {
            test1: { $ref: '../test.json' },
            test2: { $ref: '../test.json' },
            ...(searchSchema.properties as object),
          },
        }),
      );

      return {
        openapi: '3.1.0',
        info: { title: 't', version: '1' },
        paths: {
          '/pets': {
            get: {
              responses: {
                '200': {
                  description: 'ok',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          search: { $ref: path.join(dir, 'requests/search.schema.json') },
                          pet: { $ref: path.join(dir, 'pet.json') },
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
    }

    it('should not emit the working directory when an object source repeats a ref under an external `$id`', async () => {
      const api = await bundle<ValidAPIDefinition>(objectDefinitionWithExternalId(), { resolve: { file: true } });
      const { search, pet } = api.paths['/pets'].get.responses['200'].content['application/json'].schema.properties;

      expect(search).not.toHaveProperty('$id');
      expect(search.properties.test2).toStrictEqual({
        $ref: '#/paths/~1pets/get/responses/200/content/application~1json/schema/properties/search/properties/test1',
      });
      expect(pet.$id).toBe('https://example.com/pet');
      await expect(validate(api)).resolves.toMatchObject({ valid: true });
    });

    const searchPointer = '#/paths/~1pets/get/responses/200/content/application~1json/schema/properties/search';

    it('should rewrite local fragment refs from the root when the external `$id` above them scopes them', async () => {
      const api = await bundle<ValidAPIDefinition>(
        objectDefinitionWithExternalId(() => ({
          $defs: { local: { type: 'integer' } },
          properties: { local: { $ref: '#/$defs/local' } },
        })),
        { resolve: { file: true } },
      );
      const { search } = api.paths['/pets'].get.responses['200'].content['application/json'].schema.properties;

      expect(search).not.toHaveProperty('$id');
      expect(search.properties.test2).toStrictEqual({ $ref: `${searchPointer}/properties/test1` });
      expect(search.properties.local).toStrictEqual({ $ref: `${searchPointer}/$defs/local` });
      await expect(validate(api)).resolves.toMatchObject({ valid: true });
    });

    it.each([
      ['an absolute nested `$id` that scopes a local fragment', 'https://example.com/inner', true],
      ['a relative nested `$id` with no refs of its own', 'inner.json', false],
    ])('should rewrite repeated refs under %s', async (_, innerId, withLocalRef) => {
      const definition = objectDefinitionWithExternalId(requestsDir => {
        // Absolute `file://` refs resolve to the same file under both `$id`s, so `again` repeats `test1`.
        const testRef = { $ref: `file://${path.join(requestsDir, 'test.json')}` };
        return {
          properties: {
            test1: testRef,
            test2: testRef,
            inner: {
              $id: innerId,
              ...(withLocalRef && { $defs: { local: { type: 'integer' } } }),
              properties: { again: testRef, ...(withLocalRef && { local: { $ref: '#/$defs/local' } }) },
            },
          },
        };
      });

      const api = await bundle<ValidAPIDefinition>(definition, { resolve: { file: true } });
      const { search } = api.paths['/pets'].get.responses['200'].content['application/json'].schema.properties;

      expect(search).not.toHaveProperty('$id');
      expect(search.properties.inner).not.toHaveProperty('$id');
      expect(search.properties.test2).toStrictEqual({ $ref: `${searchPointer}/properties/test1` });
      expect(search.properties.inner.properties).toStrictEqual({
        again: { $ref: `${searchPointer}/properties/test1` },
        ...(withLocalRef && { local: { $ref: `${searchPointer}/properties/inner/$defs/local` } }),
      });
      await expect(validate(api)).resolves.toMatchObject({ valid: true });
    });

    it('should leave a group as the bundler wrote it when a URI ref targets a nested `$id` with no refs', async () => {
      const definition = objectDefinitionWithExternalId();
      const { properties } = definition.paths['/pets'].get.responses['200'].content['application/json'].schema;
      const testRef = { $ref: `file://${properties.search.$ref.replace('search.schema.json', 'test.json')}` };
      Object.assign(properties, {
        search: {
          $id: 'https://example.com/search',
          properties: { test1: testRef, test2: { ...testRef }, inner: { $id: 'inner.json', type: 'boolean' } },
        },
        byId: { $ref: 'https://example.com/inner.json' },
      });

      const api = await bundle<ValidAPIDefinition>(definition, { resolve: { file: true } });
      const { search } = api.paths['/pets'].get.responses['200'].content['application/json'].schema.properties;

      // ref-parser can't resolve `byId` with or without this `$id`, so only check it's kept.
      expect(search).toHaveProperty('$id', 'https://example.com/search');
    });

    it('should leave a group as the bundler wrote it when a URI ref targets its `$id`', async () => {
      const api = await bundle<ValidAPIDefinition>(
        objectDefinitionWithExternalId(() => ({
          $defs: { local: { type: 'integer' } },
          properties: { byId: { $ref: 'search.schema.json#/$defs/local' } },
        })),
        { resolve: { file: true } },
      );
      const { search } = api.paths['/pets'].get.responses['200'].content['application/json'].schema.properties;

      expect(search).toHaveProperty('$id');
      expect(search.properties.test2.$ref).not.toMatch(/^#/);
      // readme validates the bundle in the same process it was bundled in.
      await expect(validate(api)).resolves.toMatchObject({ valid: true });
    });
  });

  describe('stripOrphanedIds()', () => {
    it('should remove a nested `$id` that no `$ref` targets', () => {
      const schema = { components: { schemas: { Pets: { type: 'array', $id: 'search.json', items: {} } } } };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Pets).not.toHaveProperty('$id');
    });

    it('should strip a `$id` that only appears as a substring of a document-root `$ref`', () => {
      const schema = {
        components: {
          schemas: {
            Pet: {
              $id: 'Pet',
              type: 'object',
              properties: { friend: { $ref: '#/components/schemas/Pet' } },
            },
          },
        },
      };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Pet).not.toHaveProperty('$id');
    });

    it('should strip a `$id` that only appears as a substring of a percent-encoded document-root `$ref`', () => {
      const schema = {
        components: {
          schemas: {
            Pet: {
              $id: 'Pet',
              type: 'object',
              properties: { friend: { $ref: '#%2Fcomponents%2Fschemas%2FPet' } },
            },
          },
        },
      };

      stripOrphanedIds(schema);
      expect(schema.components.schemas.Pet).not.toHaveProperty('$id');
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

    it('should preserve a `$id` that scopes a `#/$defs` `$ref` whose leading slash is percent-encoded', () => {
      const schema = {
        components: {
          schemas: {
            Outer: {
              $id: 'outer.json',
              type: 'object',
              properties: { x: { $ref: '#%2F$defs%2Finner' } },
              $defs: { inner: { type: 'string' } },
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
