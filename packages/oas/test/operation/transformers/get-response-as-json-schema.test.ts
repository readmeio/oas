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
    await operation.dereference();

    const schemas = operation.getResponseAsJSONSchema('200');

    expect(schemas).toStrictEqual([
      {
        label: 'Response body',
        description: 'successful operation',
        type: 'object',
        schema: {
          $schema: 'http://json-schema.org/draft-04/schema#',
          type: 'object',
          properties: {
            code: { type: 'integer', format: 'int32' },
            type: { type: 'string' },
            message: { type: 'string' },
          },
          'x-readme-ref-name': 'ApiResponse',
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
      await operation.dereference();

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
              foo: { type: 'string' },
              bar: { type: 'number' },
            },
            'x-readme-ref-name': 'simple-object',
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
      await operation.dereference();

      const schemas = operation.getResponseAsJSONSchema('200', { contentType: 'application/json' });

      // Request `application/json` specifically
      expect(schemas).toStrictEqual([
        {
          label: 'Response body',
          description: 'OK',
          type: 'object',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'object',
            properties: {
              foo: { type: 'string' },
              bar: { type: 'number' },
            },
            'x-readme-ref-name': 'simple-object',
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
      await operation.dereference();

      const schemas = operation.getResponseAsJSONSchema('200', { contentType: 'application/vnd.partytime+json' });

      expect(schemas).toStrictEqual([
        {
          label: 'Response body',
          description: 'OK',
          type: 'object',
          schema: {
            type: 'object',
            properties: {
              foo: { type: 'string' },
              bar: { type: 'number' },
            },
            'x-readme-ref-name': 'simple-object',
            $schema: 'http://json-schema.org/draft-04/schema#',
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
      await operation.dereference();

      const schemas = operation.getResponseAsJSONSchema('200');

      expect(schemas).toStrictEqual([
        {
          label: 'Response body',
          description: 'OK',
          type: 'object',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
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
      await operation.dereference();

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

        expect(schemas).toStrictEqual([
          {
            label: 'Response body',
            description: 'OK',
            type: 'string',
            schema: {
              $ref: '#/components/schemas/SalesLine',
              $schema: 'http://json-schema.org/draft-04/schema#',
              components: circular.api.components,
            },
          },
        ]);
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should clone components so mutations to the response schema do not affect the original api definition', async () => {
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
        await operation.dereference();

        const schemas = operation.getResponseAsJSONSchema('401');

        expect((schemas?.[0].schema.oneOf?.[1] as SchemaObject).properties?.docs).toStrictEqual({
          type: 'string',
          format: 'url',
          description: expect.stringContaining('log URL where you can see more information'),
          examples: ['https://docs.readme.com/logs/6883d0ee-cf79-447a-826f-a48f7d5bdf5f'],
        });

        const definition = oas.getDefinition();
        const authUnauthorizedResponse = definition.components?.responses?.authUnauthorized as ResponseObject;

        expect(
          (
            (
              (authUnauthorizedResponse?.content?.['application/json']?.schema as SchemaObject)
                ?.oneOf?.[0] as SchemaObject
            )?.allOf?.[0] as SchemaObject
          ).properties?.docs,
        ).toStrictEqual({
          type: 'string',
          format: 'url',
          description: expect.stringContaining('log URL where you can see more information'),
          // The original spec should have **not** been updated to the `examples` format that we
          // reshape this to in `getResponseAsJsonSchema`.
          example: 'https://docs.readme.com/logs/6883d0ee-cf79-447a-826f-a48f7d5bdf5f',
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
        await operation.dereference();

        const schemas = operation.getResponseAsJSONSchema(200);

        expect(schemas).toStrictEqual([
          {
            description: 'successful operation',
            label: 'Response body',
            type: 'object',
            schema: {
              $schema: 'http://json-schema.org/draft-04/schema#',
              properties: expect.objectContaining({
                code: {
                  format: 'int32',
                  type: 'integer',
                },
              }),
              type: 'object',
              'x-readme-ref-name': 'Api Response',
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
      await operation.dereference();

      const schemas = operation.getResponseAsJSONSchema('201', {
        includeDiscriminatorMappingRefs: false,
      });

      expect(schemas).toStrictEqual([
        {
          type: 'string',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
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
          label: 'Response body',
          description: 'Reactor rule created',
        },
      ]);

      await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
    });
  });

  describe('discriminator + allOf inheritance', () => {
    describe.each([
      'oas',
      'operation',
      // 'no-dereferencing' /** @todo re-enable when we support this without dereferncing */
    ] as const)('and we are dereferencing at the `%s` level', dereferencingLevel => {
      it('should build oneOf from schemas that extend a discriminator base via allOf', async () => {
        const spec = Oas.init(structuredClone(discriminatorAllOfInheritance));
        if (dereferencingLevel === 'oas') {
          await spec.dereference();
        }

        const operation = spec.operation('/pets', 'get');
        if (dereferencingLevel === 'operation') {
          await operation.dereference();
        }

        const schemas = operation.getResponseAsJSONSchema('200');
        expect(schemas).toHaveLength(1);

        const responseSchema = schemas?.[0].schema;
        const itemsSchema = (responseSchema?.properties?.pets as any).items;

        // The Pet schema should now have oneOf with Cat and Dog
        expect(itemsSchema).toHaveProperty('oneOf');
        expect(itemsSchema.oneOf).toHaveLength(2);

        const oneOfSchemas = itemsSchema.oneOf;
        const catSchema = oneOfSchemas.find((s: SchemaObject) => s['x-readme-ref-name'] === 'Cat');
        const dogSchema = oneOfSchemas.find((s: SchemaObject) => s['x-readme-ref-name'] === 'Dog');

        expect(catSchema).toBeDefined();
        expect(catSchema.properties).toHaveProperty('name');
        expect(catSchema.properties).toHaveProperty('pet_type');

        expect(dogSchema).toBeDefined();
        expect(dogSchema.properties).toHaveProperty('bark');
        expect(dogSchema.properties).toHaveProperty('pet_type');

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should use discriminator mapping when explicitly defined', async () => {
        const spec = Oas.init(structuredClone(discriminatorAllOfInheritance));
        if (dereferencingLevel === 'oas') {
          await spec.dereference();
        }

        const operation = spec.operation('/pets-with-mapping', 'get');
        if (dereferencingLevel === 'operation') {
          await operation.dereference();
        }

        const schemas = operation.getResponseAsJSONSchema('200');

        const responseSchema = schemas?.[0].schema;

        // Should only have MappedCat and MappedDog from mapping, not MappedBird
        expect(responseSchema?.oneOf).toHaveLength(2);

        const refNames = (responseSchema?.oneOf as SchemaObject[]).map(s => s['x-readme-ref-name']);
        expect(refNames).toContain('MappedCat');
        expect(refNames).toContain('MappedDog');
        expect(refNames).not.toContain('MappedBird');

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should not modify schemas that already have explicit oneOf', async () => {
        const spec = Oas.init(structuredClone(discriminatorAllOfInheritance));
        if (dereferencingLevel === 'oas') {
          await spec.dereference();
        }

        const operation = spec.operation('/pets-with-existing-oneof', 'get');
        if (dereferencingLevel === 'operation') {
          await operation.dereference();
        }

        const schemas = operation.getResponseAsJSONSchema('200');

        const responseSchema = schemas?.[0].schema;

        // Should only have ExistingCat and ExistingDog from original oneOf, not ExistingBird
        expect(responseSchema?.oneOf).toHaveLength(2);
        const refNames = (responseSchema?.oneOf as SchemaObject[]).map(s => s['x-readme-ref-name']);
        expect(refNames).toContain('ExistingCat');
        expect(refNames).toContain('ExistingDog');
        expect(refNames).not.toContain('ExistingBird');

        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();
      });

      it('should build oneOf from user-provided spec with Cat, Dog, and Lizard', async () => {
        const spec = Oas.init(structuredClone(petDiscriminatorAllOf));
        if (dereferencingLevel === 'oas') {
          await spec.dereference();
        }

        const operation = spec.operation('/pets', 'get');
        if (dereferencingLevel === 'operation') {
          await operation.dereference();
        }

        const schemas = operation.getResponseAsJSONSchema('200');
        expect(schemas).toMatchSnapshot();
        await expect(schemas?.map(s => s.schema)).toBeValidJSONSchemas();

        // Doing the same operation after dereferencing from the operation level should have the same
        // schema.
        const specAlt = Oas.init(structuredClone(petDiscriminatorAllOf));
        const operationAlt = specAlt.operation('/pets', 'get');
        await operationAlt.dereference();

        const schemasAlt = operationAlt.getResponseAsJSONSchema('200');
        expect(schemas).toStrictEqual(schemasAlt);
        await expect(schemasAlt?.map(s => s.schema)).toBeValidJSONSchemas();
      });
    });
  });
});
