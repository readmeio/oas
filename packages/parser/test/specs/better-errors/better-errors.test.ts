import { describe, expect, it } from 'vitest';

import { relativePath } from '../../utils.js';
import { toValidate } from '../../vitest.matchers.js';

expect.extend({ toValidate });

describe('Better errors', () => {
  describe('invalid `x-` extension at the root level', () => {
    it('OpenAPI 3.0', async () => {
      await expect(relativePath('specs/better-errors/3.0/invalid-x-extension-root.yaml')).not.toValidate({
        errors: [{ message: expect.stringContaining('invalid-x-extension is not expected to be here!') }],
      });
    });

    it('OpenAPI 3.1', async () => {
      await expect(relativePath('specs/better-errors/3.1/invalid-x-extension-root.yaml')).not.toValidate({
        errors: [{ message: expect.stringContaining('invalid-x-extension is not expected to be here!') }],
      });
    });
  });

  describe('invalid `x-` extension at a path level', () => {
    it('OpenAPI 3.0', async () => {
      await expect(relativePath('specs/better-errors/3.0/invalid-x-extension-path.yaml')).not.toValidate({
        errors: [{ message: expect.stringContaining('invalid-x-extension is not expected to be here!') }],
      });
    });

    it('OpenAPI 3.1', async () => {
      await expect(relativePath('specs/better-errors/3.1/invalid-x-extension-path.yaml')).not.toValidate({
        errors: [{ message: expect.stringContaining('invalid-x-extension is not expected to be here!') }],
      });
    });
  });

  // Due to the JSON Schema changes in OpenAPI 3.1 this case is currently only applicable with
  // Swagger 2.0 and OpenAPI 3.0.
  describe('misplaced `additionalProperty`', () => {
    it('Swagger 2.0', async () => {
      await expect(relativePath('specs/better-errors/2.0/misplaced-additionalProperty.yaml')).not.toValidate({
        errors: [{ message: expect.stringContaining('originalRef is not expected to be here') }],
      });
    });

    it('OpenAPI 3.0', async () => {
      await expect(relativePath('specs/better-errors/3.0/misplaced-additionalProperty.yaml')).not.toValidate({
        errors: [{ message: expect.stringContaining('originalRef is not expected to be here') }],
      });
    });
  });

  // The JSON Schema for OpenAPI 3.1 is the only schema available that can properly detect these
  // within AJV so we're only testing that here. OpenAPI 3.0 and Swagger 2.0 have tests cases for
  // this under within the `validate-spec` suite.
  describe('invalid component name', () => {
    it('OpenAPI 3.1', async () => {
      await expect(relativePath('specs/better-errors/3.1/invalid-component-name.yaml')).not.toValidate({
        errors: [{ message: expect.stringContaining('must match pattern ^[a-zA-Z0-9._-]+$') }],
      });
    });
  });

  describe('missing component', () => {
    it.todo('OpenAPI 3.0');

    it.todo('OpenAPI 3.1');
  });
});
