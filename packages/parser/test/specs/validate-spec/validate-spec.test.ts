import { describe, expect, it } from 'vitest';

import { validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';
import { toValidate } from '../../vitest.matchers.js';

expect.extend({ toValidate });

describe('Invalid APIs (specification validation)', () => {
  describe('Swagger 2.0-specific cases', () => {
    it('should catch invalid response codes', async () => {
      await expect(relativePath('specs/validate-spec/invalid/2.0/invalid-response-code.yaml')).not.toValidate({
        errors: [{ message: '`/paths/users/get/responses/888` has an invalid response code: 888' }],
      });
    });

    it('should catch multiple body parameters in path', async () => {
      await expect(relativePath('specs/validate-spec/invalid/2.0/multiple-path-body-params.yaml')).not.toValidate({
        errors: [{ message: '`/paths/users/{username}/get` has 2 body parameters. Only one is allowed.' }],
      });
    });

    it('should catch multiple body parameters in operation', async () => {
      await expect(relativePath('specs/validate-spec/invalid/2.0/multiple-operation-body-params.yaml')).not.toValidate({
        errors: [{ message: '`/paths/users/{username}/patch` has 2 body parameters. Only one is allowed.' }],
      });
    });

    it('should catch multiple body parameters in path & operation', async () => {
      await expect(relativePath('specs/validate-spec/invalid/2.0/multiple-body-params.yaml')).not.toValidate({
        errors: [{ message: '`/paths/users/{username}/post` has 2 body parameters. Only one is allowed.' }],
      });
    });

    it('should catch if there are body and formData parameters', async () => {
      await expect(relativePath('specs/validate-spec/invalid/2.0/body-and-form-params.yaml')).not.toValidate({
        errors: [
          {
            message:
              '`/paths/users/{username}/post` has `body` and `formData` parameters. Only one or the other is allowed.',
          },
        ],
      });
    });

    it('should catch duplicate path placeholders', async () => {
      await expect(relativePath('specs/validate-spec/invalid/2.0/duplicate-path-placeholders.yaml')).not.toValidate({
        errors: [
          {
            message:
              '`/paths/users/{username}/profile/{username}/image/{img_id}/get` has multiple path placeholders named `{username}`.',
          },
          {
            message:
              '`/paths/users/{username}/profile/{username}/image/{img_id}/get` is missing path parameter(s) for `{username}`.',
          },
        ],
      });
    });

    it('should catch `file` parameters without a `consumes` declaration', async () => {
      await expect(relativePath('specs/validate-spec/invalid/2.0/file-no-consumes.yaml')).not.toValidate({
        errors: [
          {
            message:
              '`/paths/users/{username}/profile/image/post` has a file parameter, so it must consume `multipart/form-data` or `application/x-www-form-urlencoded`.',
          },
        ],
      });
    });

    it('should catch `file` parameters with an invalid `consumes` declaration', async () => {
      await expect(relativePath('specs/validate-spec/invalid/2.0/file-invalid-consumes.yaml')).not.toValidate({
        errors: [
          {
            message:
              '`/paths/users/{username}/profile/image/post` has a file parameter, so it must consume `multipart/form-data` or `application/x-www-form-urlencoded`.',
          },
        ],
      });
    });

    it("should catch if a required property in a component doesn't exist", async () => {
      await expect(
        relativePath('specs/validate-spec/invalid/2.0/required-property-not-defined-definitions.yaml'),
      ).not.toValidate({
        errors: [{ message: 'Property `photoUrls` is listed as required but does not exist in `/definitions/Pet`.' }],
      });
    });

    it('should allow a `file` parameter with a vendor specific form-data `consumes` declaration', async () => {
      await expect(
        relativePath('specs/validate-spec/valid/2.0/file-vendor-specific-consumes-formdata.yaml'),
      ).toValidate();
    });

    it('should allow a `file` parameter with a vendor specific urlencoded `consumes` declaration', async () => {
      await expect(
        relativePath('specs/validate-spec/valid/2.0/file-vendor-specific-consumes-urlencoded.yaml'),
      ).toValidate();
    });
  });

  describe('rule: `duplicate-non-request-body-parameters`', () => {
    describe('given duplicate header parameters', () => {
      describe('Swagger 2.0', () => {
        it('should always catch an error', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/duplicate-header-params.yaml')).not.toValidate({
            errors: [{ message: 'Found multiple `header` parameters named `foo` in `/paths/users/{username}`.' }],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/duplicate-header-params.yaml')).toValidate({
            rules: {
              swagger: {
                'duplicate-non-request-body-parameters': 'warning',
              },
            },
            warnings: [{ message: 'Found multiple `header` parameters named `foo` in `/paths/users/{username}`.' }],
          });
        });
      });

      describe('OpenAPI 3.x', () => {
        it('should catch an error by default', async () => {
          await expect(relativePath('specs/validate-spec/invalid/3.x/duplicate-header-params.yaml')).not.toValidate({
            errors: [{ message: 'Found multiple `header` parameters named `foo` in `/paths/users/{username}`.' }],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/3.x/duplicate-header-params.yaml')).toValidate({
            rules: {
              openapi: {
                'duplicate-non-request-body-parameters': 'warning',
              },
            },
            warnings: [{ message: 'Found multiple `header` parameters named `foo` in `/paths/users/{username}`.' }],
          });
        });
      });
    });

    describe('given duplicate operation-level parameters', () => {
      describe('Swagger 2.0', () => {
        it('should always catch an error', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/duplicate-operation-params.yaml')).not.toValidate({
            errors: [
              { message: 'Found multiple `path` parameters named `username` in `/paths/users/{username}/get`.' },
              {
                message:
                  '`/paths/users/{username}/get` has a path parameter named `username`, but there is no corresponding `{username}` in the path string.',
              },
            ],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/duplicate-operation-params.yaml')).not.toValidate({
            rules: {
              swagger: {
                'duplicate-non-request-body-parameters': 'warning',
              },
            },
            errors: [
              {
                message:
                  '`/paths/users/{username}/get` has a path parameter named `username`, but there is no corresponding `{username}` in the path string.',
              },
            ],
            warnings: [
              { message: 'Found multiple `path` parameters named `username` in `/paths/users/{username}/get`.' },
            ],
          });
        });
      });

      describe('OpenAPI 3.x', () => {
        it('should catch an error by default', async () => {
          await expect(relativePath('specs/validate-spec/invalid/3.x/duplicate-operation-params.yaml')).not.toValidate({
            errors: [
              { message: 'Found multiple `path` parameters named `username` in `/paths/users/{username}/get`.' },
              {
                message:
                  '`/paths/users/{username}/get` has a path parameter named `username`, but there is no corresponding `{username}` in the path string.',
              },
            ],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/3.x/duplicate-operation-params.yaml')).not.toValidate({
            rules: {
              openapi: {
                'duplicate-non-request-body-parameters': 'warning',
              },
            },
            errors: [
              {
                message:
                  '`/paths/users/{username}/get` has a path parameter named `username`, but there is no corresponding `{username}` in the path string.',
              },
            ],
            warnings: [
              { message: 'Found multiple `path` parameters named `username` in `/paths/users/{username}/get`.' },
            ],
          });
        });
      });
    });
  });

  describe('rule: `path-parameters-not-in-path`', () => {
    describe('given a path parameter with no matching template', () => {
      describe('Swagger 2.0', () => {
        it('should always catch an error', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/path-param-no-placeholder.yaml')).not.toValidate({
            errors: [
              {
                message:
                  '`/paths/users/{username}/post` has a path parameter named `foo`, but there is no corresponding `{foo}` in the path string.',
              },
            ],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/path-param-no-placeholder.yaml')).toValidate({
            rules: {
              swagger: {
                'path-parameters-not-in-path': 'warning',
              },
            },
            warnings: [
              {
                message:
                  '`/paths/users/{username}/post` has a path parameter named `foo`, but there is no corresponding `{foo}` in the path string.',
              },
            ],
          });
        });
      });

      describe('OpenAPI 3.x', () => {
        it('should catch an error by default', async () => {
          await expect(relativePath('specs/validate-spec/invalid/3.x/path-param-no-placeholder.yaml')).not.toValidate({
            errors: [
              {
                message:
                  '`/paths/users/{username}/post` has a path parameter named `foo`, but there is no corresponding `{foo}` in the path string.',
              },
            ],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/3.x/path-param-no-placeholder.yaml')).toValidate({
            rules: {
              openapi: {
                'path-parameters-not-in-path': 'warning',
              },
            },
            warnings: [
              {
                message:
                  '`/paths/users/{username}/post` has a path parameter named `foo`, but there is no corresponding `{foo}` in the path string.',
              },
            ],
          });
        });
      });
    });
  });

  describe('rule: `path-parameters-not-in-parameters`', () => {
    describe('given a path template with no matching parameter', () => {
      describe('Swagger 2.0', () => {
        it('should always catch an error', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/path-placeholder-no-param.yaml')).not.toValidate({
            errors: [
              { message: '`/paths/users/{username}/{foo}/get` is missing path parameter(s) for `{foo}`.' },
              { message: '`/paths/users/{username}/{foo}/post` is missing path parameter(s) for `{foo}`.' },
            ],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/path-placeholder-no-param.yaml')).toValidate({
            rules: {
              swagger: {
                'path-parameters-not-in-parameters': 'warning',
              },
            },
            warnings: [
              { message: '`/paths/users/{username}/{foo}/get` is missing path parameter(s) for `{foo}`.' },
              { message: '`/paths/users/{username}/{foo}/post` is missing path parameter(s) for `{foo}`.' },
            ],
          });
        });
      });

      describe('OpenAPI 3.x', () => {
        it('should catch an error by default', async () => {
          await expect(relativePath('specs/validate-spec/invalid/3.x/path-placeholder-no-param.yaml')).not.toValidate({
            errors: [
              { message: '`/paths/users/{username}/{foo}/get` is missing path parameter(s) for `{foo}`.' },
              { message: '`/paths/users/{username}/{foo}/post` is missing path parameter(s) for `{foo}`.' },
            ],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/3.x/path-placeholder-no-param.yaml')).toValidate({
            rules: {
              openapi: {
                'path-parameters-not-in-parameters': 'warning',
              },
            },
            warnings: [
              { message: '`/paths/users/{username}/{foo}/get` is missing path parameter(s) for `{foo}`.' },
              { message: '`/paths/users/{username}/{foo}/post` is missing path parameter(s) for `{foo}`.' },
            ],
          });
        });
      });
    });

    describe('given path templates with no parameters', () => {
      describe('Swagger 2.0', () => {
        it('should always catch an error', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/no-path-params.yaml')).not.toValidate({
            errors: [
              {
                message:
                  '`/paths/users/{username}/{foo}/get` is missing path parameter(s) for `{username}` and `{foo}`.',
              },
              {
                message:
                  '`/paths/users/{username}/{foo}/post` is missing path parameter(s) for `{username}` and `{foo}`.',
              },
            ],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/no-path-params.yaml')).toValidate({
            rules: {
              swagger: {
                'path-parameters-not-in-parameters': 'warning',
              },
            },
            warnings: [
              {
                message:
                  '`/paths/users/{username}/{foo}/get` is missing path parameter(s) for `{username}` and `{foo}`.',
              },
              {
                message:
                  '`/paths/users/{username}/{foo}/post` is missing path parameter(s) for `{username}` and `{foo}`.',
              },
            ],
          });
        });
      });

      describe('OpenAPI 3.x', () => {
        it('should catch an error by default', async () => {
          await expect(relativePath('specs/validate-spec/invalid/3.x/no-path-params.yaml')).not.toValidate({
            errors: [
              {
                message:
                  '`/paths/users/{username}/{foo}/get` is missing path parameter(s) for `{username}` and `{foo}`.',
              },
              {
                message:
                  '`/paths/users/{username}/{foo}/post` is missing path parameter(s) for `{username}` and `{foo}`.',
              },
            ],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/3.x/no-path-params.yaml')).toValidate({
            rules: {
              openapi: {
                'path-parameters-not-in-parameters': 'warning',
              },
            },
            warnings: [
              {
                message:
                  '`/paths/users/{username}/{foo}/get` is missing path parameter(s) for `{username}` and `{foo}`.',
              },
              {
                message:
                  '`/paths/users/{username}/{foo}/post` is missing path parameter(s) for `{username}` and `{foo}`.',
              },
            ],
          });
        });
      });
    });
  });

  describe('rule: `array-without-items`', () => {
    describe('given an array parameter without a sibling `items`', () => {
      describe('Swagger 2.0', () => {
        it('should always catch an error', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/array-no-items.yaml')).not.toValidate({
            errors: [
              { message: '`/paths/users/get/parameters/tags` is an array, so it must include an `items` schema.' },
            ],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/array-no-items.yaml')).toValidate({
            rules: {
              swagger: {
                'array-without-items': 'warning',
              },
            },
            warnings: [
              { message: '`/paths/users/get/parameters/tags` is an array, so it should include an `items` schema.' },
            ],
          });
        });
      });

      describe('OpenAPI 3.x', () => {
        it('should catch an error by default', async () => {
          await expect(relativePath('specs/validate-spec/invalid/3.x/array-no-items.yaml')).not.toValidate({
            errors: [
              { message: '`/paths/users/get/parameters/tags` is an array, so it must include an `items` schema.' },
            ],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/3.x/array-no-items.yaml')).toValidate({
            rules: {
              openapi: {
                'array-without-items': 'warning',
              },
            },
            warnings: [
              { message: '`/paths/users/get/parameters/tags` is an array, so it should include an `items` schema.' },
            ],
          });
        });
      });
    });

    describe('given an array body parameter without a sibling `items`', () => {
      describe('Swagger 2.0', () => {
        it('should always catch an error', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/array-body-no-items.yaml')).not.toValidate({
            errors: [
              { message: '`/paths/users/post/parameters/people` is an array, so it must include an `items` schema.' },
            ],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/array-body-no-items.yaml')).toValidate({
            rules: {
              swagger: {
                'array-without-items': 'warning',
              },
            },
            warnings: [
              { message: '`/paths/users/post/parameters/people` is an array, so it should include an `items` schema.' },
            ],
          });
        });
      });

      describe('OpenAPI 3.x', () => {
        it.todo('should catch an error by default');

        it.todo('should catch it as a warning if configured as such');
      });
    });

    describe('given an array response header without a sibling `items`', () => {
      describe('Swagger 2.0', () => {
        it('should always catch an error', async () => {
          await expect(
            relativePath('specs/validate-spec/invalid/2.0/array-response-header-no-items.yaml'),
          ).not.toValidate({
            errors: [
              {
                message:
                  '`/paths/users/get/responses/default/headers/Last-Modified` is an array, so it must include an `items` schema.',
              },
            ],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/array-response-header-no-items.yaml')).toValidate({
            rules: {
              swagger: {
                'array-without-items': 'warning',
              },
            },
            warnings: [
              {
                message:
                  '`/paths/users/get/responses/default/headers/Last-Modified` is an array, so it should include an `items` schema.',
              },
            ],
          });
        });
      });

      describe('OpenAPI 3.x', () => {
        it('should catch an error by default', async () => {
          await expect(
            relativePath('specs/validate-spec/invalid/3.x/array-response-header-no-items.yaml'),
          ).not.toValidate({
            errors: [
              {
                message:
                  '`/paths/users/get/responses/default/headers/Last-Modified` is an array, so it must include an `items` schema.',
              },
            ],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/3.x/array-response-header-no-items.yaml')).toValidate({
            rules: {
              openapi: {
                'array-without-items': 'warning',
              },
            },
            warnings: [
              {
                message:
                  '`/paths/users/get/responses/default/headers/Last-Modified` is an array, so it should include an `items` schema.',
              },
            ],
          });
        });

        describe('given the same case within `content`', () => {
          it('should catch an error by default', async () => {
            await expect(
              relativePath('specs/validate-spec/invalid/3.x/array-response-header-content-no-items.yaml'),
            ).not.toValidate({
              errors: [
                {
                  message:
                    '`/paths/users/get/responses/default/headers/Last-Modified/content/application/json/schema` is an array, so it must include an `items` schema.',
                },
              ],
            });
          });

          it('should catch it as a warning if configured as such', async () => {
            await expect(
              relativePath('specs/validate-spec/invalid/3.x/array-response-header-content-no-items.yaml'),
            ).toValidate({
              rules: {
                openapi: {
                  'array-without-items': 'warning',
                },
              },
              warnings: [
                {
                  message:
                    '`/paths/users/get/responses/default/headers/Last-Modified/content/application/json/schema` is an array, so it should include an `items` schema.',
                },
              ],
            });
          });
        });
      });
    });

    describe('givern an array response body without a sibling `items`', () => {
      describe('Swagger 2.0', () => {
        it('should always catch an error', async () => {
          await expect(
            relativePath('specs/validate-spec/invalid/2.0/array-response-body-no-items.yaml'),
          ).not.toValidate({
            errors: [
              {
                message: '`/paths/users/get/responses/200/schema` is an array, so it must include an `items` schema.',
              },
            ],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/array-response-body-no-items.yaml')).toValidate({
            rules: {
              swagger: {
                'array-without-items': 'warning',
              },
            },
            warnings: [
              {
                message: '`/paths/users/get/responses/200/schema` is an array, so it should include an `items` schema.',
              },
            ],
          });
        });
      });

      describe('OpenAPI 3.x', () => {
        it('should catch an error by default', async () => {
          await expect(
            relativePath('specs/validate-spec/invalid/3.x/array-response-body-no-items.yaml'),
          ).not.toValidate({
            errors: [
              {
                message:
                  '`/paths/users/get/responses/200/content/application/json/schema` is an array, so it must include an `items` schema.',
              },
            ],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/3.x/array-response-body-no-items.yaml')).toValidate({
            rules: {
              openapi: {
                'array-without-items': 'warning',
              },
            },
            warnings: [
              {
                message:
                  '`/paths/users/get/responses/200/content/application/json/schema` is an array, so it should include an `items` schema.',
              },
            ],
          });
        });
      });
    });
  });

  describe("should catch if a required property in an input doesn't exist", () => {
    describe('Swagger 2.0', () => {
      it('should always catch an error', async () => {
        await expect(
          relativePath('specs/validate-spec/invalid/2.0/required-property-not-defined-input.yaml'),
        ).not.toValidate({
          errors: [
            {
              message:
                'Property `notExists` is listed as required but does not exist in `/paths/pets/post/parameters/pet`.',
            },
          ],
        });
      });

      it('should catch it as a warning if configured as such', async () => {
        await expect(
          relativePath('specs/validate-spec/invalid/2.0/required-property-not-defined-input.yaml'),
        ).toValidate({
          rules: {
            swagger: {
              'unknown-required-schema-property': 'warning',
            },
          },
          warnings: [
            {
              message:
                'Property `notExists` is listed as required but does not exist in `/paths/pets/post/parameters/pet`.',
            },
          ],
        });
      });
    });

    // @todo add a case for requestBody having a required property that doesn't exist in its schema
    // 3.x/required-property-not-defined-input.yaml
    describe('OpenAPI 3.x', () => {
      it.todo('should catch an error by default');

      it.todo('should catch it as a warning if configured as such');
    });
  });

  describe('should allow schema-declared required properties to be inherited by an `allOf`', () => {
    describe('Swagger 2.0', () => {
      it('Swagger 2.0', async () => {
        await expect(relativePath('specs/validate-spec/valid/2.0/inherited-required-properties.yaml')).toValidate();
      });
    });

    // @todo add a case for this
    it.skip('OpenAPI 3.x', async () => {
      await expect(relativePath('specs/validate-spec/valid/3.x/inherited-required-properties.yaml')).toValidate();
    });
  });

  describe('rule: `duplicate-operation-id`', () => {
    describe('given duplicate operation IDs', () => {
      describe('Swagger 2.0', () => {
        it('should always catch an error', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/duplicate-operation-ids.yaml')).not.toValidate({
            errors: [{ message: 'The operationId `users` is duplicated and must be made unique.' }],
          });
        });

        it('should always catch an error', async () => {
          await expect(relativePath('specs/validate-spec/invalid/2.0/duplicate-operation-ids.yaml')).toValidate({
            rules: {
              swagger: {
                'duplicate-operation-id': 'warning',
              },
            },
            warnings: [{ message: 'The operationId `users` is duplicated and should be made unique.' }],
          });
        });
      });

      describe('OpenAPI 3.x', () => {
        it('should catch an error by default', async () => {
          await expect(relativePath('specs/validate-spec/invalid/3.x/duplicate-operation-ids.yaml')).not.toValidate({
            errors: [{ message: 'The operationId `users` is duplicated and must be made unique.' }],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(relativePath('specs/validate-spec/invalid/3.x/duplicate-operation-ids.yaml')).toValidate({
            rules: {
              openapi: {
                'duplicate-operation-id': 'warning',
              },
            },
            warnings: [{ message: 'The operationId `users` is duplicated and should be made unique.' }],
          });
        });
      });
    });
  });

  describe('should catch invalid discriminators', () => {
    // Invalid discriminators are only **not** picked up with the 3.1 spec, so for 3.0 we can fall
    // back to our normal schema validation -- which'll give us a different error message.
    it('OpenAPI 3.0', async () => {
      await expect(
        validate(relativePath('specs/validate-spec/invalid/3.0/invalid-discriminator.yaml')),
      ).resolves.toMatchSnapshot();
    });

    /**
     * We can't yet write validation for this because our OpenAPI (and Swagger) spec validators
     * don't have the best, or fastest, handling for nested schemas. It would likely be easier and
     * faster to use something like `jsonpath` but that library unfortunately would add a lot of
     * bloat to this library and it doesn't play well with browsers.
     *
     * @todo
     */
    it.skip('OpenAPI 3.1', async () => {
      await expect(
        validate(relativePath('specs/validate-spec/invalid/3.1/invalid-discriminator.yaml')),
      ).resolves.toMatchSnapshot();
    });
  });

  describe('components / definitions', () => {
    describe('should allow a component schema name that contains hyphens', () => {
      it('Swagger 2.0', async () => {
        await expect(relativePath('specs/validate-spec/valid/2.0/definition-name-with-hyphens.yaml')).toValidate();
      });

      it('OpenAPI 3.0', async () => {
        await expect(relativePath('specs/validate-spec/valid/3.0/component-schema-with-hyphens.yaml')).toValidate();
      });

      it('OpenAPI 3.1', async () => {
        await expect(relativePath('specs/validate-spec/valid/3.1/component-schema-with-hyphens.yaml')).toValidate();
      });
    });

    describe('should allow description property in server variables', () => {
      it('OpenAPI 3.1', async () => {
        await expect(relativePath('specs/validate-spec/valid/3.1/server-variable-description.yaml')).toValidate();
      });
    });

    describe('should catch a component schema name that contains a space', () => {
      it('OpenAPI 3.0', async () => {
        await expect(relativePath('specs/validate-spec/invalid/3.0/component-schema-with-space.yaml')).not.toValidate({
          errors: [
            {
              message:
                '`/components/securitySchemes/Basic Access Authentication` has an invalid name. Component names should match against: /^[a-zA-Z0-9.-_]+$/',
            },
          ],
        });
      });

      // Components with spaces is only **not** picked up with the 3.0 spec, so for 3.1 we can
      // fallback to the normal schema validation -- which'll give us a different error message.
      it('OpenAPI 3.1', async () => {
        await expect(
          validate(relativePath('specs/validate-spec/invalid/3.1/component-schema-with-space.yaml')),
        ).resolves.toMatchSnapshot();
      });
    });

    describe('should catch a component schema name that contains invalid characters', () => {
      it('Swagger 2.0', async () => {
        await expect(
          relativePath('specs/validate-spec/invalid/2.0/definition-schema-with-invalid-characters.yaml'),
        ).not.toValidate({
          errors: [
            {
              message:
                '`/definitions/User«Information»` has an invalid name. Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
            },
          ],
        });
      });

      it('OpenAPI 3.0', async () => {
        await expect(
          relativePath('specs/validate-spec/invalid/3.0/component-schema-with-invalid-characters.yaml'),
        ).not.toValidate({
          errors: [
            {
              message:
                '`/components/schemas/User«Information»` has an invalid name. Component names should match against: /^[a-zA-Z0-9.-_]+$/',
            },
          ],
        });
      });

      // Components with invalid characters is only **not** picked up with the 3.0 spec, so for 3.1 we can fallback to the
      // normal schema validation -- which'll give us a different error message.
      it('OpenAPI 3.1', async () => {
        await expect(
          validate(relativePath('specs/validate-spec/invalid/3.1/component-schema-with-invalid-characters.yaml')),
        ).resolves.toMatchSnapshot();
      });
    });

    describe('should allow a definition comprised entirely of components', () => {
      it('OpenAPI 3.1', async () => {
        await expect(relativePath('specs/validate-spec/valid/3.1/components-only.yaml')).toValidate();
      });
    });
  });

  describe('parameter content validation', () => {
    describe('should catch a parameter with empty content', () => {
      it('OpenAPI 3.x', async () => {
        await expect(
          validate(relativePath('specs/validate-spec/invalid/3.x/parameter-content-empty.yaml')),
        ).resolves.toMatchSnapshot();
      });

      it('OpenAPI 3.1', async () => {
        await expect(
          validate(relativePath('specs/validate-spec/invalid/3.1/parameter-content-empty.yaml')),
        ).resolves.toMatchSnapshot();
      });
    });

    describe('should catch a parameter with both schema and content', () => {
      it('OpenAPI 3.x', async () => {
        await expect(
          validate(relativePath('specs/validate-spec/invalid/3.x/parameter-content-and-schema.yaml')),
        ).resolves.toMatchSnapshot();
      });

      it('OpenAPI 3.1', async () => {
        await expect(
          validate(relativePath('specs/validate-spec/invalid/3.1/parameter-content-and-schema.yaml')),
        ).resolves.toMatchSnapshot();
      });
    });

    describe('given a parameter with content having array schema without items', () => {
      describe('OpenAPI 3.x', () => {
        it('should catch an error by default', async () => {
          await expect(
            relativePath('specs/validate-spec/invalid/3.x/parameter-content-array-no-items.yaml'),
          ).not.toValidate({
            errors: [
              {
                message:
                  '`/paths/users/get/parameters/tags/content/application/json/schema` is an array, so it must include an `items` schema.',
              },
            ],
          });
        });

        it('should catch it as a warning if configured as such', async () => {
          await expect(
            relativePath('specs/validate-spec/invalid/3.x/parameter-content-array-no-items.yaml'),
          ).toValidate({
            rules: {
              openapi: {
                'array-without-items': 'warning',
              },
            },
            warnings: [
              {
                message:
                  '`/paths/users/get/parameters/tags/content/application/json/schema` is an array, so it should include an `items` schema.',
              },
            ],
          });
        });
      });
    });

    describe('given a parameter with content having single media type', () => {
      describe('OpenAPI 3.x', () => {
        it('should validate successfully', async () => {
          await expect(
            relativePath('specs/validate-spec/valid/3.x/parameter-content-single-media-type.yaml'),
          ).toValidate();
        });
      });
    });

    describe('given a parameter with content having $ref schema', () => {
      describe('OpenAPI 3.x', () => {
        it('should validate successfully (skips $ref validation)', async () => {
          await expect(relativePath('specs/validate-spec/valid/3.x/parameter-content-with-ref.yaml')).toValidate();
        });
      });
    });
  });
});
