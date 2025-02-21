import { describe, it, expect, assert } from 'vitest';

import { ValidationError } from '../../../src/errors.js';
import { validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';

describe('Invalid APIs (Swagger 2.0 and OpenAPI 3.x schema validation)', () => {
  it('should return all errors', async () => {
    try {
      await validate(relativePath('specs/validate-schema/invalid/multiple-invalid-properties.yaml'));
      assert.fail('Validation should have failed, but it succeeded!');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.message).toMatch(/^OpenAPI schema validation failed.\n(.*)+/);

      expect(err.details).toHaveLength(3);
      expect(err.totalErrors).toBe(2);

      expect(err.message).toContain("REQUIRED must have required property 'url'");
      expect(err.message).toContain('url is missing here');
      expect(err.message).toContain('ADDITIONAL PROPERTY must NOT have additional properties');
      expect(err.message).toContain('tagss is not expected to be here');
    }
  });

  it.each([
    {
      name: 'unknown JSON Schema format',
      file: 'unknown-format.yaml',
    },
    {
      name: 'Schema with "allOf"',
      file: 'allof.yaml',
    },
  ])('$name', async ({ file }) => {
    await expect(validate(relativePath(`specs/validate-schema/valid/${file}`))).resolves.toMatchObject({
      swagger: '2.0',
    });
  });

  it.each([
    {
      name: 'invalid response code',
      file: 'invalid-response-code.yaml',
    },
    {
      name: 'optional path param',
      file: 'optional-path-param.yaml',
    },
    {
      name: 'non-required path param',
      file: 'non-required-path-param.yaml',
    },
    {
      name: 'invalid schema type',
      file: 'invalid-schema-type.yaml',
    },
    {
      name: 'invalid param type',
      file: 'invalid-param-type.yaml',
    },
    {
      name: 'non-primitive param type',
      file: 'non-primitive-param-type.yaml',
    },
    {
      name: 'invalid parameter location',
      file: 'invalid-param-location.yaml',
    },
    {
      name: '"file" type used for non-formData param',
      file: 'file-header-param.yaml',
    },
    {
      name: '"file" type used for body param',
      file: 'file-body-param.yaml',
    },
    {
      name: '"multi" header param',
      file: 'multi-header-param.yaml',
    },
    {
      name: '"multi" path param',
      file: 'multi-path-param.yaml',
    },
    {
      name: 'invalid response header type',
      file: 'invalid-response-header-type.yaml',
    },
    {
      name: 'non-primitive response header type',
      file: 'non-primitive-response-header-type.yaml',
    },
    {
      name: 'invalid response schema type',
      file: 'invalid-response-type.yaml',
    },
    {
      name: '$ref to invalid Path object',
      file: 'ref-to-invalid-path.yaml',
    },
    {
      name: 'Schema with "anyOf"',
      file: 'anyof.yaml',
    },
    {
      name: 'Schema with "oneOf"',
      file: 'oneof.yaml',
    },
    {
      name: 'invalid security scheme for OpenAPI 3.0',
      file: 'invalid-security-scheme.yaml',
      isOpenAPI: true,
    },
  ])('$name', async ({ file, isOpenAPI }) => {
    try {
      await validate(relativePath(`specs/validate-schema/invalid/${file}`));
      assert.fail('Validation should have failed, but it succeeded!');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);

      if (isOpenAPI) {
        expect(err.message).toMatch(/^OpenAPI schema validation failed.\n(.*)+/);
      } else {
        expect(err.message).toMatch(/^Swagger schema validation failed.\n(.*)+/);
      }

      expect(err.details.length).toBeGreaterThan(0);
      expect(err.totalErrors).toBeGreaterThanOrEqual(1);

      // Make sure the Ajv error details object is valid
      const details = err.details[0];

      expect(details.instancePath).toMatch(/[a-zA-Z/~01]+/); // /paths/~1users/get/responses
      expect(details.schemaPath).toMatch(/^#\/[a-zA-Z\\/]+/); // #/properties/parameters/items/oneOf
      expect(details.keyword).toMatch(/\w+/); // oneOf
      expect(details.params).not.toBeNull(); // { missingProperty: 'schema' }
      expect(details.message).toBeTypeOf('string'); // must match exactly one schema in oneOf
    }
  });
});
