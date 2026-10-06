import type { ErrorObject } from 'ajv';

import { describe, expect, it } from 'vitest';

import { reduceAjvErrors } from '../../src/lib/reduceAjvErrors.js';

function error(instancePath: string, message = 'must be string'): ErrorObject {
  return { instancePath, message, keyword: 'type', params: {}, schemaPath: '#/type' };
}

describe('#reduceAjvErrors', () => {
  it('should only keep the deepest error of a lineage', () => {
    const errors = [
      error('/paths/~1pets/get/responses/200'),
      error('/paths/~1pets/get/responses'),
      error('/paths/~1pets'),
    ];

    expect(reduceAjvErrors(errors)).toStrictEqual([errors[0]]);
  });

  it('should keep one error per `instancePath`', () => {
    const errors = [
      error('/info', "must have required property 'title'"),
      error('/info', "must have required property 'version'"),
    ];

    expect(reduceAjvErrors(errors)).toStrictEqual([errors[0]]);
  });

  it('should keep errors of siblings whose paths share a prefix', () => {
    const errors = [error('/paths/~1pets/get/parameters/10'), error('/paths/~1pets/get/parameters/1')];

    expect(reduceAjvErrors(errors)).toStrictEqual(errors);
  });

  it('should drop `$ref` and `oneOf` noise', () => {
    const errors = [
      error('/components/schemas/pet', "must have required property '$ref'"),
      error('/components/schemas/pet', 'must match exactly one schema in oneOf'),
      error('/components/schemas/pet/type'),
    ];

    expect(reduceAjvErrors(errors)).toStrictEqual([errors[2]]);
  });

  it('should return the original errors if everything was noise', () => {
    const errors = [error('/components/schemas/pet', "must have required property '$ref'")];

    expect(reduceAjvErrors(errors)).toBe(errors);
  });

  it('should reduce a large number of errors in linear time', () => {
    const errors = Array.from({ length: 200_000 }, (_, i) => error(`/paths/~1pets/get/parameters/${i}/in`));

    expect(reduceAjvErrors(errors)).toHaveLength(200_000);
  }, 5_000);
});
