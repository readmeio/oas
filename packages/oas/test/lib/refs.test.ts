import type { OASDocument, SchemaObject } from '../../src/types.js';

import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';

import {
  decodePointer,
  dereferenceRef,
  dereferenceRefDeep,
  encodePointer,
  mergeReferencedSchemasIntoRoot,
} from '../../src/lib/refs.js';

describe('#encodePointer()', () => {
  it('should encode a string to a JSON pointer', () => {
    expect(encodePointer('/anything/path~segment/{segment}')).toBe('~1anything~1path~0segment~1{segment}');
  });
});

describe('#decodePointer()', () => {
  it('should decode a JSON pointer string to a string', () => {
    expect(decodePointer('~1anything~1path~0segment~1{segment}')).toBe('/anything/path~segment/{segment}');
  });

  it('should decode ~01 to ~1 per RFC 6901 (unescape ~0 before ~1)', () => {
    // ~01 encodes as: ~0 (tilde) + 1 (literal) → decoded result is "~1". Wrong order would give "~/".
    expect(decodePointer('~01')).toBe('~1');
  });
});

describe('#dereferenceRef()', () => {
  it('should return undefined if the value is undefined', () => {
    // @ts-expect-error - Testing a type mismatch.
    expect(dereferenceRef()).toBeUndefined();
  });

  it('should return non-ref value as-is', () => {
    const schema = { type: 'string', description: 'A string' };
    expect(dereferenceRef(schema)).toBe(schema);
    expect(dereferenceRef(schema, petstore as OASDocument)).toBe(schema);
  });

  it('should return `$ref` as-is when no definition is provided', () => {
    const ref = { $ref: '#/components/schemas/Pet' };
    expect(dereferenceRef(ref)).toStrictEqual(ref);
  });

  it('should dereference a `$ref` when definition is provided', () => {
    expect(dereferenceRef({ $ref: '#/components/schemas/Pet' }, petstore as OASDocument)).toStrictEqual(
      petstore.components.schemas.Pet,
    );
  });

  describe('and the ref is escaped', () => {
    it('should return a definition for a given ref that is escaped', () => {
      expect(
        dereferenceRef({ $ref: '#/components/schemas/Pet~1Error' }, {
          components: {
            schemas: {
              'Pet/Error': petstore.components.schemas.ApiResponse,
            },
          },
        } as unknown as OASDocument),
      ).toStrictEqual(petstore.components.schemas.ApiResponse);
    });

    it('should return the original value if the `$ref` does not exist in its unescaped form', () => {
      const ref = { $ref: '#/components/schemas/Pet~1Error' };

      expect(
        dereferenceRef(ref, {
          components: {
            schemas: {
              // This should be written in the schema as `Pet/Error`.
              'Pet~1Error': {},
            },
          },
        } as unknown as OASDocument),
      ).toBe(ref);
    });
  });

  it('should recursively dereference chained $refs', () => {
    expect(
      dereferenceRef({ $ref: '#/components/schemas/Outer' }, {
        components: {
          schemas: {
            Inner: { type: 'string' },
            Middle: { $ref: '#/components/schemas/Inner' },
            Outer: { $ref: '#/components/schemas/Middle' },
          },
        },
      } as unknown as OASDocument),
    ).toStrictEqual({
      type: 'string',
    });
  });

  describe('and dereferencing fails', () => {
    it('should return original `$ref` the referenced path doesnt exist', () => {
      const ref = { $ref: '#/components/schemas/Nonexistent' };
      expect(dereferenceRef(ref, petstore as OASDocument)).toStrictEqual(ref);
    });

    it('should return original `$ref` when the ref is in an invalid format', () => {
      const ref = { $ref: 'some-other-ref' };
      expect(dereferenceRef(ref, petstore as OASDocument)).toStrictEqual(ref);
    });
  });

  describe('circular derection', () => {
    it('should return original `$ref` for circular references to prevent infinite loops', () => {
      const ref = { $ref: '#/components/schemas/SelfRef' };

      expect(
        dereferenceRef(ref, {
          components: {
            schemas: {
              SelfRef: { $ref: '#/components/schemas/SelfRef' },
            },
          },
        } as unknown as OASDocument),
      ).toStrictEqual(ref);
    });

    it('should use provided seenRefs set for circular detection', () => {
      const definition = {
        components: {
          schemas: {
            SelfRef: { $ref: '#/components/schemas/SelfRef' },
          },
        },
      } as unknown as OASDocument;
      const ref = { $ref: '#/components/schemas/SelfRef' };
      const seenRefs = new Set<string>();

      expect(dereferenceRef(ref, definition, seenRefs)).toStrictEqual(ref);
      expect(seenRefs.has('#/components/schemas/SelfRef')).toBe(true);
    });
  });
});

describe('#dereferenceRefDeep()', () => {
  it('should return null and undefined as-is', () => {
    expect(dereferenceRefDeep(null)).toBeNull();
    // @ts-expect-error - Testing a type mismatch.
    expect(dereferenceRefDeep()).toBeUndefined();
  });

  it('should return primitives as-is', () => {
    expect(dereferenceRefDeep('x')).toBe('x');
    expect(dereferenceRefDeep(0)).toBe(0);
    expect(dereferenceRefDeep(false)).toBe(false);
  });

  it('should dereference a root `$ref` and recurse into nested `$ref` inside the resolved value', () => {
    const api = {
      components: {
        schemas: {
          Inner: { type: 'string', const: 'x' },
          Outer: { type: 'object', properties: { inner: { $ref: '#/components/schemas/Inner' } } },
        },
      },
    } as unknown as OASDocument;

    expect(dereferenceRefDeep({ $ref: '#/components/schemas/Outer' }, api)).toStrictEqual({
      type: 'object',
      properties: {
        inner: { type: 'string', const: 'x' },
      },
    });
  });

  it('should dereference `$ref` entries inside an array', () => {
    const rowSchema = {
      type: 'object',
      properties: {
        uuid: { type: 'string', example: 'u1' },
        email: { type: 'string', format: 'email', example: 'a@b.c' },
      },
      required: ['uuid', 'email'],
    } as const;

    const api = {
      components: {
        schemas: {
          Row: rowSchema,
        },
      },
    } as unknown as OASDocument;

    expect(dereferenceRefDeep([{ $ref: '#/components/schemas/Row' }, { plain: true }], api)).toStrictEqual([
      rowSchema,
      { plain: true },
    ]);
  });

  it('should dereference `$ref` values nested under object properties', () => {
    const api = {
      components: {
        schemas: {
          Payload: { type: 'object', properties: { id: { type: 'integer' } } },
        },
      },
    } as unknown as OASDocument;

    expect(
      dereferenceRefDeep(
        {
          meta: { kind: 'row' },
          data: { $ref: '#/components/schemas/Payload' },
        },
        api,
      ),
    ).toStrictEqual({
      meta: { kind: 'row' },
      data: { type: 'object', properties: { id: { type: 'integer' } } },
    });
  });

  it('should leave `$ref` in place when a definition is not supplied', () => {
    const ref = { $ref: '#/components/schemas/Pet' };
    expect(dereferenceRefDeep({ outer: [ref] })).toStrictEqual({ outer: [ref] });
  });

  it('should leave `$ref` in place when nested resolution hits a circular reference', () => {
    const circular = {
      components: {
        schemas: {
          A: { items: [{ $ref: '#/components/schemas/B' }] },
          B: { $ref: '#/components/schemas/A' },
        },
      },
    } as unknown as OASDocument;

    const out = dereferenceRefDeep({ $ref: '#/components/schemas/A' }, circular);
    expect(out).toStrictEqual({
      items: [{ $ref: '#/components/schemas/A' }],
    });
  });

  it('should leave an invalid nested `$ref` unchanged when lookup fails', () => {
    const ref = { $ref: '#/components/schemas/Nope' };
    expect(dereferenceRefDeep({ x: ref }, petstore as OASDocument)).toStrictEqual({ x: ref });
  });

  it('should use a single instance of the `seenRefs` set across all recursive calls', () => {
    const seen = new Set<string>();
    const api = {
      components: {
        schemas: {
          Leaf: { type: 'boolean' },
          Root: { $ref: '#/components/schemas/Leaf' },
        },
      },
    } as unknown as OASDocument;

    dereferenceRefDeep({ $ref: '#/components/schemas/Root' }, api, seen);
    expect(seen.has('#/components/schemas/Root')).toBe(true);
    expect(seen.has('#/components/schemas/Leaf')).toBe(true);
  });
});

describe('#mergeReferencedSchemasIntoRoot()', () => {
  it('should nest a schema under `#/components/schemas/<name>`', () => {
    const root: SchemaObject = { type: 'object' };
    const refMapping = new Map([
      [
        '#/components/schemas/Pet',
        {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
      ],
    ]);

    mergeReferencedSchemasIntoRoot(root, refMapping);

    expect(root).toStrictEqual({
      type: 'object',
      components: {
        schemas: {
          Pet: { type: 'object', properties: { name: { type: 'string' } } },
        },
      },
    });
  });

  it('should apply multiple refs into the same root', () => {
    const root: SchemaObject = {};
    const refMapping = new Map([
      ['#/components/schemas/A', { const: 'a' }],
      ['#/components/schemas/B', { const: 'b' }],
    ]);

    mergeReferencedSchemasIntoRoot(root, refMapping);

    expect(root.components?.schemas).toStrictEqual({
      A: { const: 'a' },
      B: { const: 'b' },
    });
  });

  it('should merge deeper paths without clobbering sibling keys', () => {
    const root: SchemaObject = {
      components: {
        schemas: {
          Wrapper: {
            type: 'object',
            title: 'unchanged',
          },
        },
      },
    };

    const refMapping = new Map([['#/components/schemas/Wrapper/properties/nested', { type: 'number' }]]);

    mergeReferencedSchemasIntoRoot(root, refMapping);

    expect(root.components?.schemas?.Wrapper).toStrictEqual({
      type: 'object',
      title: 'unchanged',
      properties: {
        nested: { type: 'number' },
      },
    });
  });

  it('should create `allOf` as an array when the ref path includes a numeric index', () => {
    const root: SchemaObject = {};
    const refMapping = new Map([
      ['#/components/schemas/Thing/allOf/0/properties/id', { type: 'integer', format: 'int64' }],
    ]);

    mergeReferencedSchemasIntoRoot(root, refMapping);

    expect(root).toStrictEqual({
      components: {
        schemas: {
          Thing: {
            allOf: [
              {
                properties: {
                  id: { type: 'integer', format: 'int64' },
                },
              },
            ],
          },
        },
      },
    });
  });

  it('should create `oneOf` as an array when the ref path includes a numeric index', () => {
    const root: SchemaObject = {};
    const refMapping = new Map([['#/components/schemas/Discriminated/oneOf/2/type', { const: 'special' }]]);

    mergeReferencedSchemasIntoRoot(root, refMapping);

    const oneOf = root.components?.schemas?.Discriminated?.oneOf;
    expect(Array.isArray(oneOf)).toBe(true);
    expect(oneOf).toHaveLength(3);

    // These are `undefined` because we don't have `oneOf/0` or `oneOf/1` in the schema mapping.
    expect(oneOf?.[0]).toBeUndefined();
    expect(oneOf?.[1]).toBeUndefined();
    expect(oneOf?.[2]).toStrictEqual({ type: { const: 'special' } });
  });

  it('should create `anyOf` as an array when the ref path includes a numeric index', () => {
    const root: SchemaObject = {};
    const refMapping = new Map([['#/components/schemas/Either/anyOf/0', { type: 'string' }]]);

    mergeReferencedSchemasIntoRoot(root, refMapping);

    expect(root.components?.schemas?.Either).toStrictEqual({
      anyOf: [{ type: 'string' }],
    });
  });

  it('should walk through existing array indices under allOf', () => {
    const root: SchemaObject = {
      components: {
        schemas: {
          Merged: {
            allOf: [{ title: 'first' }, { title: 'second' }],
          },
        },
      },
    };

    const refMapping = new Map([['#/components/schemas/Merged/allOf/1/properties/extra', { type: 'boolean' }]]);

    mergeReferencedSchemasIntoRoot(root, refMapping);

    expect(root.components?.schemas?.Merged).toStrictEqual({
      allOf: [
        {
          title: 'first',
        },
        {
          title: 'second',
          properties: { extra: { type: 'boolean' } },
        },
      ],
    });
  });

  it('should assign a schema at `allOf/<index>` when that is the leaf path', () => {
    const root: SchemaObject = {};
    const refMapping = new Map([['#/components/schemas/Tuple/allOf/1', { maxLength: 10 }]]);

    mergeReferencedSchemasIntoRoot(root, refMapping);

    const allOf = root.components?.schemas?.Tuple?.allOf;
    expect(Array.isArray(allOf)).toBe(true);
    expect(allOf).toHaveLength(2);

    // This is `undefined` because we don't have `allOf/1` in the schema mapping.
    expect(allOf?.[0]).toBeUndefined();
    expect(allOf?.[1]).toStrictEqual({ maxLength: 10 });
  });

  it('should ignore refs that do not start with #/', () => {
    const root: SchemaObject = { x: 1 };
    const refMapping = new Map([['https://example.com/schemas/Foo.json', { type: 'string' }]]);

    mergeReferencedSchemasIntoRoot(root, refMapping);
    expect(root).toStrictEqual({ x: 1 });
  });

  it('should ignore refs with fewer than two path segments after #/', () => {
    const root: SchemaObject = { x: 1 };
    const refMapping = new Map([['#/only', { type: 'string' }]]);

    mergeReferencedSchemasIntoRoot(root, refMapping);
    expect(root).toStrictEqual({ x: 1 });
  });

  it('should decode JSON pointer segments when merging under `paths`', () => {
    const root: SchemaObject = {};
    const pathSeg = encodePointer('/v1/widget');
    const refMapping = new Map([[`#/paths/${pathSeg}/post/requestBody/description`, 'Create a widget']]);

    mergeReferencedSchemasIntoRoot(root, refMapping);

    expect(root).toHaveProperty('paths', {
      '/v1/widget': {
        post: {
          requestBody: {
            description: 'Create a widget',
          },
        },
      },
    });
  });

  it('should use string keys for numeric-looking segments that are not `allOf`/`oneOf`/`anyOf` children', () => {
    const root: SchemaObject = {};
    const refMapping = new Map([['#/components/schemas/Row/properties/0', { type: 'string' }]]);

    mergeReferencedSchemasIntoRoot(root, refMapping);

    expect(root.components?.schemas?.Row).toStrictEqual({
      properties: {
        '0': { type: 'string' },
      },
    });
  });
});
