import { describe, it, expect, assert } from 'vitest';

import { ValidationError } from '../../../src/errors.js';
import { validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';

async function assertValid(file: string) {
  const api = await validate(relativePath(`specs/validate-spec/valid/${file}`));
  expect(api).to.be.an('object');
}

async function assertInvalid(file: string, error: string) {
  try {
    await validate(relativePath(`specs/validate-spec/invalid/${file}`));
    assert.fail('Validation should have failed, but it succeeded!');
  } catch (err) {
    expect(err).to.be.an.instanceOf(ValidationError);
    expect(err.message).to.equal(error);
  }
}

describe('Invalid APIs (specification validation)', () => {
  describe('Swagger 2.0-specific cases', () => {
    it('should catch invalid response codes', () => {
      return assertInvalid(
        '2.0/invalid-response-code.yaml',
        'Validation failed. `/paths/users/get/responses/888` has an invalid response code: 888',
      );
    });

    it('should catch multiple body parameters in path', () => {
      return assertInvalid(
        '2.0/multiple-path-body-params.yaml',
        'Validation failed. `/paths/users/{username}/get` has 2 body parameters. Only one is allowed.',
      );
    });

    it('should catch multiple body parameters in operation', () => {
      return assertInvalid(
        '2.0/multiple-operation-body-params.yaml',
        'Validation failed. `/paths/users/{username}/patch` has 2 body parameters. Only one is allowed.',
      );
    });

    it('should catch multiple body parameters in path & operation', () => {
      return assertInvalid(
        '2.0/multiple-body-params.yaml',
        'Validation failed. `/paths/users/{username}/post` has 2 body parameters. Only one is allowed.',
      );
    });

    it('should catch if there are body and formData parameters', () => {
      return assertInvalid(
        '2.0/body-and-form-params.yaml',
        'Validation failed. `/paths/users/{username}/post` has `body` and `formData` parameters. Only one or the other is allowed.',
      );
    });

    it('should catch duplicate path placeholders', () => {
      return assertInvalid(
        '2.0/duplicate-path-placeholders.yaml',
        'Validation failed. `/paths/users/{username}/profile/{username}/image/{img_id}/get` has multiple path placeholders named `{username}`.',
      );
    });

    it('should catch `file` parameters without a `consumes` declaration', () => {
      return assertInvalid(
        '2.0/file-no-consumes.yaml',
        'Validation failed. `/paths/users/{username}/profile/image/post` has a file parameter, so it must consume `multipart/form-data` or `application/x-www-form-urlencoded`.',
      );
    });

    it('should catch `file` parameters with an invalid `consumes` declaration', () => {
      return assertInvalid(
        '2.0/file-invalid-consumes.yaml',
        'Validation failed. `/paths/users/{username}/profile/image/post` has a file parameter, so it must consume `multipart/form-data` or `application/x-www-form-urlencoded`.',
      );
    });

    it("should catch if a required property in a component doesn't exist", () => {
      return assertInvalid(
        '2.0/required-property-not-defined-definitions.yaml',
        'Validation failed. Property `photoUrls` is listed as required but does not exist in `/definitions/Pet`.',
      );
    });

    it('should allow a `file` parameter with a vendor specific form-data `consumes` declaration', () => {
      return assertValid('2.0/file-vendor-specific-consumes-formdata.yaml');
    });

    it('should allow a `file` parameter with a vendor specific urlencoded `consumes` declaration', () => {
      return assertValid('2.0/file-vendor-specific-consumes-urlencoded.yaml');
    });
  });

  describe('should catch duplicate header parameters', () => {
    it('Swagger 2.0', () => {
      return assertInvalid(
        '2.0/duplicate-header-params.yaml',
        'Validation failed. Found multiple `header` parameters named `foo` in `/paths/users/{username}`.',
      );
    });

    it('OpenAPI 3.x', () => {
      return assertInvalid(
        '3.x/duplicate-header-params.yaml',
        'Validation failed. Found multiple `header` parameters named `foo` in `/paths/users/{username}`.',
      );
    });
  });

  describe('should catch duplicate operation parameters', () => {
    it('Swagger 2.0', () => {
      return assertInvalid(
        '2.0/duplicate-operation-params.yaml',
        'Validation failed. Found multiple `path` parameters named `username` in `/paths/users/{username}/get`.',
      );
    });

    it('OpenAPI 3.x', () => {
      return assertInvalid(
        '3.x/duplicate-operation-params.yaml',
        'Validation failed. Found multiple `path` parameters named `username` in `/paths/users/{username}/get`.',
      );
    });
  });

  describe('should catch path parameters with no placeholder', () => {
    it('Swagger 2.0', () => {
      return assertInvalid(
        '2.0/path-param-no-placeholder.yaml',
        'Validation failed. `/paths/users/{username}/post` has a path parameter named `foo`, but there is no corresponding `{foo}` in the path string.',
      );
    });

    it('OpenAPI 3.x', () => {
      return assertInvalid(
        '3.x/path-param-no-placeholder.yaml',
        'Validation failed. `/paths/users/{username}/post` has a path parameter named `foo`, but there is no corresponding `{foo}` in the path string.',
      );
    });
  });

  describe('should catch path placeholders with no corresponding parameter', () => {
    it('Swagger 2.0', () => {
      return assertInvalid(
        '2.0/path-placeholder-no-param.yaml',
        'Validation failed. `/paths/users/{username}/{foo}/get` is missing path parameter(s) for `{foo}`.',
      );
    });

    it('OpenAPI 3.x', () => {
      return assertInvalid(
        '3.x/path-placeholder-no-param.yaml',
        'Validation failed. `/paths/users/{username}/{foo}/get` is missing path parameter(s) for `{foo}`.',
      );
    });
  });

  describe('should catch if no path parameters are present, but placeholders are', () => {
    it('Swagger 2.0', () => {
      return assertInvalid(
        '2.0/no-path-params.yaml',
        'Validation failed. `/paths/users/{username}/{foo}/get` is missing path parameter(s) for `{username}` and `{foo}`.',
      );
    });

    it('OpenAPI 3.x', () => {
      return assertInvalid(
        '3.x/no-path-params.yaml',
        'Validation failed. `/paths/users/{username}/{foo}/get` is missing path parameter(s) for `{username}` and `{foo}`.',
      );
    });
  });

  describe('should catch array parameters without a sibling `items`', () => {
    it('Swagger 2.0', () => {
      return assertInvalid(
        '2.0/array-no-items.yaml',
        'Validation failed. `/paths/users/get/parameters/tags` is an array, so it must include an `items` schema.',
      );
    });

    it('OpenAPI 3.x', () => {
      return assertInvalid(
        '3.x/array-no-items.yaml',
        'Validation failed. `/paths/users/get/parameters/tags` is an array, so it must include an `items` schema.',
      );
    });
  });

  describe('should catch array body parameters without a sibling `items`', () => {
    it('Swagger 2.0', () => {
      return assertInvalid(
        '2.0/array-body-no-items.yaml',
        'Validation failed. `/paths/users/post/parameters/people` is an array, so it must include an `items` schema.',
      );
    });

    // @todo add a case for this
    // eslint-disable-next-line vitest/no-disabled-tests
    it.skip('OpenAPI 3.x', () => {
      return assertInvalid(
        '3.x/array-body-no-items.yaml',
        'Validation failed. `/paths/users/post/parameters/people` is an array, so it must include an `items` schema.',
      );
    });
  });

  describe('should catch array response headers without a sibling `items', () => {
    it('Swagger 2.0', () => {
      return assertInvalid(
        '2.0/array-response-header-no-items.yaml',
        'Validation failed. `/paths/users/get/responses/default/headers/Last-Modified` is an array, so it must include an `items` schema.',
      );
    });

    it('OpenAPI 3.x', () => {
      return assertInvalid(
        '3.x/array-response-header-no-items.yaml',
        'Validation failed. `/paths/users/get/responses/default/headers/Last-Modified` is an array, so it must include an `items` schema.',
      );
    });

    describe('should also catch the same within `content`', () => {
      it('OpenAPI 3.x', () => {
        return assertInvalid(
          '3.x/array-response-header-content-no-items.yaml',
          'Validation failed. `/paths/users/get/responses/default/headers/Last-Modified/content/application/json/schema` is an array, so it must include an `items` schema.',
        );
      });
    });
  });

  describe("should catch if a required property in an input doesn't exist", () => {
    it('Swagger 2.0', () => {
      return assertInvalid(
        '2.0/required-property-not-defined-input.yaml',
        'Validation failed. Property `notExists` is listed as required but does not exist in `/paths/pets/post/parameters/pet`.',
      );
    });

    // @todo add a case for requestBody having a required property that doesn't exist in its schema
    // eslint-disable-next-line vitest/no-disabled-tests
    it.skip('OpenAPI 3.x', () => {
      return assertInvalid(
        '3.x/required-property-not-defined-input.yaml',
        'Validation failed. Property `notExists listed as required but does not exist in `/paths/pets/post/parameters/pet`.',
      );
    });
  });

  describe('should allow schema-declared required properties to be inherited by an `allOf`', () => {
    it('Swagger 2.0', () => {
      return assertValid('2.0/inherited-required-properties.yaml');
    });

    // @todo add a case for this
    // eslint-disable-next-line vitest/no-disabled-tests
    it.skip('OpenAPI 3.x', () => {
      return assertValid('3.x/inherited-required-properties.yaml');
    });
  });

  describe('should catch duplicate operation IDs', () => {
    it('Swagger 2.0', () => {
      return assertInvalid(
        '2.0/duplicate-operation-ids.yaml',
        'Validation failed. The operationId `users` is duplicated and must be made unique.',
      );
    });

    it('OpenAPI 3.x', () => {
      return assertInvalid(
        '3.x/duplicate-operation-ids.yaml',
        'Validation failed. The operationId `users` is duplicated and must be made unique.',
      );
    });
  });

  describe('should catch array response bodies without a sibling `items`', () => {
    it('Swagger 2.0', () => {
      return assertInvalid(
        '2.0/array-response-body-no-items.yaml',
        'Validation failed. `/paths/users/get/responses/200/schema` is an array, so it must include an `items` schema.',
      );
    });

    it('OpenAPI 3.x', () => {
      return assertInvalid(
        '3.x/array-response-body-no-items.yaml',
        'Validation failed. `/paths/users/get/responses/200/content/application/json/schema` is an array, so it must include an `items` schema.',
      );
    });
  });

  describe('should catch invalid discriminators', () => {
    // Invalid discriminators are only **not** picked up with the 3.1 spec, so for 3.0 we can fall
    // back to our normal schema validation -- which'll give us a different error message.
    it('OpenAPI 3.0', async () => {
      await expect(
        validate(relativePath('specs/validate-spec/invalid/3.0/invalid-discriminator.yaml')),
      ).rejects.to.matchSnapshot();
    });

    /**
     * We can't yet write validation for this because our OpenAPI (and Swagger) spec validators
     * don't have the best, or fastest, handling for nested schemas. It would likely be easier and
     * faster to use something like `jsonpath` but that library unfortunately would add a lot of
     * bloat to this library and it doesn't play well with browsers.
     *
     * @todo
     */
    // eslint-disable-next-line vitest/no-disabled-tests
    it.skip('OpenAPI 3.1', async () => {
      await expect(
        validate(relativePath('specs/validate-spec/invalid/3.1/invalid-discriminator.yaml')),
      ).rejects.to.matchSnapshot();
    });
  });

  describe('components / definitions', () => {
    describe('should allow a component schema name that contains hyphens', () => {
      it('Swagger 2.0', () => assertValid('2.0/definition-name-with-hyphens.yaml'));

      it('OpenAPI 3.0', () => assertValid('3.0/component-schema-with-hyphens.yaml'));

      it('OpenAPI 3.1', () => assertValid('3.1/component-schema-with-hyphens.yaml'));
    });

    describe('should allow description property in server variables', () => {
      it('OpenAPI 3.1', () => assertValid('3.1/server-variable-description.yaml'));
    });

    describe('should catch a component schema name that contains a space', () => {
      it('OpenAPI 3.0', () => {
        return assertInvalid(
          '3.0/component-schema-with-space.yaml',
          'Validation failed. `/components/securitySchemes/Basic Access Authentication` has an invalid name. Component names should match against: /^[a-zA-Z0-9.-_]+$/',
        );
      });

      // Components with spaces is only **not** picked up with the 3.0 spec, so for 3.1 we can
      // fallback to the normal schema validation -- which'll give us a different error message.
      it('OpenAPI 3.1', async () => {
        await expect(
          validate(relativePath('specs/validate-spec/invalid/3.1/component-schema-with-space.yaml')),
        ).rejects.to.matchSnapshot();
      });
    });

    describe('should catch a component schema name that contains invalid characters', () => {
      it('Swagger 2.0', () => {
        return assertInvalid(
          '2.0/definition-schema-with-invalid-characters.yaml',
          'Validation failed. `/definitions/User«Information»` has an invalid name. Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
        );
      });

      it('OpenAPI 3.0', () => {
        return assertInvalid(
          '3.0/component-schema-with-invalid-characters.yaml',
          'Validation failed. `/components/schemas/User«Information»` has an invalid name. Component names should match against: /^[a-zA-Z0-9.-_]+$/',
        );
      });

      // Components with invalid characters is only **not** picked up with the 3.0 spec, so for 3.1 we can fallback to the
      // normal schema validation -- which'll give us a different error message.
      it('OpenAPI 3.1', async () => {
        await expect(
          validate(relativePath('specs/validate-spec/invalid/3.1/component-schema-with-invalid-characters.yaml')),
        ).rejects.to.matchSnapshot();
      });
    });
  });
});
