const Oas = require('../../src').default;

const createOas = require('../__fixtures__/create-oas').default;
const circular = require('../__datasets__/circular.json');
const discriminators = require('../__datasets__/discriminators.json');
const parametersCommon = require('../__datasets__/parameters-common.json');
const petstore = require('@readme/oas-examples/3.0/json/petstore.json');
const petstore_31 = require('@readme/oas-examples/3.1/json/petstore.json');
const petstoreServerVars = require('../__datasets__/petstore-server-vars.json');
const deprecated = require('../__datasets__/schema-deprecated.json');
const polymorphismQuirks = require('../__datasets__/polymorphism-quirks.json');

test('it should return with null if there are no parameters', () => {
  expect(createOas({ parameters: [] }).operation('/', 'get').getParametersAsJsonSchema()).toBeNull();
  expect(createOas({}).operation('/', 'get').getParametersAsJsonSchema()).toBeNull();
});

describe('type sorting', () => {
  const operation = {
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
    operation.requestBody.content = {
      'application/x-www-form-urlencoded': {
        schema: {
          type: 'object',
          properties: { a: { type: 'string' } },
        },
      },
    };

    const oas = createOas(operation);
    const jsonschema = oas.operation('/', 'get').getParametersAsJsonSchema();

    expect(jsonschema).toMatchSnapshot();
    expect(
      jsonschema.map(js => {
        return js.type;
      })
    ).toStrictEqual(['path', 'query', 'cookie', 'formData', 'header']);
  });

  it('should return with a json schema for each parameter type (body instead of formData)', () => {
    operation.requestBody.content = {
      'application/json': {
        schema: {
          type: 'object',
          properties: { a: { type: 'string' } },
        },
      },
    };

    const oas = createOas(operation);
    const jsonschema = oas.operation('/', 'get').getParametersAsJsonSchema();

    expect(jsonschema).toMatchSnapshot();
    expect(
      jsonschema.map(js => {
        return js.type;
      })
    ).toStrictEqual(['path', 'query', 'body', 'cookie', 'header']);
  });
});

describe('$schema version', () => {
  it('should add the v4 schema version to OpenAPI 3.0.x schemas', async () => {
    const oas = Oas.init(petstore);
    await oas.dereference();

    expect(oas.operation('/pet', 'post').getParametersAsJsonSchema()[0].schema.$schema).toBe(
      'http://json-schema.org/draft-04/schema#'
    );
  });

  it('should add v2020-12 schema version on OpenAPI 3.1 schemas', async () => {
    const oas = Oas.init(petstore_31);
    await oas.dereference();

    expect(oas.operation('/pet', 'post').getParametersAsJsonSchema()[0].schema.$schema).toBe(
      'https://json-schema.org/draft/2020-12/schema#'
    );
  });
});

describe('parameters', () => {
  it('should convert parameters to JSON schema', async () => {
    const oas = new Oas(petstore);
    await oas.dereference();

    const operation = oas.operation('/pet/{petId}', 'delete');
    expect(operation.getParametersAsJsonSchema()).toMatchSnapshot();
  });

  describe('polymorphism', () => {
    it('should merge allOf schemas together', async () => {
      const oas = new Oas(polymorphismQuirks);
      await oas.dereference();

      const operation = oas.operation('/allof-with-empty-object-property', 'post');

      expect(operation.getParametersAsJsonSchema()).toMatchSnapshot();
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

      const schema = oas.operation('/', 'get').getParametersAsJsonSchema();
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

      const schema = oas.operation('/', 'get').getParametersAsJsonSchema();
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
              // Though is the first entry here is XML, we should actually use the second instead because it's
              // JSON-like.
              'application/xml': { schema: { type: 'string' } },
              'application/vnd.github.v3.star+json': {
                schema: { type: 'integer' },
              },
            },
          },
        ],
      });

      const schema = oas.operation('/', 'get').getParametersAsJsonSchema();
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

      const schema = oas.operation('/', 'get').getParametersAsJsonSchema();
      expect(schema[0].schema.properties.userId).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'integer',
      });
    });
  });

  describe('common parameters', () => {
    it('should override path-level parameters on the operation level', () => {
      const oas = new Oas(parametersCommon);

      expect(
        oas.operation('/anything/{id}/override', 'get').getParametersAsJsonSchema()[0].schema.properties.id.description
      ).toBe('A comma-separated list of pet IDs');
    });

    it('should add common parameter to path params', () => {
      const oas = new Oas(parametersCommon);
      const operation = oas.operation('/anything/{id}', 'get');

      expect(operation.getParametersAsJsonSchema()[0].schema.properties.id.description).toBe('ID parameter');
    });
  });
});

describe('request bodies', () => {
  describe('should convert request bodies to JSON schema', () => {
    it('application/json', async () => {
      const oas = new Oas(petstore);
      await oas.dereference();

      const operation = oas.operation('/pet', 'post');
      expect(operation.getParametersAsJsonSchema()).toMatchSnapshot();
    });

    it('application/x-www-form-urlencoded', async () => {
      const oas = new Oas(petstoreServerVars);
      await oas.dereference();

      const operation = oas.operation('/pet/{petId}', 'post');
      expect(operation.getParametersAsJsonSchema()).toMatchSnapshot();
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

    expect(oas.operation('/', 'get').getParametersAsJsonSchema()).toStrictEqual([]);
  });
});

describe('$ref quirks', () => {
  it("should retain $ref pointers in the schema even if they're circular", async () => {
    const oas = new Oas(circular);
    await oas.dereference();

    expect(oas.operation('/', 'put').getParametersAsJsonSchema()).toMatchSnapshot();
  });
});

describe('polymorphism / discriminators', () => {
  it('should retain discriminator `mapping` refs when present', async () => {
    const oas = new Oas(discriminators);
    await oas.dereference();

    const operation = oas.operation('/anything/discriminator-with-mapping', 'patch');
    expect(operation.getParametersAsJsonSchema()).toMatchSnapshot();
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

        // So we can test that components are transformed, this test intentionally does **not** dereference the API
        // definition.
        const schema = oas.operation('/', 'get').getParametersAsJsonSchema();

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

    expect(oas.operation('/', 'get').getParametersAsJsonSchema()).toStrictEqual([
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

    expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema).toStrictEqual({
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

describe('`globalDefaults` option', () => {
  it('should use user defined `globalDefaults` for requestBody', async () => {
    const schema = new Oas(petstore);
    await schema.dereference();
    const operation = schema.operation('/pet', 'post');
    const jwtDefaults = {
      category: {
        id: 4,
        name: 'Testing',
      },
    };

    const jsonSchema = operation.getParametersAsJsonSchema(jwtDefaults);
    expect(jsonSchema[0].schema.properties.category.default).toStrictEqual(jwtDefaults.category);
  });

  it('should use user defined `globalDefaults` for parameters', async () => {
    const schema = new Oas(petstore);
    await schema.dereference();
    const operation = schema.operation('/pet/{petId}', 'get');
    const jwtDefaults = {
      petId: 1,
    };

    const jsonSchema = operation.getParametersAsJsonSchema(jwtDefaults);
    expect(jsonSchema[0].schema.properties.petId.default).toStrictEqual(jwtDefaults.petId);
  });
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

      const schema = oas.operation('/', 'get').getParametersAsJsonSchema();
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

      expect(oas.operation('/', 'get').getParametersAsJsonSchema()).toStrictEqual([
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
      expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].deprecatedProps.schema).toStrictEqual({
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

    it('should create deprecatedProps from body and metadata parameters', async () => {
      const oas = new Oas(deprecated);
      await oas.dereference();
      const operation = oas.operation('/anything', 'post');

      expect(operation.getParametersAsJsonSchema()).toMatchSnapshot();
    });

    it('should not put required deprecated parameters in deprecatedProps', async () => {
      const oas = new Oas(deprecated);
      await oas.dereference();
      const operation = oas.operation('/anything', 'post');
      const deprecatedSchema = operation.getParametersAsJsonSchema()[1].deprecatedProps.schema;

      deprecatedSchema.required.forEach(requiredParam => {
        expect(requiredParam in deprecatedSchema.properties).toBe(false);
      });
      expect(Object.keys(deprecatedSchema.properties)).toHaveLength(4);
    });

    it('should not put readOnly deprecated parameters in deprecatedProps', async () => {
      const oas = new Oas(deprecated);
      await oas.dereference();
      const operation = oas.operation('/anything', 'post');
      const deprecatedSchema = operation.getParametersAsJsonSchema()[1].deprecatedProps.schema;

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

      expect(oas.operation('/', 'get').getParametersAsJsonSchema()).toStrictEqual([
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

      expect(oas.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
    });
  });
});
