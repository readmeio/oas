import type { OASDocument } from '../../src/types.js';

import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';

import { decodePointer, dereferenceRef, encodePointer } from '../../src/lib/refs.js';

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
    expect(dereferenceRef(undefined)).toBeUndefined();
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
    expect(dereferenceRef({ $ref: '#/components/schemas/Pet' }, petstore as OASDocument)).toStrictEqual({
      ...petstore.components.schemas.Pet,
      'x-readme-ref-name': 'Pet',
    });
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
      ).toStrictEqual({
        ...petstore.components.schemas.ApiResponse,
        'x-readme-ref-name': 'Pet~1Error',
      });
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
      'x-readme-ref-name': 'Inner',
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
