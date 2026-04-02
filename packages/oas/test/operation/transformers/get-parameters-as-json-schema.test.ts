import type { OperationObject, RequestBodyObject, SchemaObject } from '../../../src/types.js';

import parametersCommonSpec from '@readme/oas-examples/3.0/json/parameters-common.json' with { type: 'json' };
import petstoreSpec from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import petstore_31Spec from '@readme/oas-examples/3.1/json/petstore.json' with { type: 'json' };
import schemaTypesSpec from '@readme/oas-examples/3.1/json/schema-types.json' with { type: 'json' };
import { toBeValidJSONSchemas } from 'jest-expect-jsonschema';
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
import refDeeplyNestedPathPointer from '../../__datasets__/ref-deeply-nested-path-pointer.json' with { type: 'json' };
import refEndpointToEndpoint from '../../__datasets__/ref-endpoint-to-endpoint.json' with { type: 'json' };
import { createOasForOperation } from '../../__fixtures__/create-oas.js';

expect.extend({ toBeValidJSONSchemas });

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

  describe.each(['oas', 'operation'])('and we have dereferenced at the %s level', dereferencingLevel => {
    it('should throw an exception if used on a dereferenced definition', async () => {
      const oas = Oas.init(structuredClone(petstoreSpec));
      if (dereferencingLevel === 'oas') {
        await oas.dereference();
      }

      const operation = oas.operation('/pet/{petId}/uploadImage', 'post');
      if (dereferencingLevel === 'operation') {
        await operation.dereference();
      }

      expect(() => {
        operation.getParametersAsJSONSchema();
      }).toThrow(
        '`.getParametersAsJSONSchema()` is not compatible with an operation or OpenAPI definition that has been run through `.dereference().`',
      );
    });
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
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should add v2020-12 schema version on OpenAPI 3.1 schemas', async () => {
      const operation = petstore_31.operation('/pet', 'post');

      const schemas = operation.getParametersAsJSONSchema();

      expect(schemas?.[0].schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema#');
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
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

        expect(operation.getRequestBody('application/json')).toStrictEqual({
          schema: {
            // Sanity check to ensure that the schema we're processing has an `allOf` in it.
            allOf: [
              { $ref: '#/components/schemas/api.WithdrawalRequest' },
              {
                type: 'object',
                properties: {
                  token: {
                    allOf: [
                      {
                        $ref: '#/components/schemas/core.Token',
                      },
                      {
                        properties: {
                          data: {
                            $ref: '#/components/schemas/core.TokenData',
                          },
                        },
                        type: 'object',
                      },
                    ],
                  },
                },
              },
            ],
          },
        });

        const schemas = operation.getParametersAsJSONSchema();

        expect(schemas?.[0]?.schema?.properties).toStrictEqual({
          amount: expect.any(Object),
          token: expect.any(Object),
          user: expect.any(Object),
        });

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

        expect(schemas?.[0].schema.properties?.userId).toStrictEqual({
          type: 'string',
          description: 'Filter the data by userId',
        });

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
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

        expect(schemas?.[0].schema.properties?.userId).toStrictEqual({
          type: 'integer',
        });

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
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

        expect(schemas?.[0].schema.properties?.userId).toStrictEqual({
          type: 'integer',
        });
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
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

        expect(schemas?.[0].schema.properties?.userId).toStrictEqual({
          type: 'integer',
        });
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });
    });

    describe('common parameters', () => {
      it('should override path-level parameters on the operation level', async () => {
        const operation = parametersCommon.operation('/anything/{id}/override', 'get');
        const schemas = operation.getParametersAsJSONSchema();

        expect(schemas?.[0].schema.properties?.id).toHaveProperty('description', 'A comma-separated list of IDs');
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should add common parameter to path params', async () => {
        const operation = parametersCommon.operation('/anything/{id}', 'get');
        const schemas = operation.getParametersAsJSONSchema();

        expect(schemas?.[0].schema.properties?.id).toHaveProperty('description', 'ID parameter');
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
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

    it('should retain component schemas if the request body is a polymorphic circular $ref', async () => {
      const oas = Oas.init(structuredClone(polymorphismWithCircularRefSpec));
      const operation = oas.operation('/admin/search', 'post');

      const schemas = operation.getParametersAsJSONSchema();

      expect(schemas?.[0].schema?.properties).toStrictEqual({
        pageSize: expect.any(Object),
        pageOffset: expect.any(Object),
        searchQuery: expect.any(Object),
        filters: expect.any(Object),
        filterBinder: expect.any(Object),
        sortFields: expect.any(Object),
        returnedFieldNames: expect.any(Object),
        searchResultFields: {
          type: ['array', 'null'],
          description: expect.any(String),
          items: {
            // `SearchFieldModel` is a circular reference.
            $ref: '#/components/schemas/SearchFieldModel',
          },
        },
      });

      expect(schemas?.[0].schema.components?.schemas).toStrictEqual({
        SearchFieldModel: expect.any(Object),
        SearchFilter: expect.any(Object),
        SearchSort: expect.any(Object),
      });

      expect(schemas).toMatchSnapshot();

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should be able to handle non-standard component names like `x-definitions`', async () => {
      const oas = Oas.init(structuredClone(nonStandardComponentsSpec));
      const operation = oas.operation('/api/v5/schema/', 'post');

      const schemas = operation.getParametersAsJSONSchema();

      expect(schemas?.[0].schema).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        required: ['ext', 'fields', 'name', 'scope_id', 'status', 'type'],
        properties: expect.any(Object),
        components: {
          'x-definitions': expect.any(Object),
        },
      });

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should inline top-level property refs for allOf merges when refs are deeply nested', async () => {
      const oas = createOasForOperation(
        {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Base' },
                    {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          schemas: {
            Leaf: {
              type: 'object',
              properties: {
                value: { type: 'number' },
              },
            },
            Middle: {
              type: 'object',
              properties: {
                leaf: { $ref: '#/components/schemas/Leaf' },
                stem: {
                  type: 'string',
                  enum: ['red', 'green', 'blue'],
                },
              },
            },
            Base: {
              type: 'object',
              properties: {
                middle: { $ref: '#/components/schemas/Middle' },
              },
            },
          },
        },
      );

      const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();

      expect(schemas?.[0].schema).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: {
          middle: {
            type: 'object',
            properties: {
              leaf: { $ref: '#/components/schemas/Leaf' },
              stem: {
                enum: ['red', 'green', 'blue'],
                type: 'string',
              },
            },
            'x-readme-ref-name': 'Middle',
          },
          name: { type: 'string' },
        },
        components: {
          schemas: {
            Leaf: {
              type: 'object',
              properties: {
                value: { type: 'number' },
              },
              'x-readme-ref-name': 'Leaf',
            },
          },
        },
        'x-readme-ref-name': 'Base',
      });

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should be able to handle a schema with specification-invalid component names without erroring', async () => {
      const oas = Oas.init(structuredClone(invalidComponentSchemaNamesSpec));
      const operation = oas.operation('/pet', 'post');

      const schemas = operation.getParametersAsJSONSchema();

      // `POST /pet` has a root-level `$ref` pointer to `#/components/requestBodies/pet%20payload`
      // but we were able to safely follow that to its resolved `schemas/Pet` state for the schema
      // here.
      expect(schemas?.[0].schema).toStrictEqual({
        $ref: '#/components/schemas/Pet',
        $schema: 'http://json-schema.org/draft-04/schema#',
        components: {
          schemas: expect.objectContaining({
            Pet: {
              properties: expect.objectContaining({
                name: {
                  examples: ['doggie'],
                  type: 'string',
                },
              }),
              required: ['name', 'photoUrls'],
              type: 'object',
              'x-readme-ref-name': 'Pet',
            },
          }),
        },
      });

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should retain component schemas when the same is used in a parameter and request body', async () => {
      const oas = createOasForOperation(
        {
          parameters: [
            {
              name: 'status',
              in: 'path',
              required: true,
              schema: {
                $ref: '#/components/schemas/StatusEnum',
              },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      $ref: '#/components/schemas/StatusEnum',
                    },
                  },
                },
              },
            },
          },
        },
        {
          schemas: {
            StatusEnum: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
            },
          },
        },
      );

      const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();

      expect(schemas).toHaveLength(2);
      expect(schemas?.[0].schema).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: { status: { $ref: '#/components/schemas/StatusEnum' } },
        required: ['status'],
        components: {
          schemas: {
            StatusEnum: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
              'x-readme-ref-name': 'StatusEnum',
            },
          },
        },
      });

      expect(schemas?.[1].schema).toStrictEqual({
        properties: { status: { $ref: '#/components/schemas/StatusEnum' } },
        type: 'object',
        $schema: 'http://json-schema.org/draft-04/schema#',
        components: {
          schemas: {
            StatusEnum: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
              'x-readme-ref-name': 'StatusEnum',
            },
          },
        },
      });

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should retain a deeply nested self-referential and encoded path schema', async () => {
      const oas = Oas.init(refDeeplyNestedPathPointer);
      const operation = oas.operation('/v1/reseller/program/create', 'post');

      const schemas = operation.getParametersAsJSONSchema();

      expect(schemas?.[0].schema).toStrictEqual({
        $schema: 'https://json-schema.org/draft/2020-12/schema#',
        type: 'object',
        properties: {
          'Query Params': {
            type: 'object',
            oneOf: expect.any(Array),
          },
        },
        required: ['Query Params'],
        components: {
          schemas: {
            StartDescription: expect.any(Object),
            EndDescription: expect.any(Object),
            ProgramName: expect.any(Object),
          },
        },
        paths: {
          '/v1/reseller/program/create': {
            post: {
              parameters: {
                0: {
                  schema: {
                    oneOf: {
                      '0': {
                        properties: {
                          business_id: {
                            type: 'string',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should support `$ref` pointers pointing to the response of another operation', async () => {
      const oas = Oas.init(refEndpointToEndpoint);
      let operation = oas.operation('/endpoint1', 'get');

      const expectedResponseSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
      };

      const responseSchemas = operation.getResponseAsJSONSchema('200');
      expect(responseSchemas?.[0].schema).toStrictEqual({
        $schema: 'https://json-schema.org/draft/2020-12/schema#',
        ...expectedResponseSchema,
      });

      await expect(responseSchemas?.map(s => s.schema)).toBeValidJSONSchemas();

      operation = oas.operation('/endpoint2', 'post');
      const schemas = operation.getParametersAsJSONSchema();

      expect(schemas?.[0].schema).toStrictEqual({
        $schema: 'https://json-schema.org/draft/2020-12/schema#',
        $ref: '#/paths/~1endpoint1/get/responses/200/content/application~1json/schema',
        paths: {
          '/endpoint1': {
            get: {
              responses: {
                '200': {
                  content: {
                    'application/json': {
                      schema: expectedResponseSchema,
                    },
                  },
                },
              },
            },
          },
        },
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

      expect(schemas?.[0].schema).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: {
          account_id: {
            type: 'string',
            description: 'The account ID of the account in which to create the application.',
          },
        },
        required: ['account_id'],
      });

      expect(schemas?.[1].schema).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
        $ref: '#/components/schemas/app_post',
        components: {
          schemas: {
            app_post: {
              additionalProperties: false,
              properties: expect.any(Object),
              required: ['name'],
              type: 'object',
              'x-readme-ref-name': 'app_post',
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

          const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();

          expect(schemas?.[0].schema.components?.schemas?.messages.type).toBe('object');
          expect(schemas?.[0].schema.components?.schemas?.user.type).toBe('object');
          await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
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
      expect(schemas).toStrictEqual([
        {
          label: 'Headers',
          type: 'header',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'object',
            properties: {
              Accept: {
                description: 'Expected response format.',
                type: 'string',
              },
            },
          },
        },
      ]);
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
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
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });
  });

  describe('required', () => {
    it.todo('should pass through `required` on parameters');

    it('should make things required correctly for request bodies', async () => {
      const operation = polymorphismQuirks.operation('/allof-with-oneOf', 'post');

      const schemas = operation.getParametersAsJSONSchema();

      expect(schemas?.[0].schema).toHaveProperty('$ref', '#/components/schemas/QuoteCreationRequest');
      expect(schemas?.[0].schema.components?.schemas?.QuoteCreationRequest.oneOf?.[0]).toHaveProperty('required', [
        'sourceCurrencyCode',
        'destinationCurrencyCode',
        'quoteType',
      ]);
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });
  });

  describe('`example` / `examples` support', () => {
    describe('parameters', () => {
      it.each([['example'], ['examples']])(
        'should pick up `%s` if declared outside of the schema',
        async exampleProp => {
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

          expect(schemas).toStrictEqual([
            {
              type: 'query',
              label: 'Query Params',
              schema: {
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
              },
            },
          ]);

          await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
        },
      );
    });
  });

  describe('deprecated', () => {
    describe('parameters', () => {
      it('should pass through deprecated on parameters', async () => {
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

        expect(schemas).toStrictEqual([
          {
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
          },
        ]);
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
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

        expect(schemas?.[0]?.schema).toStrictEqual({
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

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });
    });

    describe('request bodies', () => {
      it('should pass through deprecated on a request body schema property', async () => {
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

        expect(schemas).toStrictEqual([
          {
            type: 'body',
            label: 'Body Params',
            schema: {
              $schema: 'http://json-schema.org/draft-04/schema#',
              type: 'object',
              properties: {
                uri: { type: 'string', format: 'uri' },
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
        ]);

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });
    });

    describe('polymorphism', () => {
      it('should pass through deprecated on a (merged) allOf schema', async () => {
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

        const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();

        expect(schemas).toMatchSnapshot();
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should be able to merge enums within an allOf schema', async () => {
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

        const schemas = oas.operation('/', 'get').getParametersAsJSONSchema();
        expect(schemas).toMatchSnapshot();
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should intersect enums when a child allOf narrows a parent enum', async () => {
        const oas = Oas.init({
          openapi: '3.0.3',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/': {
              post: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/PetSelector' },
                    },
                  },
                },
                responses: { 200: { description: 'OK' } },
              },
            },
          },
          components: {
            schemas: {
              Pet: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['cat', 'dog', 'bird', 'fish'] },
                },
                required: ['type'],
              },
              PetSelector: {
                anyOf: [{ $ref: '#/components/schemas/Foo' }, { $ref: '#/components/schemas/Bar' }],
                discriminator: { propertyName: 'type' },
              },
              Foo: {
                allOf: [
                  { $ref: '#/components/schemas/Pet' },
                  { type: 'object', properties: { type: { type: 'string', enum: ['cat'] }, name: { type: 'string' } } },
                ],
              },
              Bar: {
                allOf: [
                  { $ref: '#/components/schemas/Pet' },
                  {
                    type: 'object',
                    properties: { type: { type: 'string', enum: ['dog'] }, breed: { type: 'string' } },
                  },
                ],
              },
            },
          },
        });

        const schemas = oas.operation('/', 'post').getParametersAsJSONSchema();
        const bodySchema = schemas?.find(s => s.type === 'body');
        const foo = bodySchema?.schema?.components?.schemas?.Foo;
        const bar = bodySchema?.schema?.components?.schemas?.Bar;

        expect((foo?.properties?.type as SchemaObject)?.enum).toStrictEqual(['cat']);
        expect((bar?.properties?.type as SchemaObject)?.enum).toStrictEqual(['dog']);
      });

      it('should inherit the full parent enum when a child allOf does not redefine it', async () => {
        const oas = Oas.init({
          openapi: '3.0.3',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/': {
              post: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Bar' },
                    },
                  },
                },
                responses: { 200: { description: 'OK' } },
              },
            },
          },
          components: {
            schemas: {
              Foo: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
                },
              },
              Bar: {
                allOf: [
                  { $ref: '#/components/schemas/Foo' },
                  { type: 'object', properties: { extra: { type: 'string' } } },
                ],
              },
            },
          },
        });

        const schemas = oas.operation('/', 'post').getParametersAsJSONSchema();
        const bodySchema = schemas?.find(s => s.type === 'body');
        const bar = bodySchema?.schema?.components?.schemas?.Bar;

        expect((bar?.properties?.status as SchemaObject)?.enum).toStrictEqual(['active', 'inactive', 'pending']);
        expect(bar?.properties?.extra).toBeDefined();
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

        // The original `Category` schema doesn't have any defaults.
        expect(operation.api.components?.schemas?.Category).toHaveProperty('properties', {
          id: { type: 'integer', format: 'int64' },
          name: { type: 'string' },
        });

        const schemas = operation.getParametersAsJSONSchema({ globalDefaults: jwtDefaults });

        expect(schemas?.[0].schema.components?.schemas?.Category).toStrictEqual({
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
          'x-readme-ref-name': 'Category',
        });

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should use user defined `globalDefaults` for parameters', async () => {
        const operation = petstore.operation('/pet/{petId}', 'get');
        const jwtDefaults = {
          petId: 1,
        };

        const schemas = operation.getParametersAsJSONSchema({ globalDefaults: jwtDefaults });

        expect(schemas?.[0].schema.properties?.petId).toHaveProperty('default', jwtDefaults.petId);
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
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

    describe('hideReadOnlyProperties', () => {
      it('should hide readOnly properties from the generated schema', async () => {
        const operation = readOnlyWriteOnly.operation('/readOnly', 'post');

        const schemas = operation.getParametersAsJSONSchema({ hideReadOnlyProperties: true });
        expect(schemas?.[0].schema).toStrictEqual({
          $schema: 'https://json-schema.org/draft/2020-12/schema#',
          $ref: '#/components/schemas/readOnly',
          components: {
            schemas: {
              readOnly: {
                // This is an empty object now because all of its `readOnly` properties are hidden.
              },
            },
          },
        });
      });

      it('should still surface regular properties if there are readOnly properties present', async () => {
        const operation = readOnlyWriteOnly.operation('/readOnly', 'put');

        const schemas = operation.getParametersAsJSONSchema({ hideReadOnlyProperties: true });
        expect(schemas).toStrictEqual([
          {
            type: 'body',
            label: 'Body Params',
            schema: {
              $schema: 'https://json-schema.org/draft/2020-12/schema#',
              $ref: '#/components/schemas/readOnly-partially',
              components: {
                schemas: {
                  'readOnly-partially': {
                    type: 'object',
                    properties: { id: { type: 'string' } },
                    'x-readme-ref-name': 'readOnly-partially',
                  },
                },
              },
            },
          },
        ]);
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should not delete schemas that are without any `type` or otherwise already empty', async () => {
        const oas = Oas.init(structuredClone(schemaTypesSpec));
        const operation = oas.operation('/anything/quirks', 'post');

        const schemas = operation.getParametersAsJSONSchema({
          hideReadOnlyProperties: true,
        });

        expect(schemas?.[0].schema.properties).toHaveProperty('missing type (on completely empty schema)');
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });
    });

    describe('hideWriteOnlyProperties', () => {
      it('should hide writeOnly properties from the generated schema', async () => {
        const operation = readOnlyWriteOnly.operation('/writeOnly', 'post');

        const schemas = operation.getParametersAsJSONSchema({ hideWriteOnlyProperties: true });
        expect(schemas?.[0].schema).toStrictEqual({
          $schema: 'https://json-schema.org/draft/2020-12/schema#',
          $ref: '#/components/schemas/writeOnly',
          components: {
            schemas: {
              writeOnly: {
                // This is an empty object now because all of its `readOnly` properties are hidden.
              },
            },
          },
        });
      });

      it('should still surface regular properties if there are writeOnly properties present', async () => {
        const operation = readOnlyWriteOnly.operation('/writeOnly', 'put');

        const schemas = operation.getParametersAsJSONSchema({ hideWriteOnlyProperties: true });
        expect(schemas).toStrictEqual([
          {
            type: 'body',
            label: 'Body Params',
            schema: {
              $schema: 'https://json-schema.org/draft/2020-12/schema#',
              $ref: '#/components/schemas/writeOnly-partially',
              components: {
                schemas: {
                  'writeOnly-partially': {
                    type: 'object',
                    properties: { id: { type: 'string' } },
                    'x-readme-ref-name': 'writeOnly-partially',
                  },
                },
              },
            },
          },
        ]);
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
          oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
          components: {
            schemas: {
              Cat: {
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
                'x-readme-ref-name': 'Cat',
              },
              Dog: {
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
                'x-readme-ref-name': 'Dog',
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
          oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
          components: {
            schemas: {
              Cat: {
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
                'x-readme-ref-name': 'Cat',
              },
              Dog: {
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
                'x-readme-ref-name': 'Dog',
              },
            },
          },
        });

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should strip inherited oneOf and discriminator from children to prevent nested discriminator UIs', async () => {
        // When children extend a base with a discriminator via allOf, they inherit the base's
        // oneOf and discriminator. These should be stripped to prevent nested discriminator UIs.
        const oas = Oas.init(structuredClone(intentionalNestedDiscriminatorSpec));
        const operation = oas.operation('/intentional-nested-polymorphism', 'patch');

        const schemas = operation.getParametersAsJSONSchema();

        // Parent `oneOf` has a `discriminator`, children should NOT have nested `oneOf` or
        // `discriminator`.
        expect(schemas?.[0].schema).toStrictEqual({
          $schema: 'http://json-schema.org/draft-04/schema#',
          discriminator: {
            propertyName: 'kind',
          },
          oneOf: [{ $ref: '#/components/schemas/ChildA' }, { $ref: '#/components/schemas/ChildB' }],
          components: {
            schemas: {
              ChildA: {
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
              ChildB: {
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
            },
          },
        });

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });
    });
  });
});
