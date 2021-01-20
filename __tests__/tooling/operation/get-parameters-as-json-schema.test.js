const Oas = require('../../../tooling');
const fixtures = require('../__fixtures__/lib/json-schema');
const circular = require('../__fixtures__/circular.json');

console.logx = obj => {
  console.log(require('util').inspect(obj, false, null, true /* enable colors */));
};

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
    it('should fetch $ref parameters', () => {
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

      expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema.properties.param).toStrictEqual(
        oas.components.parameters.Param.schema
      );
    });

    it('should fetch parameters that have a child $ref', () => {
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
              name: 'string',
              enum: ['available', 'pending', 'sold'],
              type: 'string',
            },
          },
        }
      );

      expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema.properties.param.items).toStrictEqual({
        // The `name` property from `#/components/schemas/string_enum` shouldn't be here because it's not valid in the case
        // of a parameter.
        enum: ['available', 'pending', 'sold'],
        type: 'string',
      });
    });

    it('should fetch parameters that have a $ref on an object property', () => {
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

      const operation = oas.operation('/', 'get');

      expect(
        operation.getParametersAsJsonSchema()[0].schema.properties.requestHeaders.properties.contentDisposition
      ).toStrictEqual(oas.components.schemas.ContentDisposition);
    });

    it("should ignore a ref if it's empty", () => {
      const oas = createOas({
        parameters: [
          { $ref: '' },
          {
            in: 'query',
            name: 'param',
            schema: {
              type: 'string',
            },
          },
        ],
      });

      expect(oas.operation('/', 'get').getParametersAsJsonSchema()[0].schema.properties).toStrictEqual({
        param: {
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

    it('should add common parameter $ref to path params', () => {
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
    it('should pull out schemas from `#/components/requestBodies`', () => {
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
            },
            type: 'number',
            format: 'int32',
          },
        },
      ]);
    });

    it.skip('should ignore, but preserve, circular refs', async () => {
      const oas = new Oas(circular);

      await oas.dereference();

      console.logx(oas.operation('/', 'post').getParametersAsJsonSchema());
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
      const oas = createOas(
        {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/updatePets',
                  },
                  description: '',
                },
              },
            },
          },
        },
        {
          schemas: {
            updatePets: {
              type: 'array',
            },
          },
        }
      );

      const schema = oas.operation('/', 'get').getParametersAsJsonSchema();

      expect(schema[0].schema.components.schemas.updatePets).toStrictEqual({
        items: {},
        type: 'array',
      });
    });

    it('should repair a malformed object that is typod as an array [README-6R]', () => {
      const oas = createOas(
        {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/updatePets',
                  },
                  description: '',
                },
              },
            },
          },
        },
        {
          schemas: {
            updatePets: {
              required: ['name'],
              type: 'array',
              properties: {
                name: {
                  type: 'string',
                },
              },
            },
          },
        }
      );

      const schema = oas.operation('/', 'get').getParametersAsJsonSchema();

      expect(schema[0].schema.components.schemas.updatePets).toStrictEqual({
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

      it('should not add a string type on a ref and component schema that are clearly objects', () => {
        const oas = createOas(
          {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/NewUser',
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
  it('should pass through titles on polymorphism refs', () => {
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

  it('should pass through description on parameter when referenced as a ref and a requestBody is present', () => {
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
  it('should not attempt to recur on `null` data', () => {
    const oas = new Oas({
      paths: {
        '/{id}': {
          post: {
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: {
                  type: 'integer',
                  default: 12345,
                  example: null,
                },
              },
            ],
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Pet',
                  },
                },
              },
              required: true,
            },
          },
        },
      },
      components: {
        schemas: {
          Pet: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
            example: {
              name: null,
            },
          },
        },
      },
    });

    expect(oas.operation('/{id}', 'post').getParametersAsJsonSchema()).toMatchSnapshot();
  });

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

      it('with simple usages of `$ref`', () => {
        const { parameters, oas } = fixtures.generateParameterDefaults('$ref', { default: 'example default' });
        const oasInstance = createOas({ parameters }, oas.components);

        expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
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

      it('with simple usages of `$ref`', () => {
        const { parameters, oas } = fixtures.generateParameterDefaults('$ref', { default: '', allowEmptyValue: true });
        const oasInstance = createOas({ parameters }, oas.components);

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

      it.each(schemaScenarios)('with simple usages of `$ref`` [scenario: %s]', scenario => {
        const { requestBody, oas } = fixtures.generateRequestBodyDefaults('$ref', scenario, fixtureOptions);
        const oasInstance = createOas({ requestBody }, oas.components);
        expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
      });

      describe.each(polymorphismScenarios)('with usages of `%s`', refType => {
        it.each(schemaScenarios)(`scenario: %s`, scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults(refType, scenario, fixtureOptions);
          const oasInstance = createOas({ requestBody }, oas.components);
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

      it.each(schemaScenarios)('with simple usages of `$ref` [scenario: %s]', scenario => {
        const { requestBody, oas } = fixtures.generateRequestBodyDefaults('$ref', scenario, fixtureOptions);
        const oasInstance = createOas({ requestBody }, oas.components);
        expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
      });

      describe.each(polymorphismScenarios)('with usages of `%s`', mod => {
        it.each(schemaScenarios)(`scenario: %s`, scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults(mod, scenario, fixtureOptions);
          const oasInstance = createOas({ requestBody }, oas.components);
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

      it.each(schemaScenarios)('with simple usages of `$ref` [scenario: %s]', scenario => {
        const { requestBody, oas } = fixtures.generateRequestBodyDefaults('$ref', scenario, fixtureOptions);
        const oasInstance = createOas({ requestBody }, oas.components);
        expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
      });

      describe.each(polymorphismScenarios)('with usages of `%s`', mod => {
        it.each(schemaScenarios)(`scenario: %s`, scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults(mod, scenario, fixtureOptions);
          const oasInstance = createOas({ requestBody }, oas.components);
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
        it.each(schemaScenarios)(`scenario: %s`, scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults(mod, scenario, fixtureOptions);
          const oasInstance = createOas({ requestBody }, oas.components);
          expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
        });
      }
    );
  });
});

describe('example support', () => {
  describe('parameters', () => {
    describe('`example`', () => {
      it.each([
        ['should pass an example of `false`', 'simple', false],
        ['with normal non-$ref, non-inheritance, non-polymorphism primitive cases', 'simple', 'buster'],
        ['if the example is an array and the first key is a string, use that', 'simple', ['dog1', 'dog2']],
        ['should ignore non-primitives', 'simple', [[{ pug: true }]]],
      ])('%s', (testCase, complexity, example) => {
        const { parameters } = fixtures.generateParameterDefaults(complexity, { example });
        const oas = createOas({ parameters });

        expect(oas.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
      });

      it('with simple usages of `$ref`', () => {
        const { parameters, oas } = fixtures.generateParameterDefaults('$ref', { example: 'buster' });
        const oasInstance = createOas({ parameters }, oas.components);

        expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
      });

      it.todo('with usages of `oneOf` cases');

      it.todo('with usages of `allOf` cases');

      it.todo('with usages of `anyOf` cases');
    });

    describe('`examples`', () => {
      it.each([
        ['should passthrough an example of `false`', 'simple', { dog: { value: false } }],
        [
          'with normal non-$ref, non-inheritance, non-polymorphism primitive cases',
          'simple',
          { dog: { value: 'buster' } },
        ],
        [
          'if the example is an array and the first key is a string, use that',
          'simple',
          { dog: { value: ['name1', 'name2'] } },
        ],
        ['should ignore non-primitives', 'simple', { dog: { value: [[{ pug: true }]] } }],
        ['should ignore externalValue examples', 'simple', { dog: { externalValue: '<url>' } }],
      ])('%s', (testCase, complexity, examples) => {
        const { parameters } = fixtures.generateParameterDefaults(complexity, { examples });
        const oas = createOas({ parameters });

        expect(oas.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
      });

      it('with simple usages of `$ref`', () => {
        const { parameters, oas } = fixtures.generateParameterDefaults('$ref', {
          examples: { dog: { $ref: '#/components/examples/dogExample' } },
        });

        oas.components.examples = { dogExample: { value: 'buster' } };

        const oasInstance = createOas({ parameters }, oas.components);

        expect(oasInstance.operation('/', 'get').getParametersAsJsonSchema()).toMatchSnapshot();
      });
    });
  });

  describe('request bodies', () => {});
});
