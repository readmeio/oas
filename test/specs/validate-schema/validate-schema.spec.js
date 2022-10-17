const { expect } = require('chai');

const OpenAPIParser = require('../../..');
const path = require('../../utils/path');

describe('Invalid APIs (Swagger 2.0 and OpenAPI 3.x schema validation)', () => {
  const tests = [
    {
      name: 'invalid response code',
      valid: false,
      file: 'invalid-response-code.yaml',
    },
    {
      name: 'optional path param',
      valid: false,
      file: 'optional-path-param.yaml',
    },
    {
      name: 'non-required path param',
      valid: false,
      file: 'non-required-path-param.yaml',
    },
    {
      name: 'invalid schema type',
      valid: false,
      file: 'invalid-schema-type.yaml',
    },
    {
      name: 'invalid param type',
      valid: false,
      file: 'invalid-param-type.yaml',
    },
    {
      name: 'non-primitive param type',
      valid: false,
      file: 'non-primitive-param-type.yaml',
    },
    {
      name: 'invalid parameter location',
      valid: false,
      file: 'invalid-param-location.yaml',
    },
    {
      name: '"file" type used for non-formData param',
      valid: false,
      file: 'file-header-param.yaml',
    },
    {
      name: '"file" type used for body param',
      valid: false,
      file: 'file-body-param.yaml',
      error:
        'Validation failed. /paths/users/{username}/profile/image/post/parameters/image has an invalid type (file)',
    },
    {
      name: '"multi" header param',
      valid: false,
      file: 'multi-header-param.yaml',
    },
    {
      name: '"multi" path param',
      valid: false,
      file: 'multi-path-param.yaml',
    },
    {
      name: 'invalid response header type',
      valid: false,
      file: 'invalid-response-header-type.yaml',
    },
    {
      name: 'non-primitive response header type',
      valid: false,
      file: 'non-primitive-response-header-type.yaml',
    },
    {
      name: 'invalid response schema type',
      valid: false,
      file: 'invalid-response-type.yaml',
    },
    {
      name: 'unknown JSON Schema format',
      valid: true,
      file: 'unknown-format.yaml',
    },
    {
      name: '$ref to invalid Path object',
      valid: false,
      file: 'ref-to-invalid-path.yaml',
    },
    {
      name: 'Schema with "allOf"',
      valid: true,
      file: 'allof.yaml',
    },
    {
      name: 'Schema with "anyOf"',
      valid: false,
      file: 'anyof.yaml',
    },
    {
      name: 'Schema with "oneOf"',
      valid: false,
      file: 'oneof.yaml',
    },
    {
      name: 'invalid security scheme for OpenAPI 3.0',
      valid: false,
      file: 'invalid-security-scheme.yaml',
      openapi: true,
    },
  ];

  it('should pass validation if "options.validate.schema" is false', async () => {
    const invalid = tests[0];
    expect(invalid.valid).to.equal(false);

    const api = await OpenAPIParser.validate(path.rel(`specs/validate-schema/invalid/${invalid.file}`), {
      validate: { schema: false },
    });
    expect(api).to.be.an('object');
  });

  it('should return all errors', async () => {
    try {
      await OpenAPIParser.validate(path.rel('specs/validate-schema/invalid/multiple-invalid-properties.yaml'));
      throw new Error('Validation should have failed, but it succeeded!');
    } catch (err) {
      expect(err).to.be.an.instanceOf(SyntaxError);
      expect(err.message).to.match(/^OpenAPI schema validation failed.\n(.*)+/);

      expect(err.details).to.be.an('array').to.have.length(3);

      expect(err.message).to.contain("REQUIRED must have required property 'url'");
      expect(err.message).to.contain('url is missing here');
      expect(err.message).to.contain('ADDITIONAL PROPERTY must NOT have additional properties');
      expect(err.message).to.contain('tagss is not expected to be here');
    }
  });

  for (const test of tests) {
    if (test.valid) {
      it(test.name, async () => {
        try {
          const api = await OpenAPIParser.validate(path.rel(`specs/validate-schema/valid/${test.file}`));
          expect(api).to.be.an('object');
        } catch (err) {
          throw new Error(`Validation should have succeeded, but it failed!\n${err.stack}`);
        }
      });
    } else {
      it(test.name, async () => {
        try {
          await OpenAPIParser.validate(path.rel(`specs/validate-schema/invalid/${test.file}`));
          throw new Error('Validation should have failed, but it succeeded!');
        } catch (err) {
          expect(err).to.be.an.instanceOf(SyntaxError);
          if (test.openapi) {
            expect(err.message).to.match(/^OpenAPI schema validation failed.\n(.*)+/);
          } else {
            expect(err.message).to.match(/^Swagger schema validation failed.\n(.*)+/);
          }

          expect(err.details).to.be.an('array').with.length.above(0);

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
    }
  }
});
