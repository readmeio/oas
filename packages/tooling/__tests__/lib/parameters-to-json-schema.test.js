/* eslint-disable jest/no-commented-out-tests */
/* eslint-disable jest-formatting/padding-around-test-blocks */
const parametersToJsonSchema = require('../../src/lib/parameters-to-json-schema');

const fixtures = require('../__fixtures__/lib/json-schema');

const util = require('util');

// eslint-disable-next-line no-unused-vars
function inspect(obj) {
  // eslint-disable-next-line no-console
  console.log(util.inspect(obj, false, null, true));
}

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

      it.todo('with `oneOf` cases');
      it.todo('with `allOf` cases');
      it.todo('with `anyOf` cases');
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

      it.todo('with `oneOf` cases');
      it.todo('with `allOf` cases');
      it.todo('with `anyOf` cases');
    });
  });

  describe('request bodies', () => {
    describe('should pass through defaults', () => {
      const scenarios = [
        ['arrayOfPrimitives'],
        ['arrayWithAnArrayOfPrimitives'],
        ['objectWithPrimitivesAndMixedArrays'],
        ['primitiveString'],
      ];

      it.each(scenarios)('should pass a default of `false` [scenario: %s]', scenario => {
        const { requestBody, oas } = fixtures.generateRequestBodyDefaults('simple', scenario, { default: false });
        expect(parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
      });

      it.each(scenarios)('with normal non-$ref, non-inheritance, non-polymorphism cases [scenario: %s]', scenario => {
        const { requestBody, oas } = fixtures.generateRequestBodyDefaults('simple', scenario, {
          default: 'example default',
        });

        expect(parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
      });

      it.each(scenarios)('with simple usages of `$ref`` [scenario: %s]', scenario => {
        const { requestBody, oas } = fixtures.generateRequestBodyDefaults('$ref', scenario, {
          default: 'example default',
        });

        expect(parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
      });

      /* it.skip('with `oneOf` cases', () => {
        expect(
          parametersToJsonSchema(
            {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      oneOf: [
                        {
                          title: 'object1',
                          type: 'object',
                          properties: {
                            a: {
                              type: 'string',
                              default: 'tktktk',
                            },
                            b: {
                              type: 'string',
                            },
                          },
                        },
                        {
                          $ref: '#/components/schemas/object2',
                        },
                      ],
                    },
                  },
                },
              },
            },
            {
              components: {
                schemas: {
                  object2: {
                    title: 'Second type of object',
                    type: 'object',
                    properties: {
                      c: {
                        type: 'string',
                      },
                      d: {
                        type: 'string',
                        default: 'tktktktk',
                      },
                    },
                  },
                },
              },
            }
          )
        ).toStrictEqual([
          {
            label: 'Body Params',
            schema: {
              definitions: {
                components: {
                  schemas: {
                    object2: {
                      properties: {
                        c: {
                          type: 'string',
                        },
                        d: {
                          default: 'tktktktk',
                          type: 'string',
                        },
                      },
                      title: 'Second type of object',
                      type: 'object',
                    },
                  },
                },
              },
              oneOf: [
                {
                  properties: {
                    a: {
                      default: 'tktktk',
                      type: 'string',
                    },
                    b: {
                      type: 'string',
                    },
                  },
                  title: 'object1',
                  type: 'object',
                },
                {
                  $ref: '#/components/schemas/object2',
                },
              ],
            },
            type: 'body',
          },
        ]);
      }); */

      /* it.skip('with `allOf` cases', () => {
        expect(
          parametersToJsonSchema(
            {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      allOf: [
                        {
                          title: 'object1',
                          type: 'object',
                          properties: {
                            a: {
                              type: 'string',
                              default: 'tktktk',
                            },
                            b: {
                              type: 'string',
                            },
                          },
                        },
                        {
                          $ref: '#/components/schemas/object2',
                        },
                      ],
                    },
                  },
                },
              },
            },
            {
              components: {
                schemas: {
                  object2: {
                    title: 'Second type of object',
                    type: 'object',
                    properties: {
                      c: {
                        type: 'string',
                      },
                      d: {
                        type: 'string',
                        default: 'tktktktk',
                      },
                    },
                  },
                },
              },
            }
          )
        ).toStrictEqual([
          {
            label: 'Body Params',
            schema: {
              definitions: {
                components: {
                  schemas: {
                    object2: {
                      properties: {
                        c: {
                          type: 'string',
                        },
                        d: {
                          default: 'tktktktk',
                          type: 'string',
                        },
                      },
                      title: 'Second type of object',
                      type: 'object',
                    },
                  },
                },
              },
              allOf: [
                {
                  properties: {
                    a: {
                      default: 'tktktk',
                      type: 'string',
                    },
                    b: {
                      type: 'string',
                    },
                  },
                  title: 'object1',
                  type: 'object',
                },
                {
                  $ref: '#/components/schemas/object2',
                },
              ],
            },
            type: 'body',
          },
        ]);
      }); */

      it.todo('with `anyOf` cases');
    });

    describe('should pass through an empty default when `allowEmptyValue` is present', () => {
      it.todo('with normal non-$ref, non-inheritance, non-polymorphism cases');
      it.todo('with simple usages of `$ref`');
      it.todo('with `oneOf` cases');
      it.todo('with `allOf` cases');
      it.todo('with `anyOf` cases');
    });

    describe('should not add a default when one is missing', () => {
      it.todo('with normal non-$ref, non-inheritance, non-polymorphism cases');

      it.todo('with simple usages of `$ref`');
      it.todo('with `oneOf` cases');
      it.todo('with `allOf` cases');
      it.todo('with `anyOf` cases');
    });
  });
});
