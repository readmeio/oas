import type { OASDocument, SchemaObject } from 'oas/types';

import circularRequestBodies from '@readme/oas-examples/3.0/json/circular-request-bodies.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';

import { getTypedFormatsInSchema, parseJSONStrings, parseJSONStringsInBodyWithSchema } from '../../src/lib/utils.js';

function createOASDocument(components: Record<string, SchemaObject> = {}): OASDocument {
  return {
    openapi: '3.0.0',
    info: { title: 'test', version: '1.0.0' },
    paths: {},
    components: { schemas: components },
  } as unknown as OASDocument;
}

describe('#getTypedFormatsInSchema()', () => {
  it('should return the key for a matching format in a nested property', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    };

    const result = getTypedFormatsInSchema('binary', schema, createOASDocument(), {
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

    const result = getTypedFormatsInSchema('binary', schema, createOASDocument(), {
      payload: { name: 'test' },
    });

    expect(result).toStrictEqual([]);
  });

  it('should handle direct schema with matching format and no parentKey', () => {
    const schema: SchemaObject = { type: 'string', format: 'binary' };

    const result = getTypedFormatsInSchema('binary', schema, createOASDocument(), {
      payload: 'data',
    });

    expect(result).toBe(true);
  });

  it('should handle direct schema with matching format and a parentKey', () => {
    const schema: SchemaObject = { type: 'string', format: 'json' };

    const result = getTypedFormatsInSchema('json', schema, createOASDocument(), {
      payload: { field: '{}' },
      parentKey: 'field',
    });

    expect(result).toBe('field');
  });

  it('should not infinite-loop on direct self-referencing $ref (TreeNode)', () => {
    const api = circularRequestBodies as unknown as OASDocument;
    const schemas = circularRequestBodies.components.schemas;
    const schema = schemas.TreeNode as SchemaObject;

    const result = getTypedFormatsInSchema('binary', schema, api, {
      payload: { id: 'node-1', name: 'root', parent: { id: 'node-0', name: 'parent' } },
    });

    expect(result).toStrictEqual([]);
  });

  it('should not infinite-loop on indirect circular $ref (Person → Company → Person)', () => {
    const api = circularRequestBodies as unknown as OASDocument;
    const schemas = circularRequestBodies.components.schemas;
    const schema = schemas.Person as SchemaObject;

    const result = getTypedFormatsInSchema('binary', schema, api, {
      payload: { name: 'Alice', employer: { name: 'Acme', ceo: { name: 'Bob' } } },
    });

    expect(result).toStrictEqual([]);
  });

  it('should not infinite-loop on multiple self-referencing properties (LinkedNode)', () => {
    const api = circularRequestBodies as unknown as OASDocument;
    const schemas = circularRequestBodies.components.schemas;
    const schema = schemas.LinkedNode as SchemaObject;

    const result = getTypedFormatsInSchema('binary', schema, api, {
      payload: { id: 'node-1', prev: { id: 'node-0' }, next: { id: 'node-2' } },
    });

    expect(result).toStrictEqual([]);
  });

  it('should not lose results due to stack overflow when many circular refs fan out', () => {
    const schema = {
      type: 'object',
      properties: {
        a: { $ref: '#/components/schemas/S' },
        b: { $ref: '#/components/schemas/S' },
        c: { $ref: '#/components/schemas/S' },
        d: { $ref: '#/components/schemas/S' },
        e: { $ref: '#/components/schemas/S' },
        target: { type: 'string', format: 'binary' },
      },
    } as SchemaObject;

    const fanOutApi = createOASDocument({ S: schema });

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

    const result = getTypedFormatsInSchema('binary', schema, createOASDocument(), {
      payload: { files: ['file1', 'file2'] },
    });

    expect(result).toStrictEqual(['files.0', 'files.1']);
  });
});

describe('#parseJSONStrings()', () => {
  it('should return primitives unchanged', () => {
    expect(parseJSONStrings(42)).toBe(42);
    expect(parseJSONStrings(true)).toBe(true);
    expect(parseJSONStrings(false)).toBe(false);
    expect(parseJSONStrings(null)).toBeNull();
  });

  it('should return non-JSON strings unchanged', () => {
    expect(parseJSONStrings('hello')).toBe('hello');
    expect(parseJSONStrings('')).toBe('');
    expect(parseJSONStrings('not valid json')).toBe('not valid json');
  });

  it('should return invalid JSON strings unchanged', () => {
    expect(parseJSONStrings('{')).toBe('{');
    expect(parseJSONStrings('["unclosed')).toBe('["unclosed');
  });

  it('should parse a string that is valid JSON and return the parsed value', () => {
    expect(parseJSONStrings('42')).toBe(42);
    expect(parseJSONStrings('"quoted"')).toBe('quoted');
    expect(parseJSONStrings('true')).toBe(true);
    expect(parseJSONStrings('null')).toBeNull();
  });

  it('should parse a string that is a JSON object and recursively process it', () => {
    expect(parseJSONStrings('{"a":1}')).toStrictEqual({ a: 1 });
    expect(parseJSONStrings('{"a":1,"b":2}')).toStrictEqual({ a: 1, b: 2 });
  });

  it('should parse a string that is a JSON array and recursively process it', () => {
    expect(parseJSONStrings('[1,2,3]')).toStrictEqual([1, 2, 3]);
    expect(parseJSONStrings('[]')).toStrictEqual([]);
  });

  it('should recursively process plain objects', () => {
    expect(parseJSONStrings({ a: 1, b: 'x' })).toStrictEqual({ a: 1, b: 'x' });
  });

  it('should recursively process arrays', () => {
    expect(parseJSONStrings([1, 'x', true])).toStrictEqual([1, 'x', true]);
  });

  it('should parse nested JSON strings inside objects', () => {
    expect(
      parseJSONStrings({
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
    expect(parseJSONStrings([1, '{"x": 10}', 'text'])).toStrictEqual([1, { x: 10 }, 'text']);
  });

  it('should recursively parse JSON strings at any depth', () => {
    const result = parseJSONStrings({
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
    expect(parseJSONStrings(input)).toStrictEqual({
      outer: { inner: 42 },
    });
  });
});

describe('#parseJSONStringsInBodyWithSchema()', () => {
  const emptyAPIDefinition = createOASDocument();

  it('should match `parseJSONStrings` when the schema is undefined', () => {
    const payload = { a: 1, b: '{"x":2}', c: 'plain' };

    const matched = parseJSONStrings(structuredClone(payload));
    expect(matched).toStrictEqual({
      a: 1,
      b: {
        x: 2,
      },
      c: 'plain',
    });

    expect(parseJSONStringsInBodyWithSchema(payload, undefined, emptyAPIDefinition)).toStrictEqual(matched);
  });

  it('should keep numerical values as strings when the property is `type: string` without `format: json`', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        tin: { type: 'string', minLength: 9, maxLength: 9 },
        name: { type: 'string' },
      },
    };

    const payload = { tin: '123456789', name: 'Acme' };

    expect(parseJSONStringsInBodyWithSchema(payload, schema, emptyAPIDefinition)).toStrictEqual({
      tin: '123456789',
      name: 'Acme',
    });
  });

  it('should parse string values when property has `format: json`', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        meta: { type: 'string', format: 'json' },
        raw: { type: 'string' },
      },
    };

    const payload = { meta: '{"ok":true,"n":1}', raw: '{"ignored":1}' };

    expect(parseJSONStringsInBodyWithSchema(payload, schema, emptyAPIDefinition)).toStrictEqual({
      meta: { ok: true, n: 1 },
      raw: '{"ignored":1}',
    });
  });

  it('should coerce numeric strings for number and integer properties', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        count: { type: 'integer' },
        score: { type: 'number' },
      },
    };

    const payload = { count: '42', score: '3.5' };

    expect(parseJSONStringsInBodyWithSchema(payload, schema, emptyAPIDefinition)).toStrictEqual({
      count: 42,
      score: 3.5,
    });
  });

  it('should apply rules per nested property independently', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        payload: { type: 'string', format: 'json' },
        extra: { type: 'number' },
      },
    };

    const payload = { id: '007', payload: '{"a":1}', extra: '99' };

    expect(parseJSONStringsInBodyWithSchema(payload, schema, emptyAPIDefinition)).toStrictEqual({
      id: '007',
      payload: { a: 1 },
      extra: 99,
    });
  });

  it('should recurse into nested objects using property schemas', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        outer: {
          type: 'object',
          properties: {
            inner: { type: 'string' },
            data: { type: 'string', format: 'json' },
          },
        },
      },
    };

    const payload = { outer: { inner: '001', data: '{"k":"v"}' } };

    expect(parseJSONStringsInBodyWithSchema(payload, schema, emptyAPIDefinition)).toStrictEqual({
      outer: {
        inner: '001',
        data: { k: 'v' },
      },
    });
  });

  it('should use `items` schema for array elements', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
        nums: { type: 'array', items: { type: 'integer' } },
      },
    };

    const payload = { tags: ['01', '02'], nums: ['1', '2'] };

    expect(parseJSONStringsInBodyWithSchema(payload, schema, emptyAPIDefinition)).toStrictEqual({
      tags: ['01', '02'],
      nums: [1, 2],
    });
  });

  it('should parse `format: json` on array items', () => {
    const schema: SchemaObject = {
      type: 'array',
      items: { type: 'string', format: 'json' },
    };

    const payload = ['{"a":1}', '{"b":2}'];

    expect(parseJSONStringsInBodyWithSchema(payload, schema, emptyAPIDefinition)).toStrictEqual([{ a: 1 }, { b: 2 }]);
  });

  it('should leave stringified JSON as plain strings when items are `type: string` only', () => {
    const schema: SchemaObject = {
      type: 'array',
      items: { type: 'string' },
    };

    const payload = ['{"x":1}', 'plain'];

    expect(parseJSONStringsInBodyWithSchema(payload, schema, emptyAPIDefinition)).toStrictEqual(['{"x":1}', 'plain']);
  });

  it('should resolve top-level and nested `$ref` to components.schemas', () => {
    const api = createOASDocument({
      Row: {
        type: 'object',
        properties: {
          code: { type: 'string' },
        },
      },
      Wrapper: {
        type: 'object',
        properties: {
          row: { $ref: '#/components/schemas/Row' },
        },
      },
    });

    const schema: SchemaObject = { $ref: '#/components/schemas/Wrapper' };
    const payload = { row: { code: '001' } };

    expect(parseJSONStringsInBodyWithSchema(payload, schema, api)).toStrictEqual({
      row: { code: '001' },
    });
  });

  it('should resolve items `$ref`', () => {
    const api = createOASDocument({
      Item: { type: 'string' },
      ListHolder: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/Item' },
          },
        },
      },
    });

    const root: SchemaObject = { $ref: '#/components/schemas/ListHolder' };
    const payload = { items: ['01', '02'] };

    expect(parseJSONStringsInBodyWithSchema(payload, root, api)).toStrictEqual({
      items: ['01', '02'],
    });
  });

  it('should pick the `oneOf` branch whose properties match the payload keys when schema uses `oneOf`', () => {
    const schema: SchemaObject = {
      oneOf: [
        {
          type: 'object',
          properties: {
            mode: { type: 'string' },
          },
        },
        {
          type: 'object',
          properties: {
            other: { type: 'number' },
          },
        },
      ],
    };

    const payload = { mode: '001' };

    expect(parseJSONStringsInBodyWithSchema(payload, schema, emptyAPIDefinition)).toStrictEqual({
      mode: '001',
    });
  });

  it('should fallback to `parseJSONStrings` when object schema has no properties', () => {
    const schema: SchemaObject = { type: 'object' };
    const payload = { loose: '{"parsed":true}' };

    expect(parseJSONStringsInBodyWithSchema(payload, schema, emptyAPIDefinition)).toStrictEqual({
      loose: { parsed: true },
    });
  });

  it('should parse unknown object keys with full JSON-string rules (undefined prop schema)', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        known: { type: 'string' },
      },
    };

    const payload = { known: 'keep', unknown: '{"z":3}' };

    expect(parseJSONStringsInBodyWithSchema(payload, schema, emptyAPIDefinition)).toStrictEqual({
      known: 'keep',
      unknown: { z: 3 },
    });
  });

  it('should fallback to `parseJSONStrings` when the same `$ref` is seen twice (cycle)', () => {
    const api = createOASDocument({
      Node: {
        type: 'object',
        properties: {
          next: { $ref: '#/components/schemas/Node' },
          label: { type: 'string' },
        },
      },
    });

    const root: SchemaObject = { $ref: '#/components/schemas/Node' };
    const payload = {
      label: 'a',
      next: {
        label: 'b',
        next: { label: '001', next: { label: 'c', next: null } },
      },
    };

    const result = parseJSONStringsInBodyWithSchema(payload, root, api) as typeof payload;
    expect(result.label).toBe('a');
    expect(result.next?.label).toBe('b');
    expect(result.next?.next?.label).toBe('001');
  });

  it('should fallback for array elements when items `$ref` hits a cycle', () => {
    const api = createOASDocument({
      SelfList: {
        type: 'array',
        items: { $ref: '#/components/schemas/SelfList' },
      },
    });

    const root: SchemaObject = { $ref: '#/components/schemas/SelfList' };
    const payload = ['{"a":1}', '{"b":2}'];

    expect(parseJSONStringsInBodyWithSchema(payload, root, api)).toStrictEqual([{ a: 1 }, { b: 2 }]);
  });

  it('should apply the same `$ref` schema independently to sibling properties', () => {
    const api = createOASDocument({
      Thing: {
        type: 'object',
        properties: {
          label: {
            type: 'string',
          },
        },
      },
    });

    const schema: SchemaObject = {
      type: 'object',
      properties: {
        left: { $ref: '#/components/schemas/Thing' },
        right: { $ref: '#/components/schemas/Thing' },
      },
    };

    const payload = { left: { label: '[1,2,3]' }, right: { label: '[4,5,6]' } };

    expect(parseJSONStringsInBodyWithSchema(payload, schema, api)).toStrictEqual({
      left: {
        label: '[1,2,3]',
      },
      right: {
        label: '[4,5,6]',
      },
    });
  });

  it('should return non-object primitives unchanged at leaves', () => {
    const schema: SchemaObject = { type: 'object', properties: { n: { type: 'number' } } };
    const payload = { n: 5 };

    expect(parseJSONStringsInBodyWithSchema(payload, schema, emptyAPIDefinition)).toStrictEqual({ n: 5 });
  });

  it('should treat root string with schema `type: string` as opaque', () => {
    const schema: SchemaObject = { type: 'string' };
    const payload = '{"not":"parsed"}';

    expect(parseJSONStringsInBodyWithSchema(payload, schema, emptyAPIDefinition)).toBe('{"not":"parsed"}');
  });

  it('should parse root string when schema is `format: json`', () => {
    const schema: SchemaObject = { type: 'string', format: 'json' };
    const payload = '{"x":1}';

    expect(parseJSONStringsInBodyWithSchema(payload, schema, emptyAPIDefinition)).toStrictEqual({ x: 1 });
  });

  it('should handle OpenAPI 3.1 style `string | null` type arrays on a property', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        code: { type: ['string', 'null'] },
      },
    };

    const payload = { code: '00123' };

    expect(parseJSONStringsInBodyWithSchema(payload, schema, emptyAPIDefinition)).toStrictEqual({
      code: '00123',
    });
  });

  it('should leave invalid JSON strings unchanged even for non-string schema branches', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        n: { type: 'integer' },
      },
    };

    const payload = { n: 'not-a-number' };

    expect(parseJSONStringsInBodyWithSchema(payload, schema, emptyAPIDefinition)).toStrictEqual({
      n: 'not-a-number',
    });
  });
});
