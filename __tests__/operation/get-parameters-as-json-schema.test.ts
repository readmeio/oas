import type { OperationObject, RequestBodyObject, SchemaObject } from '../../src/rmoas.types';

import Oas from '../../src';
import createOas from '../__fixtures__/create-oas';

let ably: Oas;
let circular: Oas;
let discriminators: Oas;
let parametersCommon: Oas;
let petstore: Oas;
let petstore_31: Oas;
let petstoreServerVars: Oas;
let deprecated: Oas;
let polymorphismQuirks: Oas;

beforeAll(async () => {
  ably = await import('../__datasets__/ably.json').then(r => r.default).then(Oas.init);
  await ably.dereference();

  circular = await import('../__datasets__/circular.json').then(r => r.default).then(Oas.init);
  await circular.dereference();

  discriminators = await import('../__datasets__/discriminators.json').then(r => r.default).then(Oas.init);
  await discriminators.dereference();

  parametersCommon = await import('@readme/oas-examples/3.0/json/parameters-common.json')
    .then(r => r.default)
    .then(Oas.init);
  await parametersCommon.dereference();

  petstore = await import('@readme/oas-examples/3.0/json/petstore.json').then(r => r.default).then(Oas.init);
  await petstore.dereference();

  petstore_31 = await import('@readme/oas-examples/3.1/json/petstore.json').then(r => r.default).then(Oas.init);
  await petstore_31.dereference();

  petstoreServerVars = await import('../__datasets__/petstore-server-vars.json').then(r => r.default).then(Oas.init);
  await petstoreServerVars.dereference();

  deprecated = await import('../__datasets__/schema-deprecated.json').then(r => r.default).then(Oas.init);
  await deprecated.dereference();

  polymorphismQuirks = await import('../__datasets__/polymorphism-quirks.json').then(r => r.default).then(Oas.init);
  await polymorphismQuirks.dereference();
});

test('it should return with null if there are no parameters', () => {
  expect(createOas({ parameters: [] }).operation('/', 'get').getParametersAsJSONSchema()).toBeNull();
  expect(createOas({}).operation('/', 'get').getParametersAsJSONSchema()).toBeNull();
});

describe('type sorting', () => {
  const operation: OperationObject = {
    parameters: [
      { in: 'path', name: 'path parameter', schema: { type: 'string' } },
      { in: 'query', name: 'query parameter', schema: { type: 'string' } },
      { in: 'header', name: 'header parameter', schema: { type: 'string' } },
      { in: 'cookie', name: 'cookie parameter', schema: { type: 'string' } },
    ],
    requestBody: {
      description: 'Body description',
      content: {},
    },
  };

  it('should return with a json schema for each parameter type (formData instead of body)', () => {
    (operation.requestBody as RequestBodyObject).content = {
      'application/x-www-form-urlencoded': {
        schema: {
          type: 'object',
          properties: { a: { type: 'string' } },
        },
      },
    };

    const oas = createOas(operation);
    const jsonschema = oas.operation('/', 'get').getParametersAsJSONSchema();

    expect(jsonschema).toMatchSnapshot();
    expect(
      jsonschema.map(js => {
        return js.type;
      })
    ).toStrictEqual(['path', 'query', 'cookie', 'formData', 'header']);
  });

  it('should return with a json schema for each parameter type (body instead of formData)', () => {
    (operation.requestBody as RequestBodyObject).content = {
      'application/json': {
        schema: {
          type: 'object',
          properties: { a: { type: 'string' } },
        },
      },
    };

    const oas = createOas(operation);
    const jsonschema = oas.operation('/', 'get').getParametersAsJSONSchema();

    expect(jsonschema).toMatchSnapshot();
    expect(
      jsonschema.map(js => {
        return js.type;
      })
    ).toStrictEqual(['path', 'query', 'body', 'cookie', 'header']);
  });
});

describe('$schema version', () => {
  it('should add the v4 schema version to OpenAPI 3.0.x schemas', () => {
    expect(petstore.operation('/pet', 'post').getParametersAsJSONSchema()[0].schema.$schema).toBe(
      'http://json-schema.org/draft-04/schema#'
    );
  });

  it('should add v2020-12 schema version on OpenAPI 3.1 schemas', () => {
    expect(petstore_31.operation('/pet', 'post').getParametersAsJSONSchema()[0].schema.$schema).toBe(
      'https://json-schema.org/draft/2020-12/schema#'
    );
  });
});

describe('parameters', () => {
  it('should convert parameters to JSON schema', () => {
    const operation = petstore.operation('/pet/{petId}', 'delete');
    expect(operation.getParametersAsJSONSchema()).toMatchSnapshot();
  });

  describe('polymorphism', () => {
    it('should merge allOf schemas together', () => {
      const operation = polymorphismQuirks.operation('/allof-with-empty-object-property', 'post');
      expect(operation.getParametersAsJSONSchema()).toMatchSnapshot();
    });
  });

  describe('`content` support', () => {
    it('should support `content` on parameters', () => {
      const oas = createOas({
        parameters: [
          {
            name: 'userId',
            description: 'Filter the data by userId',
            in: 'query',
            content: { 'application/json': { schema: { type: 'string' } } },
          },
        ],
      });

      const schema = oas.operation('/', 'get').getParametersAsJSONSchema();
      expect(schema[0].schema.properties.userId).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'string',
        description: 'Filter the data by userId',
      });
    });

    it('should prioritize `application/json` if present', () => {
      const oas = createOas({
        parameters: [
          {
            name: 'userId',
            in: 'query',
            content: {
              'application/json': { schema: { type: 'integer' } },
              'application/xml': { schema: { type: 'string' } },
            },
          },
        ],
      });

      const schema = oas.operation('/', 'get').getParametersAsJSONSchema();
      expect(schema[0].schema.properties.userId).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'integer',
      });
    });

    it("should prioritize JSON-like content types if they're present", () => {
      const oas = createOas({
        parameters: [
          {
            name: 'userId',
            in: 'query',
            content: {
              // Though is the first entry here is XML, we should actually use the second instead
              // because it's JSON-like.
              'application/xml': { schema: { type: 'string' } },
              'application/vnd.github.v3.star+json': {
                schema: { type: 'integer' },
              },
            },
          },
        ],
      });

      const schema = oas.operation('/', 'get').getParametersAsJSONSchema();
      expect(schema[0].schema.properties.userId).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'integer',
      });
    });

    it('should use the first content type if `application/json` is not present', () => {
      const oas = createOas({
        parameters: [
          {
            name: 'userId',
            in: 'query',
            content: {
              'application/xml': { schema: { type: 'integer' } },
              'text/plain': { schema: { type: 'string' } },
            },
          },
        ],
      });

      const schema = oas.operation('/', 'get').getParametersAsJSONSchema();
      expect(schema[0].schema.properties.userId).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'integer',
      });
    });
  });

  describe('common parameters', () => {
    it('should override path-level parameters on the operation level', () => {
      expect(
        (
          parametersCommon.operation('/anything/{id}/override', 'get').getParametersAsJSONSchema()[0].schema.properties
            .id as SchemaObject
        ).description
      ).toBe('A comma-separated list of IDs');
    });

    it('should add common parameter to path params', () => {
      const operation = parametersCommon.operation('/anything/{id}', 'get');
      expect((operation.getParametersAsJSONSchema()[0].schema.properties.id as SchemaObject).description).toBe(
        'ID parameter'
      );
    });
  });
});

describe('request bodies', () => {
  describe('should convert request bodies to JSON schema', () => {
    it('application/json', () => {
      const operation = petstore.operation('/pet', 'post');
      expect(operation.getParametersAsJSONSchema()).toMatchSnapshot();
    });

    it('application/x-www-form-urlencoded', () => {
      const operation = petstoreServerVars.operation('/pet/{petId}', 'post');
      expect(operation.getParametersAsJSONSchema()).toMatchSnapshot();
    });
  });

  it('should not return anything for an empty schema', () => {
    const oas = createOas({
      requestBody: {
        description: 'Body description',
        content: {
          'application/json': {
            schema: {},
          },
        },
      },
    });

    expect(oas.operation('/', 'get').getParametersAsJSONSchema()).toStrictEqual([]);
  });

  it('should not return anything for a requestBody that has no schema', () => {
    const oas = createOas({
      requestBody: {
        description: 'Body description',
        content: {
          'text/plain': {
            example: '',
          },
        },
      },
    });

    expect(oas.operation('/', 'get').getParametersAsJSONSchema()).toStrictEqual([]);
  });
});

describe('$ref quirks', () => {
  it("should retain $ref pointers in the schema even if they're circular", () => {
    expect(circular.operation('/', 'put').getParametersAsJSONSchema()).toMatchSnapshot();
  });
});

describe('polymorphism / discriminators', () => {
  it('should retain discriminator `mapping` refs when present', () => {
    const operation = discriminators.operation('/anything/discriminator-with-mapping', 'patch');
    expect(operation.getParametersAsJSONSchema()).toMatchSnapshot();
  });

  it('should support a discriminator at the root of a requestBody', () => {
    const operation = ably.operation('/accounts/{account_id}/apps', 'post');
    const jsonSchema = operation.getParametersAsJSONSchema();

    expect(jsonSchema).toStrictEqual([
      {
        type: 'path',
        label: 'Path Params',
        schema: {
          type: 'object',
          properties: expect.any(Object),
          required: ['account_id'],
          components: expect.any(Object),
        },
      },
      {
        type: 'body',
        label: 'Body Params',
        schema: {
          additionalProperties: false,
          properties: expect.any(Object),
          required: ['name'],
          type: 'object',
          'x-readme-ref-name': 'app_post',
          $schema: 'http://json-schema.org/draft-04/schema#',
          components: expect.any(Object),
        },
      },
    ]);
  });
});

describe('type', () => {
  describe('request bodies', () => {
    describe('repair invalid schema that has no `type`', () => {
      it('should add a missing `type: object` on a schema that is clearly an object', () => {
        const oas = createOas(
          {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    properties: {
                      uri: {
                        type: 'string',
                        format: 'uri',
                      },
                      messages: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/messages',
                        },
                      },
                      user: {
                        $ref: '#/components/schemas/user',
                      },
                    },
                  },
                },
              },
            },
          },
          {
            schemas: {
              messages: {
                properties: {
                  message: {
                    type: 'string',
                  },
                },
              },
              user: {
                required: ['user_id'],
                properties: {
                  user_id: {
                    type: 'integer',
                  },
                },
              },
            },
          }
        );

        // So we can test that components are transformed, this test intentionally does **not**
        // dereference the API definition.
        const schema = oas.operation('/', 'get').getParametersAsJSONSchema();

        expect(schema[0].schema.components.schemas.messages.type).toBe('object');
        expect(schema[0].schema.components.schemas.user.type).toBe('object');
      });
    });
  });
});

describe('descriptions', () => {
  it.todo('should pass through description on requestBody');

  it('should pass through description on parameters', () => {
    const oas = createOas({
      parameters: [
        {
          in: 'header',
          name: 'Accept',
          description: 'Expected response format.',
          schema: {
            type: 'string',
          },
        },
      ],
    });

    expect(oas.operation('/', 'get').getParametersAsJSONSchema()).toStrictEqual([
      {
        label: 'Headers',
        type: 'header',
        schema: {
          type: 'object',
          properties: {
            Accept: {
              $schema: 'http://json-schema.org/draft-04/schema#',
              description: 'Expected response format.',
              type: 'string',
            },
          },
          required: [],
        },
      },
    ]);
  });

  it('should pass through description on parameter when referenced as a `$ref` and a `requestBody` is present', async () => {
    const oas = createOas(
      {
        parameters: [
          {
            $ref: '#/components/parameters/pathId',
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
              },
            },
          },
        },
      },
      {
        parameters: {
          pathId: {
            name: 'pathId',
            in: 'path',
            description: 'Description for the pathId',
            required: true,
            schema: {
              type: 'integer',
              format: 'uint32',
            },
          },
        },
      }
    );

    await oas.dereference();

    expect(oas.operation('/', 'get').getParametersAsJSONSchema()[0].schema).toStrictEqual({
      type: 'object',
      properties: {
        pathId: {
          $schema: 'http://json-schema.org/draft-04/schema#',
          type: 'integer',
          format: 'uint32',
          maximum: 4294967295,
          minimum: 0,
          description: 'Description for the pathId',
        },
      },
      required: ['pathId'],
    });
  });
});

describe('required', () => {
  it.todo('should pass through `required` on parameters');

  it.todo('should make things required correctly for request bodies');
});

describe('`example` / `examples` support', () => {
  describe('parameters', () => {
    it.each([['example'], ['examples']])('should pick up `%s` if declared outside of the schema', exampleProp => {
      function createExample(value, inSchema = false) {
        if (exampleProp === 'example') {
          return value;
        }

        if (inSchema) {
          return [value];
        }

        return {
          distinctName: {
            value,
          },
        };
      }

      const oas = createOas({
        parameters: [
          {
            in: 'query',
            name: 'query parameter',
            schema: {
              type: 'string',
            },
            [exampleProp]: createExample('example foo'),
          },
          {
            in: 'query',
            name: 'query parameter alt',
            schema: {
              type: 'string',
              [exampleProp]: createExample('example bar', true),
            },
          },
        ],
      });

      const schema = oas.operation('/', 'get').getParametersAsJSONSchema();
      expect(schema).toStrictEqual([
        {
          type: 'query',
          label: 'Query Params',
          schema: {
            type: 'object',
            properties: {
              'query parameter': {
                $schema: 'http://json-schema.org/draft-04/schema#',
                type: 'string',
                examples: ['example foo'],
              },
              'query parameter alt': {
                $schema: 'http://json-schema.org/draft-04/schema#',
                type: 'string',
                examples: ['example bar'],
              },
            },
            required: [],
          },
        },
      ]);
    });
  });
});

describe('deprecated', () => {
  describe('parameters', () => {
    it('should pass through deprecated on parameters', () => {
      const oas = createOas({
        parameters: [
          {
            in: 'header',
            name: 'Accept',
            deprecated: true,
            schema: {
              type: 'string',
            },
          },
        ],
      });

      expect(oas.operation('/', 'get').getParametersAsJSONSchema()).toStrictEqual([
        {
          label: 'Headers',
          type: 'header',
          schema: {
            type: 'object',
            properties: {},
            required: [],
          },
          deprecatedProps: {
            type: 'header',
            schema: {
              type: 'object',
              $schema: 'http://json-schema.org/draft-04/schema#',
              properties: {
                Accept: {
                  $schema: 'http://json-schema.org/draft-04/schema#',
                  type: 'string',
                  deprecated: true,
                },
              },
              required: [],
            },
          },
        },
      ]);
    });

    it('should pass through deprecated on parameter when referenced as a `$ref` and a `requestBody` is present', async () => {
      const oas = createOas(
        {
          parameters: [
            {
              $ref: '#/components/parameters/pathId',
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                },
              },
            },
          },
        },
        {
          parameters: {
            pathId: {
              name: 'pathId',
              in: 'path',
              deprecated: true,
              schema: {
                type: 'integer',
                format: 'uint32',
              },
            },
          },
        }
      );

      await oas.dereference();
      expect(oas.operation('/', 'get').getParametersAsJSONSchema()[0].deprecatedProps.schema).toStrictEqual({
        type: 'object',
        $schema: 'http://json-schema.org/draft-04/schema#',
        properties: {
          pathId: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'integer',
            format: 'uint32',
            maximum: 4294967295,
            minimum: 0,
            deprecated: true,
          },
        },
        required: [],
      });
    });

    it('should create deprecatedProps from body and metadata parameters', () => {
      const operation = deprecated.operation('/anything', 'post');
      expect(operation.getParametersAsJSONSchema()).toMatchSnapshot();
    });

    it('should not put required deprecated parameters in deprecatedProps', () => {
      const operation = deprecated.operation('/anything', 'post');
      const deprecatedSchema = operation.getParametersAsJSONSchema()[1].deprecatedProps.schema;

      (deprecatedSchema.required as string[]).forEach(requiredParam => {
        expect(deprecatedSchema.properties[requiredParam]).toBeUndefined();
      });
      expect(Object.keys(deprecatedSchema.properties)).toHaveLength(4);
    });

    it('should not put readOnly deprecated parameters in deprecatedProps', () => {
      const operation = deprecated.operation('/anything', 'post');
      const deprecatedSchema = operation.getParametersAsJSONSchema()[1].deprecatedProps.schema;

      expect(Object.keys(deprecatedSchema.properties)).toHaveLength(4);
      expect('idReadOnly' in Object.keys(deprecatedSchema.properties)).toBe(false);
    });
  });

  describe('request bodies', () => {
    it('should pass through deprecated on a request body schema property', () => {
      const oas = createOas({
        requestBody: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  uri: {
                    type: 'string',
                    format: 'uri',
                  },
                  messages: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    deprecated: true,
                  },
                },
              },
            },
          },
        },
      });

      expect(oas.operation('/', 'get').getParametersAsJSONSchema()).toStrictEqual([
        {
          type: 'body',
          label: 'Body Params',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            properties: {
              uri: { type: 'string', format: 'uri' },
            },
            type: 'object',
          },
          deprecatedProps: {
            type: 'body',
            schema: {
              $schema: 'http://json-schema.org/draft-04/schema#',
              properties: {
                messages: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  deprecated: true,
                },
              },
              type: 'object',
            },
          },
        },
      ]);
    });
  });

  describe('polymorphism', () => {
    it('should pass through deprecated on a (merged) allOf schema', () => {
      const oas = createOas({
        requestBody: {
          content: {
            'application/json': {
              schema: {
                allOf: [
                  {
                    type: 'object',
                    properties: {
                      uri: {
                        type: 'string',
                        format: 'uri',
                      },
                    },
                  },
                  {
                    type: 'object',
                    properties: {
                      messages: {
                        type: 'array',
                        items: {
                          type: 'string',
                        },
                        deprecated: true,
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      });

      expect(oas.operation('/', 'get').getParametersAsJSONSchema()).toMatchSnapshot();
    });
  });
});

describe('options', () => {
  describe('globalDefaults', () => {
    it('should use user defined `globalDefaults` for requestBody', () => {
      const operation = petstore.operation('/pet', 'post');
      const jwtDefaults = {
        category: {
          id: 4,
          name: 'Testing',
        },
      };

      const jsonSchema = operation.getParametersAsJSONSchema({ globalDefaults: jwtDefaults });
      expect((jsonSchema[0].schema.properties.category as SchemaObject).default).toStrictEqual(jwtDefaults.category);
    });

    it('should use user defined `globalDefaults` for parameters', () => {
      const operation = petstore.operation('/pet/{petId}', 'get');
      const jwtDefaults = {
        petId: 1,
      };

      const jsonSchema = operation.getParametersAsJSONSchema({ globalDefaults: jwtDefaults });
      expect((jsonSchema[0].schema.properties.petId as SchemaObject).default).toStrictEqual(jwtDefaults.petId);
    });
  });

  describe('mergeIntoBodyAndMetadata', () => {
    it('should merge params categorized as metadata into a single block', () => {
      const operation = petstore.operation('/pet/{petId}', 'delete');
      const jsonSchema = operation.getParametersAsJSONSchema({
        mergeIntoBodyAndMetadata: true,
        retainDeprecatedProperties: true,
      });

      expect(jsonSchema).toMatchSnapshot();
    });

    it('should not create an empty `allOf` for metadata if there is no metadata', () => {
      const operation = petstore.operation('/user', 'post');
      const jsonSchema = operation.getParametersAsJSONSchema({
        mergeIntoBodyAndMetadata: true,
        retainDeprecatedProperties: true,
      });

      expect(jsonSchema.map(js => js.type)).toStrictEqual(['body']);
    });

    describe('retainDeprecatedProperties (default behavior)', () => {
      it('should support merging `deprecatedProps` together', () => {
        const oas = createOas({
          parameters: [
            {
              in: 'header',
              name: 'Accept',
              deprecated: true,
              schema: {
                type: 'string',
              },
            },
          ],
        });

        const jsonSchema = oas.operation('/', 'get').getParametersAsJSONSchema({ mergeIntoBodyAndMetadata: true });
        expect(jsonSchema).toMatchSnapshot();
      });
    });
  });

  describe('retainDeprecatedProperties', () => {
    it('should retain deprecated properties within their original schemas', () => {
      const oas = createOas({
        parameters: [
          {
            in: 'header',
            name: 'Accept',
            deprecated: true,
            schema: {
              type: 'string',
            },
          },
        ],
      });

      const jsonSchema = oas.operation('/', 'get').getParametersAsJSONSchema({ retainDeprecatedProperties: true });
      expect(jsonSchema[0].schema).toStrictEqual({
        type: 'object',
        properties: {
          Accept: expect.any(Object),
        },
        required: [],
      });

      expect(jsonSchema[0].deprecatedProps).toBeUndefined();
    });
  });

  describe('transformer', () => {
    it('should be able transform part of a schema', () => {
      const oas = createOas({
        requestBody: {
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  {
                    title: '260 Created (token)',
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        example: '61e36b8fc12c4d8fd0842f76',
                      },
                    },
                  },
                  {
                    title: '260 Created',
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        example: '61e36b8fc12c4d8fd0842f76',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      });

      const jsonSchema = oas.operation('/', 'get').getParametersAsJSONSchema({
        transformer: schema => {
          if (schema.title) {
            if (/^\d/.test(schema.title)) {
              schema.title = schema.title.toUpperCase();
            }
          }

          return schema;
        },
      });

      expect(jsonSchema[0].schema.oneOf).toStrictEqual([
        {
          title: '260 CREATED (TOKEN)',
          type: 'object',
          properties: {
            id: {
              type: 'string',
              examples: ['61e36b8fc12c4d8fd0842f76'],
            },
          },
        },
        {
          title: '260 CREATED',
          type: 'object',
          properties: {
            id: {
              type: 'string',
              examples: ['61e36b8fc12c4d8fd0842f76'],
            },
          },
        },
      ]);
    });

    it('should be able to transform a schema into a non-object', () => {
      const operation = petstore.operation('/pet', 'post');

      const jsonSchema = operation.getParametersAsJSONSchema({
        transformer: schema => {
          if ('x-readme-ref-name' in schema) {
            return schema['x-readme-ref-name'] as SchemaObject;
          }

          return schema;
        },
      });

      expect(jsonSchema).toStrictEqual([
        {
          description: 'Pet object that needs to be added to the store',
          label: 'Body Params',
          schema: 'Pet',
          type: 'body',
        },
      ]);
    });

    describe('with the `includeDiscriminatorMappingRefs` option', () => {
      it('should be able to support an operation that has discriminator mappings', () => {
        const operation = ably.operation('/accounts/{account_id}/apps', 'post');
        const jsonSchema = operation.getParametersAsJSONSchema({
          includeDiscriminatorMappingRefs: false,
          transformer: schema => {
            if ('x-readme-ref-name' in schema) {
              return schema['x-readme-ref-name'] as SchemaObject;
            }

            return schema;
          },
        });

        expect(jsonSchema).toStrictEqual([
          {
            type: 'path',
            label: 'Path Params',
            schema: {
              type: 'object',
              properties: {
                account_id: {
                  type: 'string',
                  $schema: 'http://json-schema.org/draft-04/schema#',
                  description: 'The account ID of the account in which to create the application.',
                },
              },
              required: ['account_id'],
            },
          },
          { type: 'body', label: 'Body Params', schema: 'app_post' },
        ]);
      });
    });
  });
});
