const parametersToJsonSchema = require('../../src/lib/parameters-to-json-schema');

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
            definitions: {
              components: {
                schemas: {
                  Pet: {
                    type: 'string',
                  },
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
            definitions: {
              components: oas.components,
            },
          },
        },
      ]);
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
});

describe('required', () => {
  it.todo('should pass through `required` on parameters');

  it.todo('should make things required correctly for request bodies');
});

describe('defaults', () => {
  describe('parameters', () => {
    it('should pass through defaults', () => {
      expect(
        parametersToJsonSchema({
          parameters: [
            {
              name: 'primitiveQueryhasDefault',
              in: 'query',
              schema: { type: 'string', default: 'tktktktk' },
            },
            {
              name: 'arrayOfPrimitivesHasDefaults',
              in: 'query',
              schema: {
                type: 'array',
                items: { type: 'string', default: 'tktktktk' },
              },
            },
            {
              name: 'arrayWithAnArrayOfPrimitivesHasDefaults',
              in: 'query',
              schema: {
                type: 'array',
                items: {
                  type: 'array',
                  items: { type: 'string', default: 'tktktktk' },
                },
              },
            },
            {
              name: 'objectWithPrimitivesAndMixedArrays',
              in: 'query',
              schema: {
                type: 'object',
                properties: {
                  param1: { type: 'string', default: 'tktktktk' },
                  param2: {
                    type: 'array',
                    items: {
                      type: 'array',
                      items: { type: 'string', default: 'tktktktk' },
                    },
                  },
                },
              },
            },
          ],
        })
      ).toMatchSnapshot();
    });

    it('should pass a default of `false`', () => {
      expect(
        parametersToJsonSchema({
          parameters: [
            {
              in: 'query',
              name: 'check',
              schema: {
                type: 'boolean',
                default: false,
              },
            },
          ],
        })[0].schema.properties.check
      ).toStrictEqual({ default: false, type: 'boolean' });
    });

    it('should not add a default when one is missing', () => {
      expect(
        parametersToJsonSchema({
          parameters: [
            {
              name: 'primitiveStringWithEmptyDefault',
              in: 'query',
              schema: {
                type: 'string',
                default: '',
              },
            },
            {
              name: 'primitiveStringWithNoDefault',
              in: 'query',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'arrayOfPrimitivesWithNoDefault',
              in: 'query',
              schema: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
            {
              name: 'arrayOfPrimitivesWithEmptyDefault',
              in: 'query',
              schema: {
                type: 'array',
                items: {
                  type: 'string',
                  default: '',
                },
              },
            },
            {
              name: 'arrayOfArrayOfPrimitivesWithNoDefault',
              in: 'query',
              schema: {
                type: 'array',
                items: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              },
            },
            {
              name: 'arrayOfArrayOfPrimitivesWithEmptyDefault',
              in: 'query',
              schema: {
                type: 'array',
                items: {
                  type: 'array',
                  items: {
                    type: 'string',
                    default: '',
                  },
                },
              },
            },
            {
              name: 'objectWithPrimitiveAndNoDefault',
              in: 'query',
              schema: {
                type: 'object',
                properties: {
                  param1: {
                    type: 'string',
                  },
                },
              },
            },
            {
              name: 'objectWithPrimitivesAndMixedArraysContainingNoAndEmptyDefaults',
              in: 'query',
              schema: {
                type: 'object',
                properties: {
                  param1: {
                    type: 'string',
                    default: '',
                  },
                  param2: {
                    type: 'string',
                  },
                  param3: {
                    type: 'array',
                    items: {
                      type: 'array',
                      items: {
                        type: 'string',
                        default: '',
                      },
                    },
                  },
                },
              },
            },
          ],
        })
      ).toMatchSnapshot();
    });
  });

  describe('request bodies', () => {
    it.todo('should pass through defaults');

    it.todo('should not add a default when one is missing');
  });
});
