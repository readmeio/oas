import { describe, it, expect, assert } from 'vitest';

import { validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';
import { toValidate } from '../../vitest.matchers.js';

expect.extend({ toValidate });

describe('Invalid APIs (Swagger 2.0 and OpenAPI 3.x schema validation)', () => {
  it('should return all errors', async () => {
    const result = await validate(relativePath('specs/validate-schema/invalid/multiple-invalid-properties.yaml'));
    if (result.valid === true) {
      assert.fail('Validation should have failed, but it succeeded!');
    }

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.warnings).toHaveLength(0);
    expect(result.additionalErrors).toBe(0);
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
      valid: true,
      warnings: [],
      specification: 'Swagger',
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
    },
  ])('$name', async ({ file }) => {
    await expect(validate(relativePath(`specs/validate-schema/invalid/${file}`))).resolves.toMatchSnapshot();
  });
});
