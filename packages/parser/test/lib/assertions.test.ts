import { describe, expect, it } from 'vitest';

import { isOpenAPI, isOpenAPI30, isOpenAPI31, isOpenAPI32, isSwagger } from '../../src/lib/assertions.js';

describe('specification assertions', () => {
  it.each([
    [{ swagger: '2.0' }, true],
    [{ openapi: '3.0.0' }, false],
    [{}, false],
  ])('isSwagger(%j) → %s', (schema, expected) => {
    expect(isSwagger(schema)).toBe(expected);
  });

  it.each([
    [{ openapi: '3.0.0' }, true],
    [{ openapi: '3.1.0' }, true],
    [{ openapi: '3.2.0' }, true],
    [{ swagger: '2.0' }, false],
    [{}, false],
  ])('isOpenAPI(%j) → %s', (schema, expected) => {
    expect(isOpenAPI(schema)).toBe(expected);
  });

  it.each([
    ['3.0.0', true],
    ['3.0.3', true],
    ['3.1.0', false],
    ['3.2.0', false],
  ])('isOpenAPI30 identifies %s as %s', (openapi, expected) => {
    expect(isOpenAPI30({ openapi })).toBe(expected);
  });

  it.each([
    ['3.1.0', true],
    ['3.1.1', true],
    ['3.0.0', false],
    ['3.2.0', false],
  ])('isOpenAPI31 identifies %s as %s', (openapi, expected) => {
    expect(isOpenAPI31({ openapi })).toBe(expected);
  });

  it.each([
    ['3.2.0', true],
    ['3.2.1', true],
    ['3.0.0', false],
    ['3.1.0', false],
  ])('isOpenAPI32 identifies %s as %s', (openapi, expected) => {
    expect(isOpenAPI32({ openapi })).toBe(expected);
  });
});
