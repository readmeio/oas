const parametersToJsonSchema = require('../../src/lib/parameters-to-json-schema');

const fixtures = require('../__fixtures__/lib/json-schema');

const polymorphismScenarios = ['oneOf', 'allOf', 'anyOf'];

const schemaDraftVersion = {
  $schema: 'http://json-schema.org/draft-04/schema#',
};

test('it should return with null if there are no parameters', async () => {
  expect(await parametersToJsonSchema({ parameters: [] })).toBeNull();
  expect(await parametersToJsonSchema({})).toBeNull();
});

describe('parameters', () => {
  describe('type sorting', () => {
    const schema = {
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

    it('should return with a json schema for each parameter type (formData instead of body)', async () => {
      schema.requestBody.content = {
        'application/x-www-form-urlencoded': {
          schema: {
            type: 'object',
            properties: { a: { type: 'string' } },
          },
        },
      };

      const jsonschema = await parametersToJsonSchema(schema, {});

      expect(jsonschema).toMatchSnapshot();
      expect(
        jsonschema.map(js => {
          return js.type;
        })
      ).toStrictEqual(['path', 'query', 'cookie', 'formData', 'header']);
    });

    it('should return with a json schema for each parameter type (body instead of formData)', async () => {
      schema.requestBody.content = {
        'application/json': {
          schema: {
            type: 'object',
            properties: { a: { type: 'string' } },
          },
        },
      };

      const jsonschema = await parametersToJsonSchema(schema, {});

      expect(jsonschema).toMatchSnapshot();
      expect(
        jsonschema.map(js => {
          return js.type;
        })
      ).toStrictEqual(['path', 'query', 'body', 'cookie', 'header']);
    });
  });

  describe('$ref support', () => {
    it('should fetch $ref parameters', async () => {
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
        (
          await parametersToJsonSchema(
            {
              parameters: [
                {
                  $ref: '#/components/parameters/Param',
                },
              ],
            },
            oas
          )
        )[0].schema.properties.param
      ).toStrictEqual({
        ...oas.components.parameters.Param.schema,
        ...schemaDraftVersion,
      });
    });

    it('should fetch parameters that have a child $ref', async () => {
      const oas = {
        components: {
          schemas: {
            string_enum: {
              enum: ['available', 'pending', 'sold'],
              type: 'string',
            },
          },
        },
      };

      expect(
        (
          await parametersToJsonSchema(
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
          )
        )[0].schema.properties.param.items
      ).toStrictEqual({
        // The `name` property from `#/components/schemas/string_enum` shouldn't be here because it's not valid in the case
        // of a parameter.
        enum: ['available', 'pending', 'sold'],
        type: 'string',
      });
    });

    it("should ignore a ref if it's empty", async () => {
      expect(
        (
          await parametersToJsonSchema(
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
          )
        )[0].schema.properties
      ).toStrictEqual({
        param: {
          type: 'string',
          ...schemaDraftVersion,
        },
      });
    });
  });

  it('should pass through type for non-body parameters', async () => {
    expect(
      (
        await parametersToJsonSchema({
          parameters: [
            {
              in: 'query',
              name: 'checkbox',
              schema: {
                type: 'boolean',
              },
            },
          ],
        })
      )[0].schema.properties.checkbox.type
    ).toBe('boolean');
  });

  it('should pass through type for non-body parameters that are arrays', async () => {
    expect(
      (
        await parametersToJsonSchema({
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
        })
      )[0].schema.properties.options.type
    ).toBe('array');
  });

  it('should override path-level parameters on the operation level', async () => {
    const oas = {
      paths: {
        '/pet/{petId}': {
          parameters: [
            {
              name: 'petId',
              in: 'path',
              description: 'ID of pet to return',
              schema: {
                type: 'integer',
              },
              required: true,
            },
          ],
        },
      },
    };

    expect(
      (
        await parametersToJsonSchema(
          {
            parameters: [
              {
                name: 'petId',
                in: 'path',
                description: 'A comma-separated list of pet IDs',
                schema: {
                  type: 'integer',
                },
                required: true,
              },
            ],
          },
          oas
        )
      )[0].schema.properties.petId.description
    ).toBe('A comma-separated list of pet IDs');
  });

  it('should add common parameter to path params', async () => {
    const oas = {
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
        },
      },
    };

    expect(
      (
        await parametersToJsonSchema({
          path: '/pet/{petId}',
          oas,
        })
      )[0].schema.properties.petId.description
    ).toBe(oas.paths['/pet/{petId}'].parameters[0].description);
  });
});

describe('request bodies', () => {
  it('should work for request body inline (json)', async () => {
    expect(
      await parametersToJsonSchema(
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
          ...schemaDraftVersion,
          type: 'object',
          properties: {
            a: { type: 'string' },
          },
        },
      },
    ]);
  });

  it('should work for request body inline (formData)', async () => {
    expect(
      await parametersToJsonSchema(
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
          ...schemaDraftVersion,
          type: 'object',
          properties: {
            a: { type: 'string' },
          },
        },
      },
    ]);
  });

  it('should not return anything for an empty schema', async () => {
    expect(
      await parametersToJsonSchema(
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

  describe('$ref support', () => {
    it('should pull out schemas from `#/components/requestBodies`', async () => {
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
        await parametersToJsonSchema(
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
            ...schemaDraftVersion,
            ...oas.components.schemas.Pet,
            components: {
              ...schemaDraftVersion,
              ...oas.components,
            },
          },
        },
      ]);
    });
  });
});

describe('type', () => {
  describe('parameters', () => {
    it('should repair a malformed array that is missing items [README-8E]', async () => {
      const parameters = [
        {
          name: 'param',
          in: 'query',
          schema: {
            type: 'array',
          },
        },
      ];

      expect((await parametersToJsonSchema({ parameters }))[0].schema).toStrictEqual({
        properties: {
          param: {
            ...schemaDraftVersion,
            items: {},
            type: 'array',
          },
        },
        required: [],
        type: 'object',
      });
    });
  });

  describe('request bodies', () => {
    it('should repair a malformed array that is missing items [README-8E]', async () => {
      const oas = {
        components: {
          schemas: {
            updatePets: {
              type: 'array',
            },
          },
        },
      };

      const schema = await parametersToJsonSchema(
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
  });
});

describe('enums', () => {
  it.todo('should pass through enum on requestBody');

  it('should pass through enum on parameters', async () => {
    expect(
      await parametersToJsonSchema({
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
              ...schemaDraftVersion,
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

  it('should pass through format on parameters', async () => {
    expect(
      (
        await parametersToJsonSchema({
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
        })
      )[0].schema.properties.checkbox.format
    ).toBe('int32');
  });
});

describe('descriptions', () => {
  it.todo('should pass through description on requestBody');

  it('should pass through description on parameters', async () => {
    expect(
      await parametersToJsonSchema({
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
              ...schemaDraftVersion,
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

    it('when set to `true`', async () => {
      parameters[0].schema.items.additionalProperties = true;

      expect((await parametersToJsonSchema({ parameters }))[0].schema.properties.param.items).toStrictEqual({
        additionalProperties: true,
        type: 'object',
      });
    });

    it('when set to an empty object', async () => {
      parameters[0].schema.items.additionalProperties = {};

      expect((await parametersToJsonSchema({ parameters }))[0].schema.properties.param.items).toStrictEqual({
        additionalProperties: {},
        type: 'object',
      });
    });

    it('when set to an object', async () => {
      parameters[0].schema.items.additionalProperties = {
        type: 'string',
      };

      expect((await parametersToJsonSchema({ parameters }))[0].schema.properties.param.items).toStrictEqual({
        additionalProperties: {
          type: 'string',
        },
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

    it('when set to `true`', async () => {
      requestBody.content['application/json'].schema.items.additionalProperties = true;
      expect((await parametersToJsonSchema({ requestBody }, {}))[0].schema.items).toStrictEqual({
        additionalProperties: true,
        type: 'object',
      });
    });

    it('when set to an empty object', async () => {
      requestBody.content['application/json'].schema.items.additionalProperties = {};
      expect((await parametersToJsonSchema({ requestBody }, {}))[0].schema.items).toStrictEqual({
        additionalProperties: {},
        type: 'object',
      });
    });

    it('when set to an object', async () => {
      requestBody.content['application/json'].schema.items.additionalProperties = {
        type: 'string',
      };

      expect((await parametersToJsonSchema({ requestBody }, {}))[0].schema.items).toStrictEqual({
        additionalProperties: {
          type: 'string',
        },
        type: 'object',
      });
    });
  });
});

describe('defaults', () => {
  it('should not attempt to recur on `null` data', async () => {
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

    expect(await parametersToJsonSchema(oas.paths['/{id}'].post, oas)).toMatchSnapshot();
  });

  describe('parameters', () => {
    describe('should pass through defaults', () => {
      it('should pass a default of `false`', async () => {
        const { parameters } = fixtures.generateParameterDefaults('simple', { default: false });
        expect(await parametersToJsonSchema({ parameters })).toMatchSnapshot();
      });

      it('with normal non-$ref, non-inheritance, non-polymorphism cases', async () => {
        const { parameters } = fixtures.generateParameterDefaults('simple', { default: 'example default' });
        expect(await parametersToJsonSchema({ parameters })).toMatchSnapshot();
      });

      it('with simple usages of `$ref`', async () => {
        const { parameters, oas } = fixtures.generateParameterDefaults('$ref', { default: 'example default' });
        expect(await parametersToJsonSchema({ parameters }, oas)).toMatchSnapshot();
      });

      it.todo('with usages of `oneOf` cases');

      it.todo('with usages of `allOf` cases');

      it.todo('with usages of `anyOf` cases');
    });

    // @todo rework this logic to just test that allowemptyvalue gets passed through
    describe('should comply with the `allowEmptyValue` declarative when present', () => {
      it('with normal non-$ref, non-inheritance, non-polymorphism cases', async () => {
        const { parameters } = fixtures.generateParameterDefaults('simple', { default: '', allowEmptyValue: true });
        expect(await parametersToJsonSchema({ parameters })).toMatchSnapshot();
      });

      it('with simple usages of `$ref`', async () => {
        const { parameters, oas } = fixtures.generateParameterDefaults('$ref', { default: '', allowEmptyValue: true });
        expect(await parametersToJsonSchema({ parameters }, oas)).toMatchSnapshot();
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

      it.each(schemaScenarios)('should pass a default of `false` [scenario: %s]', async scenario => {
        const { requestBody, oas } = fixtures.generateRequestBodyDefaults('simple', scenario, { default: false });
        expect(await parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
      });

      it.each(schemaScenarios)(
        'with normal non-$ref, non-inheritance, non-polymorphism cases [scenario: %s]',
        async scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults('simple', scenario, fixtureOptions);
          expect(await parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
        }
      );

      it.each(schemaScenarios)('with simple usages of `$ref`` [scenario: %s]', async scenario => {
        const { requestBody, oas } = fixtures.generateRequestBodyDefaults('$ref', scenario, fixtureOptions);
        expect(await parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
      });

      describe.each(polymorphismScenarios)('with usages of `%s`', refType => {
        it.each(schemaScenarios)(`scenario: %s`, async scenario => {
          const { requestBody, oas } = fixtures.generateRequestBodyDefaults(refType, scenario, fixtureOptions);
          expect(await parametersToJsonSchema({ requestBody }, oas)).toMatchSnapshot();
        });
      });
    });
  });
});
