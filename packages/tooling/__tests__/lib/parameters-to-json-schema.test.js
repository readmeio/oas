const parametersToJsonSchema = require('../../src/lib/parameters-to-json-schema');

const fixtures = require('../__fixtures__/lib/json-schema');

const polymorphismScenarios = ['oneOf', 'allOf', 'anyOf'];

test('it should return with null if there are no parameters', async () => {
  expect(parametersToJsonSchema({ parameters: [] })).toBeNull();
  expect(parametersToJsonSchema({})).toBeNull();
});

describe('parameters', () => {
  describe('type sorting', () => {
    const schema = {
      parameters: [
        { in: 'path', name: 'path parameter' },
        { in: 'query', name: 'query parameter' },
        { in: 'header', name: 'header parameter' },
        { in: 'cookie', name: 'cookie parameter' },
      ],
      requestBody: {
        description: 'Body description',
        content: {},
      },
    };

    it('should return with a json schema for each parameter type (formData instead of body)', () => {
      schema.requestBody.content = {
        'application/x-www-form-urlencoded': {
          schema: {
            type: 'object',
            properties: { a: { type: 'string' } },
          },
        },
      };

      const jsonschema = parametersToJsonSchema(schema, {});

      expect(jsonschema).toMatchSnapshot();
      expect(
        jsonschema.map(js => {
          return js.type;
        })
      ).toStrictEqual(['path', 'query', 'cookie', 'formData', 'header']);
    });

    it('should return with a json schema for each parameter type (body instead of formData)', () => {
      schema.requestBody.content = {
        'application/json': {
          schema: {
            type: 'object',
            properties: { a: { type: 'string' } },
          },
        },
      };

      const jsonschema = parametersToJsonSchema(schema, {});

      expect(jsonschema).toMatchSnapshot();
      expect(
        jsonschema.map(js => {
          return js.type;
        })
      ).toStrictEqual(['path', 'query', 'body', 'cookie', 'header']);
    });
  });

  describe('$ref support', () => {
    it('should fetch $ref parameters', () => {
      const oas = {
        components: {
          parameters: {
            Param: {
              name: 'param',
              in: 'query',
              schema: {
                type: 'string',
              },
            },
          },
        },
      };

      expect(
        parametersToJsonSchema(
          {
            parameters: [
              {
                $ref: '#/components/parameters/Param',
              },
            ],
          },
          oas
        )[0].schema.properties.param
      ).toStrictEqual(oas.components.parameters.Param.schema);
    });

    it('should fetch parameters that have a child $ref', () => {
      const oas = {
        components: {
          schemas: {
            string_enum: {
              name: 'string',
              enum: ['available', 'pending', 'sold'],
              type: 'string',
            },
          },
        },
      };

      expect(
        parametersToJsonSchema(
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
          oas
        )[0].schema.properties.param.items
      ).toStrictEqual({
        // The `name` property from `#/components/schemas/string_enum` shouldn't be here because it's not valid in the case
        // of a parameter.
        enum: ['available', 'pending', 'sold'],
        type: 'string',
      });
    });

    it('should fetch parameters that have a $ref on an object property', () => {
      const oas = {
        components: {
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
        },
      };

      expect(
        parametersToJsonSchema(
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
          oas
        )[0].schema.properties.requestHeaders.properties.contentDisposition
      ).toStrictEqual(oas.components.schemas.ContentDisposition);
    });

    it("should ignore a ref if it's empty", () => {
      expect(
        parametersToJsonSchema(
          {
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
          },
          {}
        )[0].schema.properties
      ).toStrictEqual({
        param: {
          type: 'string',
        },
      });
    });
  });

  it('should pass through type for non-body parameters', () => {
    expect(
      parametersToJsonSchema({
        parameters: [
          {
            in: 'query',
            name: 'checkbox',
            schema: {
              type: 'boolean',
            },
          },
        ],
      })[0].schema.properties.checkbox.type
    ).toBe('boolean');
  });

  it('should pass through type for non-body parameters that are arrays', () => {
    expect(
      parametersToJsonSchema({
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
      })[0].schema.properties.options.type
    ).toBe('array');
  });

  it('should override path-level parameters on the operation level', () => {
    const oas = {
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
        },
      },
    };

    expect(
      parametersToJsonSchema({
        path: '/pet/{petId}',
        parameters: [
          {
            name: 'petId',
            in: 'path',
            description: 'A comma-separated list of pet IDs',
            required: true,
          },
        ],
        oas,
      })[0].schema.properties.petId.description
    ).toBe('A comma-separated list of pet IDs');
  });

  it('should add common parameter to path params', () => {
    const oas = {
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
        },
      },
    };

    expect(
      parametersToJsonSchema({
        path: '/pet/{petId}',
        oas,
      })[0].schema.properties.petId.description
    ).toBe(oas.paths['/pet/{petId}'].parameters[0].description);
  });

  it('should add common parameter $ref to path params', () => {
    const oas = {
      paths: {
        '/pet/{petId}': {
          parameters: [
            {
              $ref: '#/components/parameters/petId',
            },
          ],
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
    };

    expect(
      parametersToJsonSchema(
        {
          path: '/pet/{petId}',
          oas,
        },
        oas
      )[0].schema.properties.petId.description
    ).toBe(oas.components.parameters.petId.description);
  });

  describe('polymorphism / inheritance', () => {
    it.each([['allOf'], ['anyOf'], ['oneOf']])('should support nested %s', prop => {
      const schema = parametersToJsonSchema({
        parameters: [
          {
            in: 'query',
            name: 'nestedParam',
            schema: {
              properties: {
                nesdtedParamProp: {
                  [prop]: [
                    {
                      properties: {
                        nesdtedNum: {
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

      expect(schema[0].schema.properties.nestedParam.properties.nesdtedParamProp).toStrictEqual({
        [prop]: [
          {
            type: 'object',
            properties: {
              nesdtedNum: {
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
    expect(
      parametersToJsonSchema(
        {
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
        },
        {}
      )
    ).toStrictEqual([
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
    expect(
      parametersToJsonSchema(
        {
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
        },
        {}
      )
    ).toStrictEqual([
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
    expect(
      parametersToJsonSchema(
        {
          requestBody: {
            description: 'Body description',
            content: {
              'application/json': {
                schema: {},
              },
            },
          },
        },
        {}
      )
    ).toStrictEqual([]);
  });

  it('should add a missing `type` property if missing, but `properties` is present', () => {
    expect(
      parametersToJsonSchema(
        {
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
        },
        {}
      )[0].schema
    ).toStrictEqual({
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
    });
  });

  describe('$ref support', () => {
    it('should work for top-level request body $ref', () => {
      expect(
        parametersToJsonSchema(
          {
            requestBody: {
              $ref: '#/components/schemas/Pet',
            },
          },
          {
            components: {
              schemas: {
                Pet: {
                  type: 'string',
                },
              },
            },
          }
        )
      ).toStrictEqual([
        {
          type: 'body',
          label: 'Body Params',
          schema: {
            $ref: '#/components/schemas/Pet',
            components: {
              schemas: {
                Pet: {
                  type: 'string',
                },
              },
            },
          },
        },
      ]);
    });

    it('should pull out schemas from `#/components/requestBodies`', () => {
      const oas = {
        components: {
          requestBodies: {
            Pet: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Pet',
                  },
                },
              },
            },
          },
          schemas: {
            Pet: {
              type: 'string',
            },
          },
        },
      };

      expect(
        parametersToJsonSchema(
          {
            requestBody: {
              $ref: '#/components/requestBodies/Pet',
            },
          },
          oas
        )
      ).toStrictEqual([
        {
          type: 'body',
          label: 'Body Params',
          schema: {
            $ref: '#/components/schemas/Pet',
            components: oas.components,
          },
        },
      ]);
    });
  });

  describe('polymorphism / inheritance', () => {
    it.each([['allOf'], ['anyOf'], ['oneOf']])('should support nested %s', prop => {
      const schema = parametersToJsonSchema(
        {
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
        },
        {}
      );

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
      const parameters = [
        {
          name: 'param',
          in: 'query',
          schema: {
            type: 'array',
          },
        },
      ];

      expect(parametersToJsonSchema({ parameters })[0].schema).toStrictEqual({
        properties: { param: { items: {}, type: 'array' } },
        required: [],
        type: 'object',
      });
    });

    it('should repair a malformed object that is typod as an array [README-6R]', () => {
      const parameters = [
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
      ];

      expect(parametersToJsonSchema({ parameters })[0].schema).toStrictEqual({
        properties: { param: { type: 'object' } },
        required: [],
        type: 'object',
      });
    });

    it('should repair an invalid schema that has no `type` as just a simple string', () => {
      const parameters = [
        {
          name: 'userId',
          in: 'query',
          schema: {
            description: 'User ID',
          },
        },
      ];

      expect(parametersToJsonSchema({ parameters })[0].schema.properties).toStrictEqual({
        userId: {
          description: 'User ID',
          type: 'string',
        },
      });
    });
  });

  describe('request bodies', () => {
    it('should repair a malformed array that is missing items [README-8E]', () => {
      const oas = {
        components: {
          schemas: {
            updatePets: {
              type: 'array',
            },
          },
        },
      };

      const schema = parametersToJsonSchema(
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
        oas
      );

      expect(schema[0].schema.components.schemas.updatePets).toStrictEqual({
        items: {},
        type: 'array',
      });
    });

    it('should repair a malformed object that is typod as an array [README-6R]', () => {
      const oas = {
        components: {
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
        },
      };

      const schema = parametersToJsonSchema(
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
        oas
      );

      expect(schema[0].schema.components.schemas.updatePets).toStrictEqual({
        properties: { name: { type: 'string' } },
        required: ['name'],
        type: 'object',
      });
    });

    it('should repair an invalid schema that has no `type` as just a simple string', () => {
      const schema = parametersToJsonSchema(
        {
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
        },
        {}
      );

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
  });
});

describe('enums', () => {
  it.todo('should pass through enum on requestBody');

  it('should pass through enum on parameters', () => {
    expect(
      parametersToJsonSchema({
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
      })
    ).toStrictEqual([
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
    expect(
      parametersToJsonSchema({
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
      })[0].schema.properties.checkbox.format
    ).toBe('int32');
  });
});

describe('descriptions', () => {
  it.todo('should pass through description on requestBody');

  it('should pass through description on parameters', () => {
    expect(
      parametersToJsonSchema({
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
      })
    ).toStrictEqual([
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

  it('should preserve descriptions when there is an object property with the same name as a component schema', () => {
    const schema = parametersToJsonSchema(
      {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  metadata: {
                    type: 'object',
                    description: 'This description is coming from the requestbody schema property',
                    properties: {},
                  },
                },
              },
            },
          },
        },
      },
      {
        components: {
          schemas: {
            metadata: {
              description: 'This descrption is coming from the component schema',
              type: 'object',
              properties: {},
              required: [],
            },
          },
        },
      }
    )[0].schema;

    expect(schema.components.schemas.metadata.description).toBeUndefined();
    expect(schema.properties.metadata.description).not.toBeUndefined();
  });

  // This is to resolve a UI quirk with @readme/react-jsonschema-form.
  describe('@readme/react-jsonschema-form quirks', () => {
    it('should remove title and descriptions on top-level requestBody schemas', () => {
      const schema = parametersToJsonSchema(
        {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  title: 'User',
                  required: ['user_id'],
                  properties: {
                    user_id: {
                      type: 'string',
                      description: 'The users ID',
                    },
                  },
                  description: 'Application user',
                },
              },
            },
          },
        },
        {}
      )[0].schema;

      expect(schema.description).toBeUndefined();
      expect(schema.title).toBeUndefined();
      expect(schema.properties.user_id.description).toBe('The users ID');
    });

    it('should remove descriptions on top-level component schemas', () => {
      const oas = {
        components: {
          schemas: {
            user: {
              $ref: '#/components/schemas/user',
            },
            userBase: {
              description: 'User object',
              allOf: [
                {
                  $ref: '#/components/schemas/userName',
                },
              ],
            },
            userName: {
              type: 'object',
              properties: {
                firstName: {
                  type: 'string',
                  default: 'tktktk',
                },
                lastName: {
                  type: 'string',
                },
              },
            },
          },
        },
      };

      expect(
        parametersToJsonSchema(
          {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/user',
                  },
                },
              },
            },
          },
          oas
        )[0].schema.components.schemas.userBase.description
      ).toBeUndefined();
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

    it('when set to `true`', () => {
      parameters[0].schema.items.additionalProperties = true;

      expect(parametersToJsonSchema({ parameters })[0].schema.properties.param.items).toStrictEqual({
        additionalProperties: true,
        type: 'object',
      });
    });

    it('when set to an empty object', () => {
      parameters[0].schema.items.additionalProperties = {};

      expect(parametersToJsonSchema({ parameters })[0].schema.properties.param.items).toStrictEqual({
        additionalProperties: {},
        type: 'object',
      });
    });

    it('when set to an object', () => {
      parameters[0].schema.items.additionalProperties = {
        type: 'string',
      };

      expect(parametersToJsonSchema({ parameters })[0].schema.properties.param.items).toStrictEqual({
        additionalProperties: {
          type: 'string',
        },
        type: 'object',
      });
    });

    it('should be ignored when set to `false`', () => {
      parameters[0].schema.items.additionalProperties = false;

      expect(parametersToJsonSchema({ parameters })[0].schema.properties.param.items).toStrictEqual({
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

    it('when set to `true`', () => {
      requestBody.content['application/json'].schema.items.additionalProperties = true;
      expect(parametersToJsonSchema({ requestBody }, {})[0].schema.items).toStrictEqual({
        additionalProperties: true,
        type: 'object',
      });
    });

    it('when set to an empty object', () => {
      requestBody.content['application/json'].schema.items.additionalProperties = {};
      expect(parametersToJsonSchema({ requestBody }, {})[0].schema.items).toStrictEqual({
        additionalProperties: {},
        type: 'object',
      });
    });

    it('when set to an object', () => {
      requestBody.content['application/json'].schema.items.additionalProperties = {
        type: 'string',
      };

      expect(parametersToJsonSchema({ requestBody }, {})[0].schema.items).toStrictEqual({
        additionalProperties: {
          type: 'string',
        },
        type: 'object',
      });
    });

    it('should be ignored when set to `false`', () => {
      requestBody.content['application/json'].schema.items.additionalProperties = false;
      expect(parametersToJsonSchema({ requestBody }, {})[0].schema.items).toStrictEqual({
        type: 'object',
      });
    });
  });
});

describe('defaults', () => {
  it('should not attempt to recur on `null` data', () => {
    const oas = {
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
    };

    expect(parametersToJsonSchema(oas.paths['/{id}'].post, oas)).toMatchSnapshot();
  });

  describe('parameters', () => {
    describe('should pass through defaults', () => {
      it('should pass a default of `false`', () => {
        const { parameters } = fixtures.generateParameterDefaults('simple', { default: false });
        expect(parametersToJsonSchema({ parameters })).toMatchSnapshot();
      });

      it('with normal non-$ref, non-inheritance, non-polymorphism cases', () => {
        const { parameters } = fixtures.generateParameterDefaults('simple', { default: 'example default' });
        expect(parametersToJsonSchema({ parameters })).toMatchSnapshot();
      });

      it('with simple usages of `$ref`', () => {
        const { parameters, oas } = fixtures.generateParameterDefaults('$ref', { default: 'example default' });
        expect(parametersToJsonSchema({ parameters }, oas)).toMatchSnapshot();
      });

      it.todo('with usages of `oneOf` cases');

      it.todo('with usages of `allOf` cases');

      it.todo('with usages of `anyOf` cases');
    });

    describe('should comply with the `allowEmptyValue` declarative when present', () => {
      it('with normal non-$ref, non-inheritance, non-polymorphism cases', () => {
        const { parameters } = fixtures.generateParameterDefaults('simple', { default: '', allowEmptyValue: true });
        expect(parametersToJsonSchema({ parameters })).toMatchSnapshot();
      });

      it('with simple usages of `$ref`', () => {
        const { parameters, oas } = fixtures.generateParameterDefaults('$ref', { default: '', allowEmptyValue: true });
        expect(parametersToJsonSchema({ parameters }, oas)).toMatchSnapshot();
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
        expect(parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
      });

      it.each(schemaScenarios)(
        'with normal non-$ref, non-inheritance, non-polymorphism cases [scenario: %s]',
        scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults('simple', scenario, fixtureOptions);
          expect(parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
        }
      );

      it.each(schemaScenarios)('with simple usages of `$ref`` [scenario: %s]', scenario => {
        const { requestBody, oas } = fixtures.generateRequestBodyDefaults('$ref', scenario, fixtureOptions);
        expect(parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
      });

      describe.each(polymorphismScenarios)('with usages of `%s`', refType => {
        it.each(schemaScenarios)(`scenario: %s`, scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults(refType, scenario, fixtureOptions);
          expect(parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
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
          expect(parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
        }
      );

      it.each(schemaScenarios)('with simple usages of `$ref` [scenario: %s]', scenario => {
        const { requestBody, oas } = fixtures.generateRequestBodyDefaults('$ref', scenario, fixtureOptions);
        expect(parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
      });

      describe.each(polymorphismScenarios)('with usages of `%s`', mod => {
        it.each(schemaScenarios)(`scenario: %s`, scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults(mod, scenario, fixtureOptions);
          expect(parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
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
          expect(parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
        }
      );

      it.each(schemaScenarios)('with simple usages of `$ref` [scenario: %s]', scenario => {
        const { requestBody, oas } = fixtures.generateRequestBodyDefaults('$ref', scenario, fixtureOptions);
        expect(parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
      });

      describe.each(polymorphismScenarios)('with usages of `%s`', mod => {
        it.each(schemaScenarios)(`scenario: %s`, scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults(mod, scenario, fixtureOptions);
          expect(parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
        });
      });
    });
  });
});

describe('minLength / maxLength', () => {
  describe('parameters', () => {
    it('should pass maxLength and minLength properties', () => {
      const { parameters } = fixtures.generateParameterDefaults('simple', { minLength: 5, maxLength: 20 });
      expect(parametersToJsonSchema({ parameters })).toMatchSnapshot();
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
      expect(parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
    });

    describe.each(polymorphismScenarios)(
      'should pass maxLength and minLength properties within usages of `%s`',
      mod => {
        it.each(schemaScenarios)(`scenario: %s`, scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults(mod, scenario, fixtureOptions);
          expect(parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
        });
      }
    );
  });
});
