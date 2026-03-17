import { describe, expect, it } from 'vitest';

import { parseJsonStringsInBody } from '../../src/lib/utils.js';

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
