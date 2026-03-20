import type { HttpMethods, ResponseObject, SchemaObject } from '../../../src/types.js';

import petstoreSpec from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import readmeLegacySpec from '@readme/oas-examples/3.0/json/readme-legacy.json' with { type: 'json' };
import petstore3_1Spec from '@readme/oas-examples/3.1/json/petstore.json' with { type: 'json' };
import { validate } from '@readme/openapi-parser';
import { toBeValidJSONSchemas } from 'jest-expect-jsonschema';
import { beforeAll, describe, expect, it } from 'vitest';

import Oas from '../../../src/index.js';
import ablySpec from '../../__datasets__/ably.json' with { type: 'json' };
import circularSpec from '../../__datasets__/circular.json' with { type: 'json' };
import discriminatorAllOfInheritance from '../../__datasets__/discriminator-allof-inheritance.json' with { type: 'json' };
import invalidComponentSchemaNamesSpec from '../../__datasets__/invalid-component-schema-names.json' with { type: 'json' };
import petDiscriminatorAllOf from '../../__datasets__/pet-discriminator-allof.json' with { type: 'json' };
import responseEnumsSpec from '../../__datasets__/response-enums.json' with { type: 'json' };
import responsesSpec from '../../__datasets__/responses.json' with { type: 'json' };
import { createOasForOperation } from '../../__fixtures__/create-oas.js';

expect.extend({ toBeValidJSONSchemas });

describe('.getResponseAsJSONSchema()', () => {
  let circular: Oas;
  let petstore: Oas;
  let responses: Oas;

  beforeAll(async () => {
    petstore = Oas.init(structuredClone(petstoreSpec));
    circular = Oas.init(structuredClone(circularSpec));
    responses = Oas.init(structuredClone(responsesSpec));
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
        operation.getResponseAsJSONSchema('200');
      }).toThrow(
        '`.getResponseAsJSONSchema()` is not compatible with an operation or OpenAPI definition that has been run through `.dereference().`',
      );
    });
  });

  it('should return with null if there is not a response', () => {
    expect(createOasForOperation({ responses: {} }).operation('/', 'get').getResponseAsJSONSchema('200')).toBeNull();
  });

  it('should return with null if there is empty content', () => {
    const oas = createOasForOperation({
      responses: {
        200: {
          description: 'OK',
          content: {},
        },
      },
    });

    expect(oas.operation('/', 'get').getResponseAsJSONSchema('200')).toBeNull();
  });

  it('should return a response as JSON Schema', async () => {
    const operation = petstore.operation('/pet/{petId}/uploadImage', 'post');

    const schemas = operation.getResponseAsJSONSchema('200');

    expect(schemas).toStrictEqual([
      {
        label: 'Response body',
        description: 'successful operation',
        type: 'object',
        schema: {
          $schema: 'http://json-schema.org/draft-04/schema#',
          $ref: '#/components/schemas/ApiResponse',
          components: {
            schemas: {
              ApiResponse: {
                type: 'object',
                properties: {
                  code: { type: 'integer', format: 'int32' },
                  type: { type: 'string' },
                  message: { type: 'string' },
                },
                'x-readme-ref-name': 'ApiResponse',
              },
            },
          },
        },
      },
    ]);

    await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
  });

  describe('content type handling', () => {
    it.each([
      [
        'should return a schema when one is present with a JSON-compatible vendor-prefixed content type',
        '/vendor-prefix-content-type',
        'get',
      ],
      [
        'should prefer the JSON-compatible content type when multiple content types are present',
        '/multiple-responses-with-a-json-compatible',
        'get',
      ],
      [
        'should prefer the JSON-compatible content type when JSON and wildcard types are both present',
        '/multiple-responses-with-json-compatible-and-wildcard',
        'get',
      ],
      ['should return a JSON Schema object for a wildcard content type', '/wildcard-content-type', 'get'],
    ])('%s', async (_, path, method) => {
      const operation = responses.operation(path, method as HttpMethods);

      const schemas = operation.getResponseAsJSONSchema('200');

      expect(schemas).toStrictEqual([
        {
          label: 'Response body',
          description: 'OK',
          type: 'object',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            $ref: '#/components/schemas/simple-object',
            components: {
              schemas: {
                'simple-object': {
                  type: 'object',
                  properties: {
                    foo: { type: 'string' },
                    bar: { type: 'number' },
                  },
                  'x-readme-ref-name': 'simple-object',
                },
              },
            },
          },
        },
      ]);

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it("should return JSON Schema for a content type that isn't JSON-compatible", async () => {
      const oas = createOasForOperation({
        responses: {
          200: {
            description: 'response level description',
            content: {
              'image/png': {
                schema: { type: 'string' },
              },
            },
          },
        },
      });

      const operation = oas.operation('/', 'get');
      const schemas = operation.getResponseAsJSONSchema('200');

      expect(schemas).toStrictEqual([
        {
          label: 'Response body',
          description: 'response level description',
          type: 'string',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'string',
          },
        },
      ]);

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });
  });

  describe('contentType option', () => {
    it('should return the schema for the specified content-type when it exists', async () => {
      const operation = responses.operation('/multiple-responses-with-a-json-compatible', 'get');

      const schemas = operation.getResponseAsJSONSchema('200', { contentType: 'application/json' });

      // Request `application/json` specifically
      expect(schemas).toStrictEqual([
        {
          label: 'Response body',
          description: 'OK',
          type: 'object',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            $ref: '#/components/schemas/simple-object',
            components: {
              schemas: {
                'simple-object': {
                  type: 'object',
                  properties: {
                    foo: { type: 'string' },
                    bar: { type: 'number' },
                  },
                  'x-readme-ref-name': 'simple-object',
                },
              },
            },
          },
        },
      ]);

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should return the schema for a non-JSON content-type when specified', async () => {
      const operation = responses.operation('/multiple-responses-with-a-json-compatible', 'get');

      const schemas = operation.getResponseAsJSONSchema('200', { contentType: 'image/png' });

      // Request `image/png` specifically
      expect(schemas).toStrictEqual([
        {
          label: 'Response body',
          description: 'OK',
          type: 'string',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'string',
          },
        },
      ]);

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should return null when the specified content-type does not exist', () => {
      const operation = responses.operation('/multiple-responses-with-a-json-compatible', 'get');

      // Request a `content-type` that doesn't exist
      expect(operation.getResponseAsJSONSchema('200', { contentType: 'application/xml' })).toBeNull();
    });

    it('should return null when the specified content-type does not exist, even if other content-types are available', () => {
      const operation = responses.operation('/multiple-responses-with-json-compatible-and-wildcard', 'get');

      // Request a `content-type` that doesn't exist, even though `*/*`, `application/json`, and
      // `image/png` exist
      expect(operation.getResponseAsJSONSchema('200', { contentType: 'text/plain' })).toBeNull();
    });

    it('should return the schema for vendor-prefixed content-type when specified', async () => {
      const operation = responses.operation('/vendor-prefix-content-type', 'get');

      const schemas = operation.getResponseAsJSONSchema('200', { contentType: 'application/vnd.partytime+json' });

      expect(schemas).toStrictEqual([
        {
          label: 'Response body',
          description: 'OK',
          type: 'object',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            $ref: '#/components/schemas/simple-object',
            components: {
              schemas: {
                'simple-object': {
                  type: 'object',
                  properties: {
                    foo: { type: 'string' },
                    bar: { type: 'number' },
                  },
                  'x-readme-ref-name': 'simple-object',
                },
              },
            },
          },
        },
      ]);

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should return null for vendor-prefixed content-type when it does not exist', () => {
      const operation = responses.operation('/vendor-prefix-content-type', 'get');

      expect(operation.getResponseAsJSONSchema('200', { contentType: 'application/json' })).toBeNull();
    });

    it('should return the schema for wildcard content-type when specified', async () => {
      const operation = responses.operation('/multiple-responses-with-json-compatible-and-wildcard', 'get');

      const schemas = operation.getResponseAsJSONSchema('200', { contentType: '*/*' });
      expect(schemas).toStrictEqual([
        {
          label: 'Response body',
          description: 'OK',
          type: 'string',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'string',
          },
        },
      ]);

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should return the schema for XML content-type when specified', async () => {
      const operation = responses.operation('/vendored-xml-content-type-suffix', 'get');

      const schemas = operation.getResponseAsJSONSchema('200', { contentType: 'text/plain+xml' });
      expect(schemas).toStrictEqual([
        {
          label: 'Response body',
          description: 'OK',
          type: 'array',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      ]);

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should return null when contentType is specified but response has no content', () => {
      const oas = createOasForOperation({
        responses: {
          200: {
            description: 'OK',
            content: {},
          },
        },
      });

      expect(oas.operation('/', 'get').getResponseAsJSONSchema('200', { contentType: 'application/json' })).toBeNull();
    });
  });

  describe('`enum` handling', () => {
    it('should supplement response schema descriptions with enums', async () => {
      const spec = Oas.init(structuredClone(responseEnumsSpec));

      const operation = spec.operation('/anything', 'post');

      const schemas = operation.getResponseAsJSONSchema('200');

      expect(schemas).toStrictEqual([
        {
          label: 'Response body',
          description: 'OK',
          type: 'object',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            $ref: '#/components/schemas/enum-request',
            components: {
              schemas: {
                'enum-request': {
                  type: 'object',
                  properties: expect.objectContaining({
                    stock: { type: 'string' },
                    'description (markdown)': {
                      type: 'string',
                      description: 'This is a string with a **markdown** description: [link](ref:action-object)',
                    },
                    'enum (no description)': expect.objectContaining({
                      description: '`available` `pending` `sold`',
                    }),
                    'enum (with boolean values)': expect.objectContaining({
                      description: '`true` `false`',
                    }),
                    'enum (with default)': expect.objectContaining({
                      description: 'This enum has a `default` of `available`.\n\n`available` `pending` `sold`',
                    }),
                    'enum (with default + no description)': expect.objectContaining({
                      description: '`available` `pending` `sold`',
                    }),
                    'enum (with empty option)': expect.objectContaining({
                      description:
                        'This enum has a an empty string (`""`) as one of its available options.\n\n`available` `pending` `sold`',
                    }),
                    'enum (with empty option and empty default)': expect.objectContaining({
                      description:
                        'This enum has a an empty string (`""`) as its only available option, and that same value is set as its `default`.',
                    }),
                    'enum (with null value)': expect.objectContaining({
                      description: '`available` `pending` `sold` `null`',
                    }),
                    'enum (with value 0)': expect.objectContaining({
                      description: '`0` `1`',
                    }),
                    'enum (with value containing only a space)': expect.objectContaining({
                      description: '`available`',
                    }),
                  }),
                  'x-readme-ref-name': 'enum-request',
                },
              },
            },
          },
        },
      ]);

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });
  });

  describe('`headers` support', () => {
    // https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#response-object
    it('should include headers if they exist', async () => {
      const oas = createOasForOperation({
        responses: {
          200: {
            description: 'response level description',
            headers: {
              foo: {
                description: 'this is a description for the foo header',
                schema: { type: 'string' },
              },
              bar: {
                schema: { type: 'number' },
              },
            },
          },
        },
      });

      const schemas = oas.operation('/', 'get').getResponseAsJSONSchema('200');

      expect(schemas).toStrictEqual([
        {
          label: 'Headers',
          description: 'response level description',
          type: 'object',
          schema: {
            type: 'object',
            properties: {
              foo: {
                description: 'this is a description for the foo header',
                type: 'string',
              },
              bar: {
                type: 'number',
              },
            },
          },
        },
      ]);

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should retain referenced `$ref` pointers in the schema', async () => {
      const oas = createOasForOperation(
        {
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiResponse' },
                },
              },
              headers: {
                'X-Request-Id': {
                  description: 'Request correlation id',
                  schema: {
                    type: 'object',
                    properties: {
                      value: { $ref: '#/components/schemas/RequestId' },
                    },
                  },
                },
              },
            },
          },
        },
        {
          schemas: {
            ApiResponse: {
              type: 'object',
              properties: { ok: { type: 'boolean' } },
            },
            RequestId: {
              type: 'string',
              format: 'uuid',
              description: 'UUID',
            },
          },
        },
      );

      const schemas = oas.operation('/', 'get').getResponseAsJSONSchema('200');

      expect(schemas?.[1]).toHaveProperty('label', 'Headers');
      expect(schemas?.[1].schema.properties?.['X-Request-Id']).toStrictEqual({
        description: 'Request correlation id',
        type: 'object',
        properties: {
          value: {
            $ref: '#/components/schemas/RequestId',
          },
        },
      });

      expect(schemas?.[1].schema.components?.schemas).toStrictEqual({
        RequestId: {
          type: 'string',
          format: 'uuid',
          description: 'UUID',
          'x-readme-ref-name': 'RequestId',
        },
      });

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });
  });

  describe('$schema version', () => {
    it('should add the v4 schema version to OpenAPI 3.0.x schemas', async () => {
      const operation = petstore.operation('/pet/findByStatus', 'get');
      const schemas = operation.getResponseAsJSONSchema('200');

      expect(schemas?.[0].schema.$schema).toBe('http://json-schema.org/draft-04/schema#');
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should add v2020-12 schema version on OpenAPI 3.1 schemas', async () => {
      const petstore_31 = Oas.init(structuredClone(petstore3_1Spec));
      const operation = petstore_31.operation('/pet/findByStatus', 'get');

      const schemas = operation.getResponseAsJSONSchema('200');

      expect(schemas?.[0].schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema#');
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });
  });

  describe('quirks', () => {
    it('should not crash out when pulling a response that has no schema', async () => {
      const operation = responses.operation('/response-with-example-and-no-schema', 'get');
      const schemas = operation.getResponseAsJSONSchema('200');

      expect(schemas).toStrictEqual([
        {
          label: 'Response body',
          type: 'string',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
          },
        },
      ]);

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    describe('$ref quirks', () => {
      it("should retain $ref pointers in the schema even if they're circular", async () => {
        const operation = circular.operation('/', 'put');
        const schemas = operation.getResponseAsJSONSchema('200');

        expect(schemas).toMatchSnapshot();
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should default the root schema to a `string` if there is a circular `$ref` at the root', async () => {
        const operation = circular.operation('/', 'put');
        const schemas = operation.getResponseAsJSONSchema('201');

        expect(circular.api.components?.schemas?.ProductStock).not.toBeUndefined();
        expect(circular.api.components?.schemas?.SalesLine).not.toBeUndefined();

        expect(schemas).toStrictEqual([
          {
            label: 'Response body',
            description: 'OK',
            type: 'object',
            schema: {
              $schema: 'http://json-schema.org/draft-04/schema#',
              $ref: '#/components/schemas/SalesLine',
              components: {
                schemas: {
                  ProductStock: {
                    ...circular.api.components?.schemas?.ProductStock,
                    type: 'object', // `ProductStock` is missing a `type` property that we should have added.
                  },
                  SalesLine: circular.api.components?.schemas?.SalesLine,
                },
              },
            },
          },
        ]);

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should attach only used schemas as cloned components so mutations do not affect the original api definition', async () => {
        const operation = circular.operation('/', 'put');
        const schemas = operation.getResponseAsJSONSchema('200');

        // The response schema should include components (because circular $refs are present).
        expect(schemas?.[0].schema.components).toBeDefined();

        // The returned components must be a deep clone, not the same object reference.
        // Without cloning, a consumer that resolves $ref strings into actual object
        // references (e.g. a form renderer) would mutate the shared OAS components,
        // causing `JSON.stringify` crashes on subsequent operations.
        expect(schemas?.[0].schema.components).not.toBe(circular.api.components);
        expect(schemas?.[0].schema.components?.schemas).not.toBe(circular.api.components?.schemas);

        // Each individual schema should also be a distinct clone — this is the level
        // where mutation actually occurs (e.g. $ref strings replaced with object pointers).
        const returnedSchemas = schemas?.[0].schema.components?.schemas as Record<string, SchemaObject>;
        const originalSchemas = circular.api.components?.schemas as Record<string, SchemaObject>;

        expect(Object.keys(originalSchemas).length).toBeGreaterThan(0);

        for (const name of Object.keys(originalSchemas)) {
          expect(returnedSchemas[name]).not.toBe(originalSchemas[name]);
        }

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should not override object references', async () => {
        const oas = Oas.init(structuredClone(readmeLegacySpec));

        const operation = oas.operation('/api-specification', 'post');

        const schemas = operation.getResponseAsJSONSchema('401');

        expect(schemas?.[0].schema.oneOf).toStrictEqual([
          { $ref: '#/components/schemas/error_APIKEY_EMPTY' },
          { $ref: '#/components/schemas/error_APIKEY_NOTFOUND' },
        ]);

        expect(
          (schemas?.[0].schema.components?.schemas?.error_APIKEY_NOTFOUND as SchemaObject).properties?.docs,
        ).toStrictEqual({
          type: 'string',
          format: 'url',
          description: expect.stringContaining('log URL where you can see more information'),
          examples: ['https://docs.readme.com/logs/6883d0ee-cf79-447a-826f-a48f7d5bdf5f'],
        });

        const definition = oas.getDefinition();
        const authUnauthorizedResponse = definition.components?.responses?.authUnauthorized as ResponseObject;

        expect(authUnauthorizedResponse?.content?.['application/json']?.schema).toHaveProperty('oneOf', [
          { $ref: '#/components/schemas/error_APIKEY_EMPTY' },
          { $ref: '#/components/schemas/error_APIKEY_NOTFOUND' },
        ]);

        expect(definition.components?.schemas?.error_APIKEY_EMPTY).toStrictEqual({
          allOf: [
            { $ref: '#/components/schemas/baseError' },
            {
              type: 'object',
              properties: {
                error: {
                  default: 'APIKEY_EMPTY',
                  type: 'string',
                },
              },
            },
          ],
          'x-readme-ref-name': 'error_APIKEY_EMPTY',
        });

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();

        // The original API definition should still validate too!
        await expect(validate(definition)).resolves.toStrictEqual({
          specification: 'OpenAPI',
          valid: true,
          warnings: [],
        });
      });

      it('should be able to handle a schema with specification-invalid component names without erroring', async () => {
        const oas = Oas.init(structuredClone(invalidComponentSchemaNamesSpec));
        const operation = oas.operation('/pet', 'post');

        const schemas = operation.getResponseAsJSONSchema(200);

        expect(schemas).toStrictEqual([
          {
            label: 'Response body',
            description: 'successful operation',
            type: 'object',
            schema: {
              $schema: 'http://json-schema.org/draft-04/schema#',
              $ref: '#/components/schemas/Api%20Response',
              components: {
                schemas: {
                  'Api%20Response': {
                    type: 'object',
                    properties: expect.objectContaining({
                      code: {
                        format: 'int32',
                        type: 'integer',
                      },
                    }),
                    'x-readme-ref-name': 'Api Response',
                  },
                },
              },
            },
          },
        ]);

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should inline top-level property refs for allOf merges when refs are deeply nested', async () => {
        const oas = createOasForOperation(
          {
            responses: {
              200: {
                description: 'OK',
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
        const operation = oas.operation('/', 'get');
        const schemas = operation.getResponseAsJSONSchema('200');

        expect(schemas).toStrictEqual([
          {
            label: 'Response body',
            description: 'OK',
            type: 'object',
            schema: {
              $schema: 'http://json-schema.org/draft-04/schema#',
              type: 'object',
              properties: {
                middle: {
                  type: 'object',
                  'x-readme-ref-name': 'Middle',
                  properties: {
                    leaf: { $ref: '#/components/schemas/Leaf' },
                    stem: {
                      enum: ['red', 'green', 'blue'],
                      type: 'string',
                      description: expect.stringContaining('`red` `green` `blue`'),
                    },
                  },
                },
                name: { type: 'string' },
              },
              components: {
                schemas: {
                  Leaf: {
                    type: 'object',
                    'x-readme-ref-name': 'Leaf',
                    properties: {
                      value: { type: 'number' },
                    },
                  },
                },
              },
              'x-readme-ref-name': 'Base',
            },
          },
        ]);

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });
    });
  });

  describe('includeDiscriminatorMappingRefs', () => {
    it('should be able to support an operation that has discriminator mappings', async () => {
      const ably = Oas.init(structuredClone(ablySpec));
      const operation = ably.operation('/apps/{app_id}/rules', 'post');

      const schemas = operation.getResponseAsJSONSchema('201', {
        includeDiscriminatorMappingRefs: false,
      });

      expect(schemas).toStrictEqual([
        {
          description: 'Reactor rule created',
          label: 'Response body',
          type: 'string',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            $ref: '#/components/schemas/rule_response',
            components: {
              schemas: expect.objectContaining({
                rule_response: {
                  discriminator: {
                    mapping: {
                      amqp: '#/components/schemas/amqp_rule_response',
                      'amqp/external': '#/components/schemas/amqp_external_rule_response',
                      'aws/kinesis': '#/components/schemas/aws_kinesis_rule_response',
                      'aws/lambda': '#/components/schemas/aws_lambda_rule_response',
                      'aws/sqs': '#/components/schemas/aws_sqs_rule_response',
                      http: '#/components/schemas/http_rule_response',
                      'http/azure-function': '#/components/schemas/azure_function_rule_response',
                      'http/cloudflare-worker': '#/components/schemas/cloudflare_worker_rule_response',
                      'http/google-cloud-function': '#/components/schemas/google_cloud_function_rule_response',
                      'http/ifttt': '#/components/schemas/ifttt_rule_response',
                      'http/zapier': '#/components/schemas/zapier_rule_response',
                    },
                    propertyName: 'ruleType',
                  },
                  oneOf: expect.any(Array),
                  'x-readme-ref-name': 'rule_response',
                },
              }),
            },
          },
        },
      ]);

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });
  });

  describe('discriminator + allOf inheritance', () => {
    it('should build oneOf from schemas that extend a discriminator base via allOf', async () => {
      const spec = Oas.init(structuredClone(discriminatorAllOfInheritance));
      const operation = spec.operation('/pets', 'get');

      const schemas = operation.getResponseAsJSONSchema('200');
      expect(schemas).toHaveLength(1);

      expect(schemas?.[0].schema?.properties?.pets).toStrictEqual({
        type: 'array',
        items: {
          $ref: '#/components/schemas/Pet',
        },
      });

      // The `Pet` schema should now have `oneOf` with `Cat` and `Dog`, and the original `Pet`
      // schema should have remained unchanged.
      expect(spec.getDefinition().components?.schemas?.Pet).toStrictEqual({
        type: 'object',
        properties: {
          pet_type: {
            type: 'string',
          },
        },
        discriminator: {
          propertyName: 'pet_type',
        },
        'x-readme-ref-name': 'Pet',
      });

      expect(schemas?.[0].schema.components?.schemas?.Pet).toHaveProperty('oneOf', [
        { $ref: '#/components/schemas/Cat' },
        { $ref: '#/components/schemas/Dog' },
      ]);

      expect(schemas?.[0].schema.components?.schemas?.Cat?.properties).toHaveProperty('name');
      expect(schemas?.[0].schema.components?.schemas?.Cat?.properties).toHaveProperty('pet_type');

      expect(schemas?.[0].schema.components?.schemas?.Dog?.properties).toHaveProperty('bark');
      expect(schemas?.[0].schema.components?.schemas?.Dog?.properties).toHaveProperty('pet_type');

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should use discriminator mapping when explicitly defined', async () => {
      const spec = Oas.init(structuredClone(discriminatorAllOfInheritance));
      const operation = spec.operation('/pets-with-mapping', 'get');

      const schemas = operation.getResponseAsJSONSchema('200');

      // Should only have `MappedCat` and `MappedDog` from mapping, not `MappedBird`.
      expect(schemas?.[0].schema).toHaveProperty('$ref', '#/components/schemas/PetWithMapping');
      expect(schemas?.[0].schema.components?.schemas?.PetWithMapping?.oneOf).toStrictEqual([
        { $ref: '#/components/schemas/MappedCat' },
        { $ref: '#/components/schemas/MappedDog' },
      ]);

      expect(schemas?.[0].schema.components?.schemas).toHaveProperty('MappedCat');
      expect(schemas?.[0].schema.components?.schemas).toHaveProperty('MappedDog');
      expect(schemas?.[0].schema.components?.schemas).not.toHaveProperty('MappedBird');

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should not modify schemas that already have explicit oneOf', async () => {
      const spec = Oas.init(structuredClone(discriminatorAllOfInheritance));
      const operation = spec.operation('/pets-with-existing-oneof', 'get');

      const schemas = operation.getResponseAsJSONSchema('200');

      // Should only have `ExistingCat` and `ExistingDog` from original `oneOf`, not `ExistingBird`.
      expect(schemas?.[0].schema).toHaveProperty('$ref', '#/components/schemas/PetWithExistingOneOf');
      expect(schemas?.[0].schema.components?.schemas?.PetWithExistingOneOf?.oneOf).toStrictEqual([
        { $ref: '#/components/schemas/ExistingCat' },
        { $ref: '#/components/schemas/ExistingDog' },
      ]);

      expect(schemas?.[0].schema.components?.schemas).toHaveProperty('ExistingCat');
      expect(schemas?.[0].schema.components?.schemas).toHaveProperty('ExistingDog');
      expect(schemas?.[0].schema.components?.schemas).not.toHaveProperty('ExistingBird');

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });

    it('should build oneOf from user-provided spec with Cat, Dog, and Lizard', async () => {
      const spec = Oas.init(structuredClone(petDiscriminatorAllOf));
      const operation = spec.operation('/pets', 'get');

      const schemas = operation.getResponseAsJSONSchema('200');
      expect(schemas).toMatchSnapshot();
      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });
  });
});
