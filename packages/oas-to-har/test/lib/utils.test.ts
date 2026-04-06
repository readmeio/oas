import type { OASDocument, SchemaObject } from 'oas/types';

import circularRequestBodies from '@readme/oas-examples/3.0/json/circular-request-bodies.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';

import { getTypedFormatsInSchema, parseJsonStringsInBody } from '../../src/lib/utils.js';

describe('getTypedFormatsInSchema', () => {
  const api = circularRequestBodies as unknown as OASDocument;
  const schemas = circularRequestBodies.components.schemas as Record<string, SchemaObject>;

  function createApi(components: Record<string, SchemaObject> = {}): OASDocument {
    return {
      openapi: '3.0.0',
      info: { title: 'test', version: '1.0.0' },
      paths: {},
      components: { schemas: components },
    } as unknown as OASDocument;
  }

  it('should return the key for a matching format in a nested property', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    };

    const result = getTypedFormatsInSchema('binary', schema, createApi(), {
      payload: { file: 'data' },
    });

    expect(result).toStrictEqual(['file']);
  });

  it('should return false when no matching format exists', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };

    const result = getTypedFormatsInSchema('binary', schema, createApi(), {
      payload: { name: 'test' },
    });

    expect(result).toStrictEqual([]);
  });

  it('should handle direct schema with matching format and no parentKey', () => {
    const schema: SchemaObject = { type: 'string', format: 'binary' };

    const result = getTypedFormatsInSchema('binary', schema, createApi(), {
      payload: 'data',
    });

    expect(result).toBe(true);
  });

  it('should handle direct schema with matching format and a parentKey', () => {
    const schema: SchemaObject = { type: 'string', format: 'json' };

    const result = getTypedFormatsInSchema('json', schema, createApi(), {
      payload: { field: '{}' },
      parentKey: 'field',
    });

    expect(result).toBe('field');
  });

  it('should not infinite-loop on direct self-referencing $ref (TreeNode)', () => {
    const schema = schemas.TreeNode as SchemaObject;

    const result = getTypedFormatsInSchema('binary', schema, api, {
      payload: { id: 'node-1', name: 'root', parent: { id: 'node-0', name: 'parent' } },
    });

    expect(result).toStrictEqual([]);
  });

  it('should not infinite-loop on indirect circular $ref (Person → Company → Person)', () => {
    const schema = schemas.Person as SchemaObject;

    const result = getTypedFormatsInSchema('binary', schema, api, {
      payload: { name: 'Alice', employer: { name: 'Acme', ceo: { name: 'Bob' } } },
    });

    expect(result).toStrictEqual([]);
  });

  it('should not infinite-loop on multiple self-referencing properties (LinkedNode)', () => {
    const schema = schemas.LinkedNode as SchemaObject;

    const result = getTypedFormatsInSchema('binary', schema, api, {
      payload: { id: 'node-1', prev: { id: 'node-0' }, next: { id: 'node-2' } },
    });

    expect(result).toStrictEqual([]);
  });

  it('should not lose results due to stack overflow when many circular refs fan out', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        a: { $ref: '#/components/schemas/S' } as unknown as SchemaObject,
        b: { $ref: '#/components/schemas/S' } as unknown as SchemaObject,
        c: { $ref: '#/components/schemas/S' } as unknown as SchemaObject,
        d: { $ref: '#/components/schemas/S' } as unknown as SchemaObject,
        e: { $ref: '#/components/schemas/S' } as unknown as SchemaObject,
        target: { type: 'string', format: 'binary' },
      },
    };

    const fanOutApi = createApi({ S: schema });

    const result = getTypedFormatsInSchema('binary', schema, fanOutApi, {
      payload: { a: {}, b: {}, c: {}, d: {}, e: {}, target: 'data' },
    });

    expect(result).toContain('target');
  });

  it('should handle array items with matching format', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    };

    const result = getTypedFormatsInSchema('binary', schema, createApi(), {
      payload: { files: ['file1', 'file2'] },
    });

    expect(result).toStrictEqual(['files.0', 'files.1']);
  });
});

describe('parseJsonStringsInBody', () => {
  it('should return primitives unchanged', () => {
    expect(parseJsonStringsInBody(42)).toBe(42);
    expect(parseJsonStringsInBody(true)).toBe(true);
    expect(parseJsonStringsInBody(false)).toBe(false);
    expect(parseJsonStringsInBody(null)).toBe(null);
  });

  it('should return non-JSON strings unchanged', () => {
    expect(parseJsonStringsInBody('hello')).toBe('hello');
    expect(parseJsonStringsInBody('')).toBe('');
    expect(parseJsonStringsInBody('not valid json')).toBe('not valid json');
  });

  it('should return invalid JSON strings unchanged', () => {
    expect(parseJsonStringsInBody('{')).toBe('{');
    expect(parseJsonStringsInBody('["unclosed')).toBe('["unclosed');
  });

  it('should parse a string that is valid JSON and return the parsed value', () => {
    expect(parseJsonStringsInBody('42')).toBe(42);
    expect(parseJsonStringsInBody('"quoted"')).toBe('quoted');
    expect(parseJsonStringsInBody('true')).toBe(true);
    expect(parseJsonStringsInBody('null')).toBe(null);
  });

  it('should parse a string that is a JSON object and recursively process it', () => {
    expect(parseJsonStringsInBody('{"a":1}')).toStrictEqual({ a: 1 });
    expect(parseJsonStringsInBody('{"a":1,"b":2}')).toStrictEqual({ a: 1, b: 2 });
  });

  it('should parse a string that is a JSON array and recursively process it', () => {
    expect(parseJsonStringsInBody('[1,2,3]')).toStrictEqual([1, 2, 3]);
    expect(parseJsonStringsInBody('[]')).toStrictEqual([]);
  });

  it('should recursively process plain objects', () => {
    expect(parseJsonStringsInBody({ a: 1, b: 'x' })).toStrictEqual({ a: 1, b: 'x' });
  });

  it('should recursively process arrays', () => {
    expect(parseJsonStringsInBody([1, 'x', true])).toStrictEqual([1, 'x', true]);
  });

  it('should parse nested JSON strings inside objects', () => {
    expect(
      parseJsonStringsInBody({
        a: 1,
        b: '{"nested": true}',
        c: 'plain',
      }),
    ).toStrictEqual({
      a: 1,
      b: { nested: true },
      c: 'plain',
    });
  });

  it('should parse nested JSON strings inside arrays', () => {
    expect(parseJsonStringsInBody([1, '{"x": 10}', 'text'])).toStrictEqual([1, { x: 10 }, 'text']);
  });

  it('should recursively parse JSON strings at any depth', () => {
    const result = parseJsonStringsInBody({
      level1: '{"level2": "{\\"level3\\": 42}"}',
    });

    expect(result).toStrictEqual({
      level1: {
        level2: {
          level3: 42,
        },
      },
    });
  });

  it('should parse object from string and then process nested JSON strings within it', () => {
    const input = '{"outer": "{\\"inner\\": 42}"}';
    expect(parseJsonStringsInBody(input)).toStrictEqual({
      outer: { inner: 42 },
    });
  });
});
