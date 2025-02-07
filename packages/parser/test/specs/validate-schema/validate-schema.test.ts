import { describe, it, expect, assert } from 'vitest';

import OpenAPIParser from '../../..';
import path from '../../utils/path';

describe('Invalid APIs (Swagger 2.0 and OpenAPI 3.x schema validation)', () => {
  it('should pass validation if "options.validate.schema" is false', async () => {
    const api = await OpenAPIParser.validate(path.rel('specs/validate-schema/invalid/invalid-response-code.yaml'), {
      validate: { schema: false },
    });
    expect(api).to.be.an('object');
  });

  it('should return all errors', async () => {
    try {
      await OpenAPIParser.validate(path.rel('specs/validate-schema/invalid/multiple-invalid-properties.yaml'));
      assert.fail('Validation should have failed, but it succeeded!');
    } catch (err) {
      expect(err).to.be.an.instanceOf(SyntaxError);
      expect(err.message).to.match(/^OpenAPI schema validation failed.\n(.*)+/);

      expect(err.details).to.be.an('array').to.have.length(3);
      expect(err.totalErrors).to.equal(2);

      expect(err.message).to.contain("REQUIRED must have required property 'url'");
      expect(err.message).to.contain('url is missing here');
      expect(err.message).to.contain('ADDITIONAL PROPERTY must NOT have additional properties');
      expect(err.message).to.contain('tagss is not expected to be here');
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
    const api = await OpenAPIParser.validate(path.rel(`specs/validate-schema/valid/${file}`));
    expect(api).to.be.an('object');
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
      await OpenAPIParser.validate(path.rel(`specs/validate-schema/invalid/${file}`));
      assert.fail('Validation should have failed, but it succeeded!');
    } catch (err) {
      expect(err).to.be.an.instanceOf(SyntaxError);
      if (isOpenAPI) {
        expect(err.message).to.match(/^OpenAPI schema validation failed.\n(.*)+/);
      } else {
        expect(err.message).to.match(/^Swagger schema validation failed.\n(.*)+/);
      }

      expect(err.details).to.be.an('array').with.length.above(0);
      expect(err.totalErrors).to.be.at.least(1);

      // Make sure the Ajv error details object is valid
      const details = err.details[0];
      expect(details.instancePath)
        .to.be.a('string')
        .and.match(/[a-zA-Z/~01]+/); // /paths/~1users/get/responses
      expect(details.schemaPath)
        .to.be.a('string')
        .and.match(/^#\/[a-zA-Z\\/]+/); // #/properties/parameters/items/oneOf
      expect(details.keyword).to.be.a('string').and.match(/\w+/); // oneOf
      expect(details.params).to.be.a('object'); // { passingSchemas: null }
      expect(details.message).to.be.a('string').with.length.of.at.least(1); // must match exactly one schema in oneOf
    }
  });

  // for (const test of tests) {
  //   if (test.valid) {
  //     it(test.name, async () => {

  //     });
  //   } else {
  // it(test.name, async () => {

  // });
  //   }
  // }
});
