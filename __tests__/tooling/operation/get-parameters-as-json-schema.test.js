const Oas = require('../../../tooling');
const { constructSchema } = require('../../../tooling/operation/get-parameters-as-json-schema');
const fixtures = require('../__fixtures__/lib/json-schema');
const circular = require('../__fixtures__/circular.json');
const petstore = require('@readme/oas-examples/3.0/json/petstore.json');

const polymorphismScenarios = ['oneOf', 'allOf', 'anyOf'];
const createOas = (operation, components) => {
  const schema = {
    paths: { '/': { get: operation } },
  };

  if (components) {
    schema.components = components;
  }

  return new Oas(schema);
};

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
  describe('$ref support', () => {
    it('should handle dereferenced $ref parameters', async () => {
      const oas = createOas(
        {
          parameters: [
            {
              $ref: '#/components/parameters/Param',
            },
          ],
        },
        {
          parameters: {
            Param: {
              name: 'param',
              in: 'query',
              schema: {
                type: 'string',
              },
            },
          },
        }
      );

      await oas.dereference();

      expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema.properties.param).toStrictEqual(
        oas.components.parameters.Param.schema
      );
    });

    it('should handle parameters that have a dereferenced child $ref', async () => {
      const oas = createOas(
        {
          parameters: [
            {
              in: 'query',
              name: 'param',
              schema: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/string_enum',
                },
              },
            },
          ],
        },
        {
          schemas: {
            string_enum: {
              name: 'string enum',
              enum: ['available', 'pending', 'sold'],
              type: 'string',
            },
          },
        }
      );

      await oas.dereference();

      expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema.properties.param.items).toStrictEqual({
        name: 'string enum',
        enum: ['available', 'pending', 'sold'],
        type: 'string',
      });
    });

    it('should handle parameters that have a dereferenced $ref on an object property', async () => {
      const oas = createOas(
        {
          parameters: [
            {
              name: 'requestHeaders',
              in: 'header',
              required: true,
              schema: {
                type: 'object',
                properties: {
                  contentDisposition: {
                    $ref: '#/components/schemas/ContentDisposition',
                  },
                },
              },
            },
          ],
        },
        {
          schemas: {
            ContentDisposition: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                },
                name: {
                  type: 'string',
                },
              },
            },
          },
        }
      );

      await oas.dereference();

      const operation = oas.operation('/', 'get');

      expect(
        operation.getParametersAsJsonSchema()[0].schema.properties.requestHeaders.properties.contentDisposition
      ).toStrictEqual(oas.components.schemas.ContentDisposition);
    });

    it("should ignore a ref if it's empty", async () => {
      const oas = createOas({
        parameters: [
          { $ref: '' },
          {
            in: 'query',
            name: 'param',
            description: 'Param description',
            schema: {
              type: 'string',
            },
          },
        ],
      });

      await oas.dereference();

      const schema = oas.operation('/', 'get').getParametersAsJsonSchema();

      expect(schema).toHaveLength(1);
      expect(schema[0].schema.properties).toStrictEqual({
        param: {
          description: 'Param description',
          type: 'string',
        },
      });
    });
  });

  it('should pass through type for non-body parameters', () => {
    const oas = createOas({
      parameters: [
        {
          in: 'query',
          name: 'checkbox',
          schema: {
            type: 'boolean',
          },
        },
      ],
    });

    expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema.properties.checkbox.type).toBe('boolean');
  });

  it('should pass through type for non-body parameters that are arrays', () => {
    const oas = createOas({
      parameters: [
        {
          in: 'query',
          name: 'options',
          schema: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      ],
    });

    expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema.properties.options.type).toBe('array');
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
                required: true,
              },
            ],
            get: {
              parameters: [
                {
                  name: 'petId',
                  in: 'path',
                  description: 'A comma-separated list of pet IDs',
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
                required: true,
              },
            ],
            get: {},
          },
        },
      });

      const operation = oas.operation('/pet/{petId}', 'get');

      expect(operation.getParametersAsJsonSchema()[0].schema.properties.petId.description).toBe(
        oas.paths['/pet/{petId}'].parameters[0].description
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
              required: true,
            },
          },
        },
      });

      await oas.dereference();

      expect(
        oas.operation('/pet/{petId}', 'get').getParametersAsJsonSchema()[0].schema.properties.petId.description
      ).toBe(oas.components.parameters.petId.description);
    });
  });

  describe('polymorphism / inheritance', () => {
    it.each([['allOf'], ['anyOf'], ['oneOf']])('should support nested %s', prop => {
      const oas = createOas({
        parameters: [
          {
            in: 'query',
            name: 'nestedParam',
            schema: {
              properties: {
                nestedParamProp: {
                  [prop]: [
                    {
                      properties: {
                        nestedNum: {
                          type: 'integer',
                        },
                      },
                      type: 'object',
                    },
                    {
                      type: 'integer',
                    },
                  ],
                },
              },
              type: 'object',
            },
          },
        ],
      });

      const schema = oas.operation('/', 'get').getParametersAsJsonSchema();

      expect(schema[0].schema.properties.nestedParam.properties.nestedParamProp).toStrictEqual({
        [prop]: [
          {
            type: 'object',
            properties: {
              nestedNum: {
                type: 'integer',
              },
            },
          },
          {
            type: 'integer',
          },
        ],
      });
    });
  });
});

describe('request bodies', () => {
  it('should work for request body inline (json)', () => {
    const oas = createOas({
      requestBody: {
        description: 'Body description',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { a: { type: 'string' } },
            },
          },
        },
      },
    });

    expect(oas.operation('/', 'get').getParametersAsJsonSchema()).toStrictEqual([
      {
        label: 'Body Params',
        type: 'body',
        schema: {
          type: 'object',
          properties: {
            a: { type: 'string' },
          },
        },
      },
    ]);
  });

  it('should work for request body inline (formData)', () => {
    const oas = createOas({
      requestBody: {
        description: 'Form data description',
        content: {
          'application/x-www-form-urlencoded': {
            schema: {
              type: 'object',
              properties: { a: { type: 'string' } },
            },
          },
        },
      },
    });

    expect(oas.operation('/', 'get').getParametersAsJsonSchema()).toStrictEqual([
      {
        label: 'Form Data',
        type: 'formData',
        schema: {
          type: 'object',
          properties: {
            a: { type: 'string' },
          },
        },
      },
    ]);
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

  it('should add a missing `type` property if missing, but `properties` is present', () => {
    const oas = createOas({
      requestBody: {
        description: 'Body description',
        content: {
          'application/json': {
            schema: {
              properties: {
                name: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    });

    expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema).toStrictEqual({
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
    });
  });

  it('should handle object property keys that are named "properties"', () => {
    const oas = createOas({
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                },
                properties: {
                  type: 'object',
                  properties: {
                    tktk: {
                      type: 'integer',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const schema = oas.operation('/', 'get').getParametersAsJsonSchema();

    // What we're testing here is that we don't add a `type: object` adjacent to the `properties`-named object property.
    expect(Object.keys(schema[0].schema.properties)).toStrictEqual(['name', 'properties']);
  });

  describe('$ref support', () => {
    it('should handle dereferenced $ref schemas in `#/components/requestBodies`', async () => {
      const oas = createOas(
        {
          requestBody: {
            $ref: '#/components/requestBodies/petId',
          },
        },
        {
          requestBodies: {
            petId: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/petId',
                  },
                },
              },
            },
          },
          schemas: {
            petId: {
              type: 'number',
              format: 'int32',
            },
          },
        }
      );

      await oas.dereference();

      expect(oas.operation('/', 'get').getParametersAsJsonSchema()).toStrictEqual([
        {
          type: 'body',
          label: 'Body Params',
          schema: {
            components: {
              requestBodies: {
                petId: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'number',
                        format: 'int32',
                      },
                    },
                  },
                },
              },
              schemas: {
                petId: {
                  type: 'number',
                  format: 'int32',
                },
              },
            },
            type: 'number',
            format: 'int32',
          },
        },
      ]);
    });

    it('should ignore, but preserve, circular refs', async () => {
      const oas = new Oas(circular);

      await oas.dereference();

      expect(oas.operation('/', 'post').getParametersAsJsonSchema()).toMatchSnapshot();
    });
  });

  describe('polymorphism / inheritance', () => {
    it.each([['allOf'], ['anyOf'], ['oneOf']])('should support nested %s', prop => {
      const oas = createOas({
        requestBody: {
          description: 'Body description',
          content: {
            'application/json': {
              schema: {
                properties: {
                  nestedParam: {
                    properties: {
                      nestedParamProp: {
                        [prop]: [
                          {
                            properties: {
                              nestedNum: {
                                type: 'integer',
                              },
                            },
                            type: 'object',
                          },
                          {
                            type: 'integer',
                          },
                        ],
                      },
                    },
                    type: 'object',
                  },
                },
              },
            },
          },
        },
      });

      const schema = oas.operation('/', 'get').getParametersAsJsonSchema();

      expect(schema[0].schema.properties.nestedParam.properties.nestedParamProp).toStrictEqual({
        [prop]: [
          {
            properties: {
              nestedNum: {
                type: 'integer',
              },
            },
            type: 'object',
          },
          {
            type: 'integer',
          },
        ],
      });
    });
  });
});

describe('type', () => {
  describe('parameters', () => {
    it('should repair a malformed array that is missing items [README-8E]', () => {
      const oas = createOas({
        parameters: [
          {
            name: 'param',
            in: 'query',
            schema: {
              type: 'array',
            },
          },
        ],
      });

      expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema).toStrictEqual({
        properties: { param: { items: {}, type: 'array' } },
        required: [],
        type: 'object',
      });
    });

    it('should repair a malformed object that is typod as an array [README-6R]', () => {
      const oas = createOas({
        parameters: [
          {
            name: 'param',
            in: 'query',
            schema: {
              type: 'array',
              properties: {
                type: 'string',
              },
            },
          },
        ],
      });

      expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema).toStrictEqual({
        properties: {
          param: {
            type: 'object',
            properties: {
              type: 'string',
            },
          },
        },
        required: [],
        type: 'object',
      });
    });

    describe('repair invalid schema that has no `type`', () => {
      it('should repair an invalid schema that has no `type` as just a simple string', () => {
        const oas = createOas({
          parameters: [
            {
              name: 'userId',
              in: 'query',
              schema: {
                description: 'User ID',
              },
            },
          ],
        });

        expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema.properties).toStrictEqual({
          userId: {
            description: 'User ID',
            type: 'string',
          },
        });
      });

      it.each([['allOf'], ['anyOf'], ['oneOf']])('should not add a missing type on an %s schema', prop => {
        const oas = createOas({
          parameters: [
            {
              description: 'Order creation date',
              in: 'query',
              name: 'created',
              schema: {
                [prop]: [
                  {
                    properties: {
                      gt: {
                        type: 'integer',
                      },
                    },
                    title: 'range_query_specs',
                    type: 'object',
                  },
                  {
                    type: 'integer',
                  },
                ],
              },
            },
          ],
        });

        expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema.properties.created.type).toBeUndefined();
      });
    });
  });

  describe('request bodies', () => {
    it('should repair a malformed array that is missing items [README-8E]', () => {
      const oas = createOas({
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  type: 'array',
                },
                description: '',
              },
            },
          },
        },
      });

      const schema = oas.operation('/', 'get').getParametersAsJsonSchema();

      expect(schema[0].schema.items).toStrictEqual({
        type: 'array',
        items: {},
      });
    });

    it('should repair a malformed object that is typod as an array [README-6R]', () => {
      const oas = createOas({
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  required: ['name'],
                  type: 'array',
                  properties: {
                    name: {
                      type: 'string',
                    },
                  },
                },
                description: '',
              },
            },
          },
        },
      });

      const schema = oas.operation('/', 'get').getParametersAsJsonSchema();

      expect(schema[0].schema.items).toStrictEqual({
        properties: { name: { type: 'string' } },
        required: ['name'],
        type: 'object',
      });
    });

    describe('repair invalid schema that has no `type`', () => {
      it('should repair an invalid schema that has no `type` as just a simple string', () => {
        const oas = createOas({
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    host: {
                      description: 'Host name to check validity of.',
                    },
                  },
                },
              },
            },
          },
        });

        const schema = oas.operation('/', 'get').getParametersAsJsonSchema();

        expect(schema[0].schema).toStrictEqual({
          properties: {
            host: {
              description: 'Host name to check validity of.',
              type: 'string',
            },
          },
          type: 'object',
        });
      });

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
                    },
                  },
                },
              },
            },
          },
          {
            schemas: {
              ErrorResponse: {
                properties: {
                  message: {
                    type: 'string',
                  },
                },
              },
              NewUser: {
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

        const schema = oas.operation('/', 'get').getParametersAsJsonSchema();

        expect(schema[0].schema.components.schemas.ErrorResponse.type).toBe('object');
        expect(schema[0].schema.components.schemas.NewUser.type).toBe('object');
      });
    });
  });
});

describe('enums', () => {
  it.todo('should pass through enum on requestBody');

  it('should pass through enum on parameters', () => {
    const oas = createOas({
      parameters: [
        {
          in: 'header',
          name: 'Accept',
          required: false,
          schema: {
            type: 'string',
            enum: ['application/json', 'application/xml'],
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
              type: 'string',
              enum: ['application/json', 'application/xml'],
            },
          },
          required: [],
        },
      },
    ]);
  });
});

describe('format', () => {
  it.todo('should pass through format on requestBody');

  it('should pass through format on parameters', () => {
    const oas = createOas({
      parameters: [
        {
          in: 'query',
          name: 'checkbox',
          schema: {
            type: 'integer',
            format: 'int32',
          },
        },
      ],
    });

    expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema.properties.checkbox.format).toBe('int32');
  });
});

describe('titles', () => {
  it('should pass through titles on polymorphism `$ref`', async () => {
    const oas = createOas(
      {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  {
                    $ref: '#/components/schemas/Dog',
                  },
                ],
              },
            },
          },
        },
      },
      {
        schemas: {
          Dog: {
            title: 'Dog',
            allOf: [
              {
                type: 'object',
                properties: {
                  breed: {
                    type: 'string',
                    enum: ['Dingo', 'Husky', 'Retriever', 'Shepherd'],
                  },
                },
              },
            ],
          },
        },
      }
    );

    await oas.dereference();

    const schema = oas.operation('/', 'get').getParametersAsJsonSchema();

    expect(schema[0].schema.components.schemas.Dog.title).toBe('Dog');
    expect(schema[0].schema.oneOf).toStrictEqual([
      {
        ...oas.components.schemas.Dog,
      },
    ]);
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

describe('additionalProperties', () => {
  describe('parameters', () => {
    const parameters = [
      {
        name: 'param',
        in: 'query',
        schema: {
          type: 'array',
          items: {
            type: 'object',
          },
        },
      },
    ];

    it.each([
      ['true', true],
      ['false', false],
      ['an empty object', {}],
      ['an object containing a string', { type: 'string' }],
    ])('when set to %s', (tc, additionalProperties) => {
      parameters[0].schema.items.additionalProperties = additionalProperties;
      const oas = createOas({ parameters });

      expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema.properties.param.items).toStrictEqual({
        additionalProperties,
        type: 'object',
      });
    });

    it('when set to an object containing an array', () => {
      parameters[0].schema.items.additionalProperties = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              format: 'int64',
            },
          },
        },
      };

      const oas = createOas({ parameters });

      expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema.properties.param.items).toStrictEqual({
        additionalProperties: parameters[0].schema.items.additionalProperties,
        type: 'object',
      });
    });
  });

  describe('request bodies', () => {
    const requestBody = {
      description: 'Scenario: arrayOfPrimitives:default[undefined]allowEmptyValue[undefined]',
      content: {
        'application/json': { schema: { type: 'array', items: { type: 'object' } } },
      },
    };

    it.each([
      ['true', true],
      ['false', false],
      ['an empty object', {}],
      ['an object containing a string', { type: 'string' }],
    ])('when set to %s', (tc, additionalProperties) => {
      requestBody.content['application/json'].schema.items.additionalProperties = additionalProperties;
      const oas = createOas({ requestBody });

      expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema.items).toStrictEqual({
        additionalProperties,
        type: 'object',
      });
    });
  });
});

describe('defaults', () => {
  describe('parameters', () => {
    describe('should pass through defaults', () => {
      it('should pass a default of `false`', () => {
        const { parameters } = fixtures.generateParameterDefaults('simple', { default: false });
        const oas = createOas({ parameters });

        expect(oas.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
      });

      it('with normal non-$ref, non-inheritance, non-polymorphism cases', () => {
        const { parameters } = fixtures.generateParameterDefaults('simple', { default: 'example default' });
        const oas = createOas({ parameters });

        expect(oas.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
      });

      it('with simple usages of `$ref`', async () => {
        const { parameters, oas } = fixtures.generateParameterDefaults('$ref', { default: 'example default' });
        const oasInstance = createOas({ parameters }, oas.components);
        await oasInstance.dereference();

        expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
      });

      it('should not add jwtDefaults if there are no matches', async () => {
        const schema = new Oas(petstore);
        await schema.dereference();
        const operation = schema.operation('/pet', 'post');
        operation.jwtDefaults = {
          fakeParameter: {
            id: 4,
            name: 'Testing',
          },
        };

        const jsonSchema = await operation.getParametersAsJsonSchema();
        expect(jsonSchema[0].schema.properties.category.default).toBeUndefined();
      });

      it('should use user defined jwtDefaults', async () => {
        const schema = new Oas(petstore);
        await schema.dereference();
        const operation = schema.operation('/pet', 'post');
        operation.jwtDefaults = {
          category: {
            id: 4,
            name: 'Testing',
          },
        };

        const jsonSchema = operation.getParametersAsJsonSchema();
        expect(jsonSchema[0].schema.properties.category.default).toStrictEqual(operation.jwtDefaults.category);
      });

      it.todo('with usages of `oneOf` cases');

      it.todo('with usages of `allOf` cases');

      it.todo('with usages of `anyOf` cases');
    });

    describe('should comply with the `allowEmptyValue` declarative when present', () => {
      it('with normal non-$ref, non-inheritance, non-polymorphism cases', () => {
        const { parameters } = fixtures.generateParameterDefaults('simple', { default: '', allowEmptyValue: true });
        const oas = createOas({ parameters });
        expect(oas.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
      });

      it('with simple usages of `$ref`', async () => {
        const { parameters, oas } = fixtures.generateParameterDefaults('$ref', { default: '', allowEmptyValue: true });
        const oasInstance = createOas({ parameters }, oas.components);
        await oasInstance.dereference();

        expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
      });

      it.todo('with usages of `oneOf` cases');

      it.todo('with usages of `allOf` cases');

      it.todo('with usages of `anyOf` cases');
    });
  });

  describe('request bodies', () => {
    const schemaScenarios = [
      ['arrayOfPrimitives'],
      ['arrayWithAnArrayOfPrimitives'],
      ['objectWithPrimitivesAndMixedArrays'],
      ['primitiveString'],
    ];

    describe('should pass through defaults', () => {
      const fixtureOptions = {
        default: 'example default',
      };

      it.each(schemaScenarios)('should pass a default of `false` [scenario: %s]', scenario => {
        const { requestBody, oas } = fixtures.generateRequestBodyDefaults('simple', scenario, { default: false });
        const oasInstance = createOas({ requestBody }, oas.components);
        expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
      });

      it.each(schemaScenarios)(
        'with normal non-$ref, non-inheritance, non-polymorphism cases [scenario: %s]',
        scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults('simple', scenario, fixtureOptions);
          const oasInstance = createOas({ requestBody }, oas.components);
          expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
        }
      );

      it.each(schemaScenarios)('with simple usages of `$ref`` [scenario: %s]', async scenario => {
        const { requestBody, oas } = fixtures.generateRequestBodyDefaults('$ref', scenario, fixtureOptions);
        const oasInstance = createOas({ requestBody }, oas.components);
        await oasInstance.dereference();
        expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
      });

      describe.each(polymorphismScenarios)('with usages of `%s`', refType => {
        it.each(schemaScenarios)(`scenario: %s`, async scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults(refType, scenario, fixtureOptions);
          const oasInstance = createOas({ requestBody }, oas.components);
          await oasInstance.dereference();

          expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
        });
      });
    });

    describe('should comply with the `allowEmptyValue` declarative when present', () => {
      const fixtureOptions = {
        default: '',
        allowEmptyValue: true,
      };

      it.each(schemaScenarios)(
        'with normal non-$ref, non-inheritance, non-polymorphism cases [scenario: %s]',
        scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults('simple', scenario, fixtureOptions);
          const oasInstance = createOas({ requestBody }, oas.components);
          expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
        }
      );

      it.each(schemaScenarios)('with simple usages of `$ref` [scenario: %s]', async scenario => {
        const { requestBody, oas } = fixtures.generateRequestBodyDefaults('$ref', scenario, fixtureOptions);
        const oasInstance = createOas({ requestBody }, oas.components);
        await oasInstance.dereference();
        expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
      });

      describe.each(polymorphismScenarios)('with usages of `%s`', mod => {
        it.each(schemaScenarios)(`scenario: %s`, async scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults(mod, scenario, fixtureOptions);
          const oasInstance = createOas({ requestBody }, oas.components);
          await oasInstance.dereference();
          expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
        });
      });
    });

    describe('should not add a default when one is missing', () => {
      const fixtureOptions = {
        default: '',
        allowEmptyValue: false,
      };

      it.each(schemaScenarios)(
        'with normal non-$ref, non-inheritance, non-polymorphism cases [scenario: %s]',
        scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults('simple', scenario, fixtureOptions);
          const oasInstance = createOas({ requestBody }, oas.components);
          expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
        }
      );

      it.each(schemaScenarios)('with simple usages of `$ref` [scenario: %s]', async scenario => {
        const { requestBody, oas } = fixtures.generateRequestBodyDefaults('$ref', scenario, fixtureOptions);
        const oasInstance = createOas({ requestBody }, oas.components);
        await oasInstance.dereference();
        expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
      });

      describe.each(polymorphismScenarios)('with usages of `%s`', mod => {
        it.each(schemaScenarios)(`scenario: %s`, async scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults(mod, scenario, fixtureOptions);
          const oasInstance = createOas({ requestBody }, oas.components);
          await oasInstance.dereference();
          expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
        });
      });
    });
  });
});

describe('minLength / maxLength', () => {
  describe('parameters', () => {
    it('should pass maxLength and minLength properties', () => {
      const { parameters } = fixtures.generateParameterDefaults('simple', { minLength: 5, maxLength: 20 });
      const oas = createOas({ parameters });
      expect(oas.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
    });
  });

  describe('request bodies', () => {
    const schemaScenarios = [
      ['arrayOfPrimitives'],
      ['arrayWithAnArrayOfPrimitives'],
      ['objectWithPrimitivesAndMixedArrays'],
      ['primitiveString'],
    ];

    const fixtureOptions = {
      minLength: 5,
      maxLength: 20,
    };

    it.each(schemaScenarios)('should pass maxLength and minLength properties [scenario: %s]', scenario => {
      const { requestBody, oas } = fixtures.generateRequestBodyDefaults('simple', scenario, fixtureOptions);
      const oasInstance = createOas({ requestBody }, oas.components);
      expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
    });

    describe.each(polymorphismScenarios)(
      'should pass maxLength and minLength properties within usages of `%s`',
      mod => {
        it.each(schemaScenarios)(`scenario: %s`, async scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults(mod, scenario, fixtureOptions);
          const oasInstance = createOas({ requestBody }, oas.components);
          await oasInstance.dereference();
          expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
        });
      }
    );
  });
});

describe('example support', () => {
  describe.each([['example'], ['examples']])('example defined within `%s`', exampleProp => {
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

    it('should pick up an example alongside a property', () => {
      const schema = constructSchema({
        type: 'string',
        [exampleProp]: createExample('dog'),
      });

      expect(schema.examples).toStrictEqual(['dog']);
    });

    it('should allow falsy booleans', () => {
      const schema = constructSchema({
        type: 'boolean',
        [exampleProp]: createExample(false),
      });

      expect(schema.examples).toStrictEqual([false]);
    });

    describe('should ignore non-primitives', () => {
      it.each([
        ['array', [['dog']]],
        ['object', { type: 'dog' }],
      ])('%s', (testCase, value) => {
        const schema = constructSchema({
          type: 'string',
          [exampleProp]: createExample(value),
        });

        expect(schema.examples).toBeUndefined();
      });
    });

    it('should prefer and inherit a parent example (if present)', () => {
      const obj = {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            [exampleProp]: createExample(10),
          },
          name: {
            type: 'string',
          },
          categories: {
            type: 'array',
            items: {
              type: 'string',
            },
            [exampleProp]: createExample(['hungry']),
          },
          tags: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',
              },
              name: {
                type: 'object',
                properties: {
                  first: {
                    type: 'string',
                  },
                  last: {
                    type: 'string',
                  },
                },
              },
            },
            [exampleProp]: createExample({
              name: {
                last: 'dog',
              },
            }),
          },
        },
        [exampleProp]: createExample({
          id: 100,
          name: {
            first: 'buster',
          },
          categories: 'lazy',
          tags: {
            id: 50,
          },
        }),
      };

      expect(constructSchema(obj)).toStrictEqual({
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            examples: [10],
          },
          name: {
            type: 'string',
          },
          categories: {
            type: 'array',
            items: {
              type: 'string',
            },
            examples: ['hungry'],
          },
          tags: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',

                // Quirk: This is getting picked up as `100` as `id` exists in the root example and with the reverse
                // search, is getting picked up over `tags.id`. This example should actually be 50.
                examples: [100],
              },
              name: {
                type: 'object',
                properties: {
                  first: {
                    type: 'string',

                    // Quirk: This is getting picked up as `buster` as `name.first` exists in the root example and is
                    // geting picked up from the reverse example search. This property should not actually have an
                    // example present.
                    examples: ['buster'],
                  },
                  last: {
                    type: 'string',
                    examples: ['dog'],
                  },
                },
              },
            },
          },
        },
      });
    });

    it('should function through the normal workflow of retrieving a json schema and feeding it an initial example', async () => {
      const oas = new Oas(petstore);

      await oas.dereference();

      oas.paths['/pet'].post.requestBody.content['application/json'][exampleProp] = createExample({
        id: 20,
        name: 'buster',
        photoUrls: ['https://example.com/dog.png'],
      });

      const operation = oas.operation('/pet', 'post');

      const schema = operation.getParametersAsJsonSchema()[0].schema;

      expect(schema.properties.id.examples).toStrictEqual([20]);

      // Not `buster` because `doggie` is set directly alongside `name` in the definition.
      expect(schema.properties.name.examples).toStrictEqual(['doggie']);
      expect(schema.properties.photoUrls).toStrictEqual({
        type: 'array',
        items: {
          type: 'string',
          examples: ['https://example.com/dog.png'],
        },
      });

      expect(schema.components.schemas.Pet.properties.id.examples).toStrictEqual([20]);
      expect(schema.components.schemas.Pet.properties.name.examples).toStrictEqual(['doggie']);
    });
  });

  it('should be able to pick up multiple primitive examples within an `example` prop', () => {
    const schema = constructSchema({
      type: 'string',
      example: ['dog', 'cat', ['cow'], { horse: true }],
    });

    expect(schema.examples).toStrictEqual(['dog', 'cat']);
  });

  it('should be able to pick up multiple primitive examples within an `examples` prop', () => {
    const schema = constructSchema({
      type: 'string',
      examples: {
        distinctName1: {
          value: 'dog',
        },
        distinctName2: {
          value: 'cat',
        },
      },
    });

    expect(schema.examples).toStrictEqual(['dog', 'cat']);
  });

  it('should catch thrown jsonpointer errors', async () => {
    const oas = new Oas({
      paths: {
        '/': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      taxInfo: {
                        type: 'object',
                        nullable: true,
                        properties: {
                          url: {
                            type: 'string',
                            nullable: true,
                          },
                        },
                      },
                      price: {
                        type: 'integer',
                        format: 'int32',
                      },
                    },
                    example: {
                      // When attempting to search for an example on `taxInfo.url` jsonpointer will throw an error
                      // because `taxInfo` here is null.
                      taxInfo: null,
                      price: 1,
                    },
                  },
                  example: {
                    taxInfo: null,
                    price: 1,
                  },
                },
              },
            },
          },
        },
      },
    });

    await oas.dereference();

    const schema = oas.operation('/', 'post').getParametersAsJsonSchema();
    expect(schema[0].schema).toStrictEqual({
      type: 'object',
      properties: {
        taxInfo: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
            },
          },
        },
        price: {
          type: 'integer',
          format: 'int32',
          examples: [1],
        },
      },
    });
  });

  it('should not bug out if `examples` is an empty object', () => {
    const oas = new Oas({
      paths: {
        '/': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      limit: {
                        type: 'integer',
                      },
                    },
                  },
                  examples: {},
                },
              },
            },
          },
        },
      },
    });

    const schema = oas.operation('/', 'post').getParametersAsJsonSchema();
    expect(schema[0].schema).toStrictEqual({ type: 'object', properties: { limit: { type: 'integer' } } });
  });
});
