const Oas = require('../../src').default;

const createOas = require('../__fixtures__/create-oas').default;
const circular = require('../__datasets__/circular.json');
const discriminators = require('../__datasets__/discriminators.json');
const petstore = require('@readme/oas-examples/3.0/json/petstore.json');
const petstoreServerVars = require('../__datasets__/petstore-server-vars.json');
const deprecated = require('../__datasets__/schema-deprecated.json');

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

describe('parameters', () => {
  it('should convert parameters to JSON schema', async () => {
    const oas = new Oas(petstore);
    await oas.dereference();

    const operation = oas.operation('/pet/{petId}', 'delete');
    expect(operation.getParametersAsJsonSchema()).toMatchSnapshot();
  });

  describe('type quirks', () => {
    it('should set a type to `string` if neither `schema` or `current` are present', () => {
      const oas = createOas({
        parameters: [
          {
            name: 'userId',
            in: 'query',
          },
        ],
      });

      const schema = oas.operation('/', 'get').getParametersAsJsonSchema();
      expect(schema[0].schema.properties.userId).toStrictEqual({
        type: 'string',
      });
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
              'application/vnd.github.v3.star+json': { schema: { type: 'integer' } },
            },
          },
        ],
      });

      const schema = oas.operation('/', 'get').getParametersAsJsonSchema();
      expect(schema[0].schema.properties.userId).toStrictEqual({
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
        type: 'integer',
      });
    });
  });

  describe('common parameters', () => {
    it('should override path-level parameters on the operation level', () => {
      const oas = new Oas({
        paths: {
          '/pet/{petId}': {
            parameters: [
              {
                name: 'petId',
                in: 'path',
                description: 'ID of pet to return',
                schema: {
                  type: 'string',
                },
                required: true,
              },
            ],
            get: {
              parameters: [
                {
                  name: 'petId',
                  in: 'path',
                  description: 'A comma-separated list of pet IDs',
                  schema: {
                    type: 'string',
                  },
                  required: true,
                },
              ],
            },
          },
        },
      });

      expect(
        oas.operation('/pet/{petId}', 'get').getParametersAsJsonSchema()[0].schema.properties.petId.description
      ).toBe('A comma-separated list of pet IDs');
    });

    it('should add common parameter to path params', () => {
      const oas = new Oas({
        paths: {
          '/pet/{petId}': {
            parameters: [
              {
                name: 'petId',
                in: 'path',
                description: 'ID of pet to return',
                schema: {
                  type: 'string',
                },
                required: true,
              },
            ],
            get: {},
          },
        },
      });

      const operation = oas.operation('/pet/{petId}', 'get');

      expect(operation.getParametersAsJsonSchema()[0].schema.properties.petId.description).toBe(
        oas.api.paths['/pet/{petId}'].parameters[0].description
      );
    });

    it('should handle a common parameter dereferenced $ref to path params', async () => {
      const oas = new Oas({
        paths: {
          '/pet/{petId}': {
            parameters: [
              {
                $ref: '#/components/parameters/petId',
              },
            ],
            get: {},
          },
        },
        components: {
          parameters: {
            petId: {
              name: 'petId',
              in: 'path',
              description: 'ID of pet to return',
              schema: {
                type: 'string',
              },
              required: true,
            },
          },
        },
      });

      await oas.dereference();

      expect(
        oas.operation('/pet/{petId}', 'get').getParametersAsJsonSchema()[0].schema.properties.petId.description
      ).toBe(oas.api.components.parameters.petId.description);
    });
  });
});

describe('request bodies', () => {
  it('should convert request bodies to JSON schema (application/json)', async () => {
    const oas = new Oas(petstore);
    await oas.dereference();

    const operation = oas.operation('/pet', 'post');
    expect(operation.getParametersAsJsonSchema()).toMatchSnapshot();
  });

  it('should convert request bodies to JSON schema (application/x-www-form-urlencoded)', async () => {
    const oas = new Oas(petstoreServerVars);
    await oas.dereference();

    const operation = oas.operation('/pet/{petId}', 'post');
    expect(operation.getParametersAsJsonSchema()).toMatchSnapshot();
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
      it('should not add a string type on a `requestBody` and component schema that are clearly objects', () => {
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
    it.each([['example'], ['examples']])('should pick up `%s` if declared outside of the `schema`', exampleProp => {
      function createExample(value) {
        if (exampleProp === 'example') {
          return value;
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
              [exampleProp]: createExample('example bar'),
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
              'query parameter': { type: 'string', examples: ['example foo'] },
              'query parameter alt': { type: 'string', examples: ['example bar'] },
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
              properties: {
                Accept: {
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
        properties: {
          pathId: {
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
            properties: {
              uri: { type: 'string', format: 'uri' },
            },
            type: 'object',
          },
          deprecatedProps: {
            type: 'body',
            schema: {
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
    it('should pass through deprecated on an allOf schema', () => {
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
