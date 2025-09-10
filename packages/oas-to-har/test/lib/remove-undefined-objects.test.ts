import { describe, test, it, expect } from 'vitest';

import removeUndefinedObjects from '../../src/lib/remove-undefined-objects.js';

describe('typings', () => {
  it('should not blow away typings from supplied objects', () => {
    const obj = removeUndefinedObjects({
      key: 'buster',
    });

    expect(obj).toBeDefined();
  });
});

test('should leave primitives alone', () => {
  expect(removeUndefinedObjects(1234)).toBe(1234);
  expect(removeUndefinedObjects('1234')).toBe('1234');
  expect(removeUndefinedObjects(null)).toBeNull();
  expect(removeUndefinedObjects()).toBeUndefined();
  expect(removeUndefinedObjects(undefined)).toBeUndefined();
});

test('should leave only truthy primitives alone when removeAllFalsy is true', () => {
  expect(removeUndefinedObjects(1234, { removeAllFalsy: true })).toBe(1234);
  expect(removeUndefinedObjects('1234', { removeAllFalsy: true })).toBe('1234');
  expect(removeUndefinedObjects(null, { removeAllFalsy: true })).toBeUndefined();
  expect(removeUndefinedObjects(undefined, { removeAllFalsy: true })).toBeUndefined();
});

test("should also remove '' and null values when removeAllFalsy is true", () => {
  expect(removeUndefinedObjects({ value: 1234 }, { removeAllFalsy: true })).toStrictEqual({ value: 1234 });
  expect(removeUndefinedObjects({ value: '1234' }, { removeAllFalsy: true })).toStrictEqual({ value: '1234' });
  expect(removeUndefinedObjects({ value: null }, { removeAllFalsy: true })).toBeUndefined();
  expect(removeUndefinedObjects({ value: undefined }, { removeAllFalsy: true })).toBeUndefined();
});

test('should remove empty objects with only empty properties', () => {
  const obj = {
    a: {
      b: {},
      c: {
        d: {},
      },
    },
  };

  expect(removeUndefinedObjects(obj)).toBeUndefined();
});

test('should remove empty objects with only undefined properties', () => {
  const obj = {
    a: {
      b: undefined,
      c: {
        d: undefined,
      },
    },
  };

  expect(removeUndefinedObjects(obj)).toBeUndefined();
});

test('should remove empty arrays from within object', () => {
  const obj = {
    a: {
      b: undefined,
      c: {
        d: undefined,
      },
    },
    d: [1234, undefined],
    e: [],
    f: null,
    g: [null, undefined, null],
  };

  expect(removeUndefinedObjects(obj)).toStrictEqual({
    d: [1234],
    f: null,
    g: [null, null],
  });
});

test('should remove empty arrays and falsy values from within object when removeAllFalsy is true', () => {
  const obj = {
    a: {
      b: undefined,
      c: {
        d: undefined,
      },
    },
    d: [1234, undefined],
    e: [],
    f: null,
    g: [null, undefined, null],
  };

  expect(removeUndefinedObjects(obj, { removeAllFalsy: true })).toStrictEqual({
    d: [1234],
  });
});

test('should remove undefined values from arrays & not null values', () => {
  expect(removeUndefinedObjects([undefined, undefined])).toBeUndefined();
  expect(removeUndefinedObjects([null])).toStrictEqual([null]);
  expect(removeUndefinedObjects(['1234', null, undefined, { a: null, b: undefined }, '   ', ''])).toStrictEqual([
    '1234',
    null,
    {
      a: null,
    },
    '   ',
    '',
  ]);
});
