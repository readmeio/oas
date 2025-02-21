/* eslint-disable @vitest/expect-expect */
import { describe, it, expect, assert } from 'vitest';

import { ValidationError } from '../../../src/errors.js';
import { validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';

async function assertInvalid(file: string, error: string) {
  try {
    await validate(relativePath(`specs/better-errors/${file}`));
    assert.fail('Validation should have failed, but it succeeded!');
  } catch (err) {
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.message).toContain(error);
  }
}

describe('Better errors', () => {
  describe('invalid `x-` extension at the root level', () => {
    it('OpenAPI 3.0', () =>
      assertInvalid('3.0/invalid-x-extension-root.yaml', 'invalid-x-extension is not expected to be here!'));

    it('OpenAPI 3.1', () =>
      assertInvalid('3.1/invalid-x-extension-root.yaml', 'invalid-x-extension is not expected to be here!'));
  });

  describe('invalid `x-` extension at a path level', () => {
    it('OpenAPI 3.0', () =>
      assertInvalid('3.0/invalid-x-extension-path.yaml', 'invalid-x-extension is not expected to be here!'));

    it('OpenAPI 3.1', () =>
      assertInvalid('3.1/invalid-x-extension-path.yaml', 'invalid-x-extension is not expected to be here!'));
  });

  // Due to the JSON Schema changes in OpenAPI 3.1 this case is currently only applicable with
  // Swagger 2.0 and OpenAPI 3.0.
  describe('misplaced `additionalProperty`', () => {
    it('Swagger 2.0', () =>
      assertInvalid('2.0/misplaced-additionalProperty.yaml', 'originalRef is not expected to be here'));

    it('OpenAPI 3.0', () =>
      assertInvalid('3.0/misplaced-additionalProperty.yaml', 'originalRef is not expected to be here'));
  });

  // The JSON Schema for OpenAPI 3.1 is the only schema available that can properly detect these
  // within AJV so we're only testing that here. OpenAPI 3.0 and Swagger 2.0 have tests cases for
  // this under within the `validate-spec` suite.
  describe('invalid component name', () => {
    it('OpenAPI 3.1', () => assertInvalid('3.1/invalid-component-name.yaml', 'must match pattern ^[a-zA-Z0-9._-]+$'));
  });

  describe('missing component', () => {
    it.todo('OpenAPI 3.0');

    it.todo('OpenAPI 3.1');
  });
});
