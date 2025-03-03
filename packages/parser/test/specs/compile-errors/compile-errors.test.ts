import { describe, it, expect } from 'vitest';

import { validate, compileErrors } from '../../../src/index.js';
import { relativePath } from '../../utils.js';
import { toValidate } from '../../vitest.matchers.js';

expect.extend({ toValidate });

describe('`compileErrors`', () => {
  describe('given a definition with schema-level errors', () => {
    it('should compile errors', async () => {
      const result = await validate(relativePath('specs/colorize-errors-option/invalid.json'));

      expect(compileErrors(result)).toMatchInlineSnapshot(`
        "OpenAPI schema validation failed.

        ADDITIONAL PROPERTY must NOT have additional properties

          17 |             "name": "status",
          18 |             "in": "query",
        > 19 |             "type": "array",
             |             ^^^^^^ type is not expected to be here!
          20 |             "schema": {
          21 |               "items": {
          22 |                 "type": "string","
      `);
    });

    describe('and there are multiple errors', () => {
      it('should compile errors', async () => {
        const result = await validate(relativePath('specs/compile-errors/invalid-with-multiple-errors.yaml'));

        expect(compileErrors(result)).toMatchInlineSnapshot(`
          "OpenAPI schema validation failed.

          ADDITIONAL PROPERTY must NOT have additional properties

            17 |             "name": "status",
            18 |             "in": "query",
          > 19 |             "type": "array",
               |             ^^^^^^ type is not expected to be here!
            20 |             "schema": {
            21 |               "items": {
            22 |                 "type": "string",

          ADDITIONAL PROPERTY must NOT have additional properties

            39 |             "name": "status",
            40 |             "in": "query",
          > 41 |             "type": "array",
               |             ^^^^^^ type is not expected to be here!
            42 |             "schema": {
            43 |               "items": {
            44 |                 "type": "string","
        `);
      });
    });
  });

  describe('given a definition with spec-level warnings', () => {
    it('should compile errors', async () => {
      const result = await validate(relativePath('specs/validate-spec/invalid/3.x/duplicate-header-params.yaml'), {
        validate: {
          rules: {
            openapi: {
              'duplicate-non-request-body-parameters': 'warning',
            },
          },
        },
      });

      expect(compileErrors(result)).toMatchInlineSnapshot(`
        "OpenAPI schema validation succeeded, but with warnings.

        Found multiple \`header\` parameters named \`foo\` in \`/paths/users/{username}\`."
      `);
    });
  });

  describe('given a definition with schema-level errors and spec-level warnings', () => {
    it('should compile errors', async () => {
      const result = await validate(relativePath('specs/compile-errors/invalid-with-errors-and-warnings.yaml'), {
        validate: {
          rules: {
            openapi: {
              'duplicate-non-request-body-parameters': 'warning',
            },
          },
        },
      });

      expect(compileErrors(result)).toMatchInlineSnapshot(`
      "OpenAPI schema validation failed.

      \`/paths/users/{username}/get\` has a path parameter named \`username\`, but there is no corresponding \`{username}\` in the path string.

      \`/paths/dogs/{name}/get\` has a path parameter named \`name\`, but there is no corresponding \`{name}\` in the path string.

      We have also found some additional warnings:

      Found multiple \`path\` parameters named \`username\` in \`/paths/users/{username}/get\`.

      Found multiple \`path\` parameters named \`name\` in \`/paths/dogs/{name}/get\`."
    `);
    });
  });
});
