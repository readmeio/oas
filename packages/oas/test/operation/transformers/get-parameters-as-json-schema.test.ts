import type { OperationObject, RequestBodyObject, SchemaObject } from '../../../src/types.js';

import parametersCommonSpec from '@readme/oas-examples/3.0/json/parameters-common.json' with { type: 'json' };
import petstoreSpec from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import petstore_31Spec from '@readme/oas-examples/3.1/json/petstore.json' with { type: 'json' };
import schemaTypesSpec from '@readme/oas-examples/3.1/json/schema-types.json' with { type: 'json' };
import { toBeValidJSONSchema, toBeValidJSONSchemas } from 'jest-expect-jsonschema';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PARAMETER_ORDERING } from '../../../src/extensions.js';
import Oas from '../../../src/index.js';
import ablySpec from '../../__datasets__/ably.json' with { type: 'json' };
import circularSpec from '../../__datasets__/circular.json' with { type: 'json' };
import discriminatorsSpec from '../../__datasets__/discriminators.json' with { type: 'json' };
import embeddedDiscriminatorSpec from '../../__datasets__/embeded-discriminator.json' with { type: 'json' };
import intentionalNestedDiscriminatorSpec from '../../__datasets__/intentional-nested-discriminator.json' with { type: 'json' };
import invalidComponentSchemaNamesSpec from '../../__datasets__/invalid-component-schema-names.json' with { type: 'json' };
import nonStandardComponentsSpec from '../../__datasets__/non-standard-components.json' with { type: 'json' };
import petstoreServerVarsSpec from '../../__datasets__/petstore-server-vars.json' with { type: 'json' };
import polymorphismQuirksSpec from '../../__datasets__/polymorphism-quirks.json' with { type: 'json' };
import polymorphismWithCircularRefSpec from '../../__datasets__/polymorphism-with-circular-ref.json' with { type: 'json' };
import readOnlyWriteOnlySpec from '../../__datasets__/readonly-writeonly.json' with { type: 'json' };
import { createOasForOperation } from '../../__fixtures__/create-oas.js';

expect.extend({ toBeValidJSONSchema, toBeValidJSONSchemas });

describe('.getParametersAsJSONSchema()', () => {
  let ably: Oas;
  let circular: Oas;
  let discriminators: Oas;
  let embeddedDiscriminator: Oas;
  let parametersCommon: Oas;
  let petstore: Oas;
  let petstore_31: Oas;
  let petstoreServerVars: Oas;
  let polymorphismQuirks: Oas;
  let readOnlyWriteOnly: Oas;

  beforeAll(() => {
    ably = Oas.init(structuredClone(ablySpec));
    circular = Oas.init(structuredClone(circularSpec));
    discriminators = Oas.init(structuredClone(discriminatorsSpec));
    embeddedDiscriminator = Oas.init(structuredClone(embeddedDiscriminatorSpec));
    parametersCommon = Oas.init(structuredClone(parametersCommonSpec));
    petstore = Oas.init(structuredClone(petstoreSpec));
    petstore_31 = Oas.init(structuredClone(petstore_31Spec));
    petstoreServerVars = Oas.init(structuredClone(petstoreServerVarsSpec));
    polymorphismQuirks = Oas.init(structuredClone(polymorphismQuirksSpec));
    readOnlyWriteOnly = Oas.init(structuredClone(readOnlyWriteOnlySpec));
  });

  it('should return with null if there are no parameters', () => {
    expect(createOasForOperation({ parameters: [] }).operation('/', 'get').getParametersAsJSONSchema()).toBeNull();
    expect(createOasForOperation({}).operation('/', 'get').getParametersAsJSONSchema()).toBeNull();
  });

  describe('type sorting', () => {
    let operation: OperationObject;

    beforeEach(() => {
      operation = {
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
    });

    it('should return with a json schema for each parameter type (formData instead of body)', async () => {
      (operation.requestBody as RequestBodyObject).content = {
        'application/x-www-form-urlencoded': {
          schema: {
            type: 'object',
            properties: { a: { type: 'string' } },
          },
        },
      };

      const oas = createOasForOperation(operation);
      const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();

      expect(schemas).toMatchSnapshot();
      expect(schemas?.map(js => js.type)).toStrictEqual(['path', 'query', 'cookie', 'formData', 'header']);
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should return with a json schema for each parameter type (body instead of formData)', async () => {
      (operation.requestBody as RequestBodyObject).content = {
        'application/json': {
          schema: {
            type: 'object',
            properties: { a: { type: 'string' } },
          },
        },
      };

      const oas = createOasForOperation(operation);
      const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();

      expect(schemas).toMatchSnapshot();
      expect(schemas?.map(js => js.type)).toStrictEqual(['path', 'query', 'body', 'cookie', 'header']);
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should support a custom ordering with the `x-readme.parameter-ordering` extension', async () => {
      const custom = structuredClone(operation);
      custom['x-readme'] = {
        [PARAMETER_ORDERING]: ['path', 'header', 'cookie', 'query', 'body', 'form'],
      };

      const oas = createOasForOperation(custom);
      const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();

      expect(schemas?.map(js => js.type)).toStrictEqual(['path', 'header', 'cookie', 'query']);
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });
  });

  describe('$schema version', () => {
    it('should add the v4 schema version to OpenAPI 3.0.x schemas', async () => {
      const operation = petstore.operation('/pet', 'post');
      const schemas = operation.getParametersAsJSONSchema();

      expect(schemas?.[0].schema.$schema).toBe('http://json-schema.org/draft-04/schema#');
      await expect(schemas?.[0].schema).toBeValidJSONSchema();
    });

    it('should add v2020-12 schema version on OpenAPI 3.1 schemas', async () => {
      const operation = petstore_31.operation('/pet', 'post');
      const schemas = operation.getParametersAsJSONSchema();

      expect(schemas?.[0].schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema#');
      await expect(schemas?.[0].schema).toBeValidJSONSchema();
    });
  });

  describe('parameters', () => {
    it('should convert parameters to JSON schema', async () => {
      const operation = petstore.operation('/pet/{petId}', 'delete');
      const schemas = operation.getParametersAsJSONSchema();

      expect(schemas).toMatchSnapshot();
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    describe('polymorphism', () => {
      it('should merge allOf schemas together', async () => {
        const operation = polymorphismQuirks.operation('/allof-with-empty-object-property', 'post');
        const schemas = operation.getParametersAsJSONSchema();

        expect(schemas).toMatchSnapshot();
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });
    });

    describe('`content` support', () => {
      it('should support `content` on parameters', async () => {
        const oas = createOasForOperation({
          parameters: [
            {
              name: 'userId',
              description: 'Filter the data by userId',
              in: 'query',
              content: { 'application/json': { schema: { type: 'string' } } },
            },
          ],
        });

        const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();

        expect(schemas?.[0].schema.properties?.userId).toStrictEqual({
          type: 'string',
          description: 'Filter the data by userId',
        });
      });

      it('should prioritize `application/json` if present', async () => {
        const oas = createOasForOperation({
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

        const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();

        expect(schemas?.[0].schema.properties?.userId).toStrictEqual({
          type: 'integer',
        });
      });

      it("should prioritize JSON-like content types if they're present", async () => {
        const oas = createOasForOperation({
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

        const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();

        expect(schemas?.[0].schema.properties?.userId).toStrictEqual({
          type: 'integer',
        });
      });

      it('should use the first content type if `application/json` is not present', async () => {
        const oas = createOasForOperation({
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

        const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();

        expect(schemas?.[0].schema.properties?.userId).toStrictEqual({
          type: 'integer',
        });
      });
    });

    describe('common parameters', () => {
      it('should override path-level parameters on the operation level', async () => {
        const operation = parametersCommon.operation('/anything/{id}/override', 'get');
        const schemas = operation.getParametersAsJSONSchema();

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
        expect((schemas?.[0].schema.properties?.id as SchemaObject).description).toBe('A comma-separated list of IDs');
      });

      it('should add common parameter to path params', async () => {
        const operation = parametersCommon.operation('/anything/{id}', 'get');
        const schemas = operation.getParametersAsJSONSchema();

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
        expect((schemas?.[0].schema.properties?.id as SchemaObject).description).toBe('ID parameter');
      });
    });
  });

  describe('request bodies', () => {
    describe('should convert request bodies to JSON schema', () => {
      it('application/json', async () => {
        const operation = petstore.operation('/pet', 'post');
        const schemas = operation.getParametersAsJSONSchema();

        expect(schemas).toMatchSnapshot();
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('application/x-www-form-urlencoded', async () => {
        const operation = petstoreServerVars.operation('/pet/{petId}', 'post');
        const schemas = operation.getParametersAsJSONSchema();

        expect(schemas).toMatchSnapshot();
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });
    });

    it('should not return anything for an empty schema', () => {
      const oas = createOasForOperation({
        requestBody: {
          description: 'Body description',
          content: {
            'application/json': {
              schema: {},
            },
          },
        },
      });

      const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();
      expect(schemas).toHaveLength(0);
    });

    it('should not return anything for a requestBody that has no schema', () => {
      const oas = createOasForOperation({
        requestBody: {
          description: 'Body description',
          content: {
            'text/plain': {
              example: '',
            },
          },
        },
      });

      const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();
      expect(schemas).toHaveLength(0);
    });
  });

  describe('$ref quirks', () => {
    it("should retain $ref pointers in the schema even if they're circular", async () => {
      const operation = circular.operation('/', 'put');
      const schemas = operation.getParametersAsJSONSchema();

      expect(schemas).toMatchSnapshot();
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should add $refs to `components` when the request body is a polymorphic circular $ref', async () => {
      const oas = Oas.init(structuredClone(polymorphismWithCircularRefSpec));
      const operation = oas.operation('/admin/search', 'post');
      const schemas = operation.getParametersAsJSONSchema();

      expect(schemas?.[0].schema).toMatchObject({
        type: 'object',
        additionalProperties: false,
        properties: {
          pageSize: {
            type: 'integer',
            description: 'The size of the page (the number of items returned for this page)',
            format: 'int32',
          },
        },
      });

      // `SearchFieldModel` is the circular reference here.
      expect(Object.keys(schemas?.[0].schema.components?.schemas || {})).toStrictEqual([
        'SearchFilterOperators',
        'SearchFilter',
        'SearchConditionBinders',
        'SearchSortTypes',
        'SearchSort',
        'SearchFieldModel',
        'SearchModel',
      ]);

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should be able to handle non-standard component names like `x-definitions`', async () => {
      const oas = Oas.init(structuredClone(nonStandardComponentsSpec));
      const operation = oas.operation('/api/v5/schema/', 'post');

      const schemas = operation.getParametersAsJSONSchema();

      expect(schemas).toHaveLength(1);
      expect(schemas?.[0].schema).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        required: ['ext', 'fields', 'name', 'scope_id', 'status', 'type'],
        properties: expect.any(Object),
        components: {
          // `x-definitions` should have been transformed to `schemas`
          schemas: {
            conditionCascadingValue: expect.any(Object),
            conditionFieldDependency: expect.any(Object),
          },
        },
      });

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should be able to handle a schema with specification-invalid component names without erroring', async () => {
      const oas = Oas.init(structuredClone(invalidComponentSchemaNamesSpec));
      const operation = oas.operation('/pet', 'post');

      const schemas = operation.getParametersAsJSONSchema();

      expect(schemas).toHaveLength(1);
      expect(schemas?.[0].schema).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
        $ref: '#/components/schemas/Pet',
        'x-readme-ref-name': 'Pet',
        components: expect.objectContaining({
          schemas: expect.objectContaining({
            Pet: expect.objectContaining({
              properties: expect.objectContaining({
                name: expect.objectContaining({
                  examples: ['doggie'],
                  type: 'string',
                }),
              }),
              required: ['name', 'photoUrls'],
              type: 'object',
            }),
          }),
        }),
      });

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });
  });

  describe('polymorphism / discriminators', () => {
    it('should retain discriminator `mapping` refs when present', async () => {
      const operation = discriminators.operation('/anything/discriminator-with-mapping', 'patch');
      const schemas = operation.getParametersAsJSONSchema();

      expect(schemas).toMatchSnapshot();
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should support a discriminator at the root of a requestBody', async () => {
      const operation = ably.operation('/accounts/{account_id}/apps', 'post');
      const schemas = operation.getParametersAsJSONSchema();

      expect(schemas).toHaveLength(2);
      expect(schemas?.[0]).toStrictEqual({
        type: 'path',
        label: 'Path Params',
        schema: {
          $schema: 'http://json-schema.org/draft-04/schema#',
          type: 'object',
          properties: expect.any(Object),
          required: ['account_id'],
        },
      });

      expect(schemas?.[1]).toStrictEqual({
        type: 'body',
        label: 'Body Params',
        schema: {
          $schema: 'http://json-schema.org/draft-04/schema#',
          $ref: '#/components/schemas/app_post',
          'x-readme-ref-name': 'app_post',
          components: {
            schemas: {
              app_post: {
                additionalProperties: false,
                properties: expect.any(Object),
                required: ['name'],
                type: 'object',
              },
            },
          },
        },
      });

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });
  });

  describe('type', () => {
    describe('request bodies', () => {
      describe('repair invalid schema that has no `type`', () => {
        it('should add a missing `type: object` on a schema that is clearly an object', async () => {
          const oas = createOasForOperation(
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
            },
          );

          // `$ref` pointers are resolved into definitions without dereferencing the API.
          const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();
          await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();

          expect(schemas?.[0].schema.components?.schemas?.messages?.type).toBe('object');
          expect(schemas?.[0].schema.components?.schemas?.user?.type).toBe('object');
        });
      });
    });
  });

  describe('descriptions', () => {
    it.todo('should pass through description on requestBody');

    it('should pass through description on parameters', async () => {
      const oas = createOasForOperation({
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

      const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();

      expect(schemas).toHaveLength(1);
      expect(schemas?.[0].schema).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: {
          Accept: {
            description: 'Expected response format.',
            type: 'string',
          },
        },
      });
    });

    it('should pass through description on parameter when referenced as a `$ref` and a `requestBody` is present', async () => {
      const oas = createOasForOperation(
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
        },
      );

      const operation = oas.operation('/', 'get');

      const schemas = operation.getParametersAsJSONSchema();
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();

      expect(schemas?.[0].schema).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
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

    it('should make things required correctly for request bodies', async () => {
      const operation = polymorphismQuirks.operation('/allof-with-oneOf', 'post');

      const schemas = operation.getParametersAsJSONSchema();
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();

      expect(schemas?.[0].schema).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
        $ref: '#/components/schemas/QuoteCreationRequest',
        'x-readme-ref-name': 'QuoteCreationRequest',
        components: {
          schemas: expect.objectContaining({
            QuoteCreationRequest: expect.any(Object),
          }),
        },
      });

      expect(schemas?.[0].schema.components?.schemas?.QuoteCreationRequest.oneOf?.[0]).toHaveProperty('required', [
        'sourceCurrencyCode',
        'destinationCurrencyCode',
        'quoteType',
      ]);
    });
  });

  describe('`example` / `examples` support', () => {
    describe('parameters', () => {
      it.each([['example'], ['examples']] as const)(
        'should pick up `%s` if declared outside of the schema',
        async exampleProp => {
          function createExample(value: string, inSchema = false) {
            if (exampleProp === 'example') return value;
            if (inSchema) return [value];

            return {
              distinctName: {
                value,
              },
            };
          }

          const oas = createOasForOperation({
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

          const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();
          await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();

          expect(schemas).toHaveLength(1);
          expect(schemas?.[0].schema).toStrictEqual({
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'object',
            properties: {
              'query parameter': {
                type: 'string',
                examples: ['example foo'],
              },
              'query parameter alt': {
                type: 'string',
                examples: ['example bar'],
              },
            },
          });
        },
      );
    });
  });

  describe('deprecated', () => {
    describe('parameters', () => {
      it('should pass through `deprecated` on parameters', async () => {
        const oas = createOasForOperation({
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

        const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();

        expect(schemas).toHaveLength(1);
        expect(schemas?.[0]).toStrictEqual({
          label: 'Headers',
          type: 'header',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'object',
            properties: {
              Accept: {
                type: 'string',
                deprecated: true,
              },
            },
          },
        });
      });

      it('should pass through deprecated on parameter when referenced as a `$ref` and a `requestBody` is present', async () => {
        const oas = createOasForOperation(
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
          },
        );

        const operation = oas.operation('/', 'get');
        const schemas = operation.getParametersAsJSONSchema();
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();

        const pathGroup = schemas?.find(s => s.type === 'path');
        expect(pathGroup?.schema).toStrictEqual({
          $schema: 'http://json-schema.org/draft-04/schema#',
          type: 'object',
          properties: {
            pathId: {
              type: 'integer',
              format: 'uint32',
              deprecated: true,
            },
          },
        });
      });
    });

    describe('request bodies', () => {
      it.skip('should pass through deprecated on a request body schema property', async () => {
        const oas = createOasForOperation({
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

        const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();

        expect(schemas).toStrictEqual([
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
      it.skip('should pass through deprecated on a (merged) allOf schema', () => {
        const oas = createOasForOperation({
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

      it.skip('should be able to merge enums within an allOf schema', () => {
        const oas = createOasForOperation({
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    events: {
                      type: 'array',
                      minItems: 1,
                      uniqueItems: true,
                      items: {
                        allOf: [
                          {
                            type: 'string',
                            enum: ['one', 'two', 'three'],
                          },
                          {
                            type: 'string',
                            enum: ['four', 'five', 'six'],
                          },
                        ],
                      },
                    },
                  },
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
      it('should use user defined `globalDefaults` for requestBody', async () => {
        const operation = petstore.operation('/pet', 'post');

        const jwtDefaults = {
          category: {
            id: 4,
            name: 'Testing',
          },
        };

        const schemas = operation.getParametersAsJSONSchema({ globalDefaults: jwtDefaults });
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();

        expect(schemas?.[0].schema?.components?.schemas?.Category).toStrictEqual({
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              format: 'int64',
              default: 4,
            },
            name: {
              type: 'string',
              default: 'Testing',
            },
          },
        });
      });

      it('should use user defined `globalDefaults` for parameters', async () => {
        const operation = petstore.operation('/pet/{petId}', 'get');
        const jwtDefaults = {
          petId: 1,
        };

        const schemas = operation.getParametersAsJSONSchema({ globalDefaults: jwtDefaults });
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();

        expect(schemas?.[0].schema.properties?.petId).toHaveProperty('default', jwtDefaults.petId);
      });
    });

    describe('mergeIntoBodyAndMetadata', () => {
      it('should merge params categorized as metadata into a single block', async () => {
        const operation = petstore.operation('/pet/{petId}', 'delete');
        const schemas = operation.getParametersAsJSONSchema({
          mergeIntoBodyAndMetadata: true,
        });

        expect(schemas).toMatchSnapshot();
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should not create an empty `allOf` for metadata if there is no metadata', async () => {
        const operation = petstore.operation('/user', 'post');
        const schemas = operation.getParametersAsJSONSchema({
          mergeIntoBodyAndMetadata: true,
        });

        expect(schemas?.map(js => js.type)).toStrictEqual(['body']);
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });
    });

    describe('transformer', () => {
      it('should be able transform part of a schema', async () => {
        const oas = createOasForOperation({
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

        const schemas = oas.operation('/', 'get').getParametersAsJSONSchema({
          transformer: schema => {
            if (schema.title) {
              if (/^\d/.test(schema.title)) {
                schema.title = schema.title.toUpperCase();
              }
            }

            return schema;
          },
        });

        expect(schemas?.[0].schema.oneOf).toStrictEqual([
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

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should be able to transform a schema into a non-object', () => {
        const operation = petstore.operation('/pet', 'post');

        const schemas = operation.getParametersAsJSONSchema({
          transformer: schema => {
            if ('x-readme-ref-name' in schema) {
              return schema['x-readme-ref-name'] as SchemaObject;
            }

            return schema;
          },
        });

        expect(schemas).toStrictEqual([
          {
            description: 'Pet object that needs to be added to the store',
            label: 'Body Params',
            schema: 'Pet', // We transformed our schema into the name of the `$ref`.
            type: 'body',
          },
        ]);
      });

      describe('with the `includeDiscriminatorMappingRefs` option', () => {
        it('should be able to support an operation that has discriminator mappings', async () => {
          const operation = ably.operation('/accounts/{account_id}/apps', 'post');

          const schemas = operation.getParametersAsJSONSchema({
            includeDiscriminatorMappingRefs: false,
            transformer: schema => {
              if ('x-readme-ref-name' in schema) {
                return schema['x-readme-ref-name'] as SchemaObject;
              }

              return schema;
            },
          });

          expect(schemas).toHaveLength(2);
          expect(schemas?.[0]).toMatchObject({
            type: 'path',
            label: 'Path Params',
            schema: {
              type: 'object',
              properties: {
                account_id: {
                  type: 'string',
                  description: 'The account ID of the account in which to create the application.',
                },
              },
              required: ['account_id'],
            },
          });

          expect(schemas?.[1]).toStrictEqual({
            type: 'body',
            label: 'Body Params',
            schema: 'app_post',
          });
        });
      });
    });

    describe('hideReadOnlyProperties', () => {
      it('should hide readOnly properties from the generated schema', () => {
        const operation = readOnlyWriteOnly.operation('/readOnly', 'post');

        const schemas = operation.getParametersAsJSONSchema({ hideReadOnlyProperties: true });
        expect(schemas).toHaveLength(0);

        const schemasWithROProps = operation.getParametersAsJSONSchema({ hideReadOnlyProperties: false });
        expect(schemasWithROProps).toStrictEqual([
          {
            type: 'body',
            label: 'Body Params',
            schema: {
              $schema: 'https://json-schema.org/draft/2020-12/schema#',
              $ref: '#/components/schemas/readOnly',
              'x-readme-ref-name': 'readOnly',
              components: expect.any(Object),
            },
          },
        ]);
      });

      it('should still surface regular properties if there are readOnly properties present', async () => {
        const operation = readOnlyWriteOnly.operation('/readOnly', 'put');

        const schemas = operation.getParametersAsJSONSchema({ hideReadOnlyProperties: true });

        expect(schemas).toHaveLength(1);
        expect(schemas?.[0]).toStrictEqual({
          type: 'body',
          label: 'Body Params',
          schema: {
            $schema: 'https://json-schema.org/draft/2020-12/schema#',
            $ref: '#/components/schemas/readOnly-partially',
            'x-readme-ref-name': 'readOnly-partially',
            components: {
              schemas: {
                'readOnly-partially': {
                  type: 'object',
                  properties: {
                    // `product_id` is `readOnly` and should be missing from this schema.
                    id: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        });

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should not delete schemas that are without any `type` or otherwise already empty', async () => {
        const oas = Oas.init(structuredClone(schemaTypesSpec));
        const operation = oas.operation('/anything/quirks', 'post');

        const schemas = operation.getParametersAsJSONSchema({
          hideReadOnlyProperties: true,
        });

        expect(schemas?.[0].schema.properties).toHaveProperty('missing type (on completely empty schema)', {
          // This schema is completely empty and effectively equates to `additionalProperties: true`.
        });

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });
    });

    describe('hideWriteOnlyProperties', () => {
      it('should hide writeOnly properties from the generated schema', () => {
        const operation = readOnlyWriteOnly.operation('/writeOnly', 'post');

        const schemas = operation.getParametersAsJSONSchema({ hideWriteOnlyProperties: true });
        expect(schemas).toStrictEqual([]);

        const schemasWithRWProps = operation.getParametersAsJSONSchema({ hideWriteOnlyProperties: false });
        expect(schemasWithRWProps).toStrictEqual([
          {
            type: 'body',
            label: 'Body Params',
            schema: {
              $schema: 'https://json-schema.org/draft/2020-12/schema#',
              $ref: '#/components/schemas/writeOnly',
              'x-readme-ref-name': 'writeOnly',
              components: expect.any(Object),
            },
          },
        ]);
      });

      it('should still surface regular properties if there are writeOnly properties present', async () => {
        const operation = readOnlyWriteOnly.operation('/writeOnly', 'put');

        const schemas = operation.getParametersAsJSONSchema({ hideWriteOnlyProperties: true });
        expect(schemas).toHaveLength(1);
        expect(schemas?.[0]).toStrictEqual({
          type: 'body',
          label: 'Body Params',
          schema: {
            $schema: 'https://json-schema.org/draft/2020-12/schema#',
            $ref: '#/components/schemas/writeOnly-partially',
            'x-readme-ref-name': 'writeOnly-partially',
            components: expect.any(Object),
          },
        });

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });
    });

    describe('embedded discriminator with allOf', () => {
      it('should not create nested oneOf structures when processing embedded discriminators', async () => {
        const operation = embeddedDiscriminator.operation('/embedded-discriminator', 'patch');

        const schemas = operation.getParametersAsJSONSchema();
        const bodySchema = schemas?.find(s => s.type === 'body');
        expect(bodySchema).toBeDefined();

        const schema = bodySchema?.schema as SchemaObject;
        expect(schema.oneOf).toBeDefined();
        expect(Array.isArray(schema.oneOf)).toBe(true);
        expect(schema.oneOf).toHaveLength(2);

        expect(schema).toStrictEqual({
          $schema: 'https://json-schema.org/draft/2020-12/schema#',
          oneOf: [
            {
              $ref: '#/components/schemas/Cat',
              'x-readme-ref-name': 'Cat',
            },
            {
              $ref: '#/components/schemas/Dog',
              'x-readme-ref-name': 'Dog',
            },
          ],
          components: {
            schemas: {
              Pet: {
                type: 'object',
                required: ['pet_type'],
                discriminator: {
                  propertyName: 'pet_type',
                },
                properties: {
                  pet_type: {
                    type: 'string',
                    description: 'The type of pet',
                  },
                },
              },
              Cat: {
                type: 'object',
                'x-readme-ref-name': 'Cat',
                required: ['pet_type'],
                discriminator: {
                  propertyName: 'pet_type',
                },
                properties: {
                  pet_type: {
                    type: 'string',
                    description: 'The type of pet',
                  },
                  hunts: {
                    type: 'boolean',
                    description: 'Whether the cat hunts',
                  },
                  age: {
                    type: 'integer',
                    description: 'Age of the cat in years',
                    minimum: 0,
                  },
                  meow: {
                    type: 'string',
                    description: "The cat's meow sound",
                    default: 'Meow',
                  },
                },
              },
              Dog: {
                type: 'object',
                'x-readme-ref-name': 'Dog',
                required: ['pet_type'],
                discriminator: {
                  propertyName: 'pet_type',
                },
                properties: {
                  pet_type: {
                    type: 'string',
                    description: 'The type of pet',
                  },
                  bark: {
                    type: 'boolean',
                    description: 'Whether the dog barks',
                  },
                  breed: {
                    type: 'string',
                    enum: ['Dingo', 'Husky', 'Retriever', 'Shepherd'],
                    description: 'Breed of the dog',
                  },
                  woof: {
                    type: 'string',
                    description: "The dog's bark sound",
                    default: 'Woof',
                  },
                },
              },
            },
          },
        });

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should not create nested oneOf structures when processing embedded discriminators in webhooks', async () => {
        const operation = embeddedDiscriminator.operation('newPet', 'post', { isWebhook: true });

        const schemas = operation.getParametersAsJSONSchema();
        const bodySchema = schemas?.find(s => s.type === 'body');
        expect(bodySchema).toBeDefined();

        const schema = bodySchema?.schema as SchemaObject;
        expect(schema.oneOf).toBeDefined();
        expect(Array.isArray(schema.oneOf)).toBe(true);
        expect(schema.oneOf).toHaveLength(2);

        expect(schema).toStrictEqual({
          $schema: 'https://json-schema.org/draft/2020-12/schema#',
          oneOf: [
            {
              $ref: '#/components/schemas/Cat',
              'x-readme-ref-name': 'Cat',
            },
            {
              $ref: '#/components/schemas/Dog',
              'x-readme-ref-name': 'Dog',
            },
          ],
          components: {
            schemas: {
              Pet: {
                type: 'object',
                required: ['pet_type'],
                discriminator: {
                  propertyName: 'pet_type',
                },
                properties: {
                  pet_type: {
                    type: 'string',
                    description: 'The type of pet',
                  },
                },
              },
              Cat: {
                type: 'object',
                'x-readme-ref-name': 'Cat',
                required: ['pet_type'],
                discriminator: {
                  propertyName: 'pet_type',
                },
                properties: {
                  pet_type: {
                    type: 'string',
                    description: 'The type of pet',
                  },
                  hunts: {
                    type: 'boolean',
                    description: 'Whether the cat hunts',
                  },
                  age: {
                    type: 'integer',
                    description: 'Age of the cat in years',
                    minimum: 0,
                  },
                  meow: {
                    type: 'string',
                    description: "The cat's meow sound",
                    default: 'Meow',
                  },
                },
              },
              Dog: {
                type: 'object',
                'x-readme-ref-name': 'Dog',
                required: ['pet_type'],
                discriminator: {
                  propertyName: 'pet_type',
                },
                properties: {
                  pet_type: {
                    type: 'string',
                    description: 'The type of pet',
                  },
                  bark: {
                    type: 'boolean',
                    description: 'Whether the dog barks',
                  },
                  breed: {
                    type: 'string',
                    enum: ['Dingo', 'Husky', 'Retriever', 'Shepherd'],
                    description: 'Breed of the dog',
                  },
                  woof: {
                    type: 'string',
                    description: "The dog's bark sound",
                    default: 'Woof',
                  },
                },
              },
            },
          },
        });

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it.skip('should strip inherited oneOf and discriminator from children to prevent nested discriminator UIs', () => {
        // When children extend a base with a discriminator via allOf, they inherit the base's
        // oneOf and discriminator. These should be stripped to prevent nested discriminator UIs.
        const oas = Oas.init(structuredClone(intentionalNestedDiscriminatorSpec));
        const operation = oas.operation('/intentional-nested-polymorphism', 'patch');

        const jsonSchema = operation.getParametersAsJSONSchema();

        const bodySchema = jsonSchema?.find(s => s.type === 'body');
        expect(bodySchema).toBeDefined();

        const schema = bodySchema?.schema as SchemaObject;
        // Extract only the schema properties we care about (exclude components if present)
        // const { components: _, ...schemaToTest } = schema;

        // Parent oneOf has a discriminator, children should NOT have nested oneOf or discriminator
        expect(schema).toStrictEqual({
          $schema: 'http://json-schema.org/draft-04/schema#',
          discriminator: {
            propertyName: 'kind',
          },
          oneOf: [
            {
              'x-readme-ref-name': 'ChildA',
              type: 'object',
              required: ['kind'],
              properties: {
                kind: {
                  type: 'string',
                  description: 'Discriminator',
                },
                foo: {
                  type: 'string',
                },
              },
            },
            {
              'x-readme-ref-name': 'ChildB',
              type: 'object',
              required: ['kind'],
              properties: {
                kind: {
                  type: 'string',
                  description: 'Discriminator',
                },
                bar: {
                  type: 'integer',
                },
              },
            },
          ],
          components: {
            schemas: {
              // Base: {},
            },
          },
        });
      });
    });
  });
});
