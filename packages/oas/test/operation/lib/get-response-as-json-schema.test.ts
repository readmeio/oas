import type { HttpMethods, ResponseObject, SchemaObject } from '../../../src/types.js';

import petstoreSpec from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import readmeLegacySpec from '@readme/oas-examples/3.0/json/readme-legacy.json' with { type: 'json' };
import petstore3_1Spec from '@readme/oas-examples/3.1/json/petstore.json' with { type: 'json' };
import { validate } from '@readme/openapi-parser';
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

let circular: Oas;
let petstore: Oas;
let responses: Oas;

describe('#getResponseAsJSONSchema()', () => {
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

    expect(operation.getResponseAsJSONSchema('200')).toStrictEqual([
      {
        label: 'Response body',
        description: 'successful operation',
        type: 'object',
        schema: {
          type: 'object',
          properties: {
            code: { type: 'integer', format: 'int32' },
            type: { type: 'string' },
            message: { type: 'string' },
          },
          'x-readme-ref-name': 'ApiResponse',
          $schema: 'http://json-schema.org/draft-04/schema#',
        },
      },
    ]);
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

      expect(operation.getResponseAsJSONSchema('200')).toStrictEqual([
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
    });

    it("should return JSON Schema for a content type that isn't JSON-compatible", () => {
      expect(
        createOasForOperation({
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
        })
          .operation('/', 'get')
          .getResponseAsJSONSchema('200'),
      ).toStrictEqual([
        {
          label: 'Response body',
          description: 'response level description',
          type: 'string',
          schema: {
            type: 'string',
            $schema: 'http://json-schema.org/draft-04/schema#',
          },
        },
      ]);
    });
  });

  describe('contentType option', () => {
    it('should return the schema for the specified content-type when it exists', async () => {
      const operation = responses.operation('/multiple-responses-with-a-json-compatible', 'get');
      await operation.dereference();

      // Request `application/json` specifically
      expect(operation.getResponseAsJSONSchema('200', { contentType: 'application/json' })).toStrictEqual([
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
    });

    it('should return the schema for a non-JSON content-type when specified', () => {
      const operation = responses.operation('/multiple-responses-with-a-json-compatible', 'get');

      // Request `image/png` specifically
      expect(operation.getResponseAsJSONSchema('200', { contentType: 'image/png' })).toStrictEqual([
        {
          label: 'Response body',
          description: 'OK',
          type: 'string',
          schema: {
            type: 'string',
            $schema: 'http://json-schema.org/draft-04/schema#',
          },
        },
      ]);
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

      expect(operation.getResponseAsJSONSchema('200', { contentType: 'application/vnd.partytime+json' })).toStrictEqual(
        [
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
        ],
      );
    });

    it('should return null for vendor-prefixed content-type when it does not exist', () => {
      const operation = responses.operation('/vendor-prefix-content-type', 'get');

      expect(operation.getResponseAsJSONSchema('200', { contentType: 'application/json' })).toBeNull();
    });

    it('should return the schema for wildcard content-type when specified', () => {
      const operation = responses.operation('/multiple-responses-with-json-compatible-and-wildcard', 'get');

      expect(operation.getResponseAsJSONSchema('200', { contentType: '*/*' })).toStrictEqual([
        {
          label: 'Response body',
          description: 'OK',
          type: 'string',
          schema: {
            type: 'string',
            $schema: 'http://json-schema.org/draft-04/schema#',
          },
        },
      ]);
    });

    it('should return the schema for XML content-type when specified', () => {
      const operation = responses.operation('/vendored-xml-content-type-suffix', 'get');

      expect(operation.getResponseAsJSONSchema('200', { contentType: 'text/plain+xml' })).toStrictEqual([
        {
          label: 'Response body',
          description: 'OK',
          type: 'array',
          schema: {
            type: 'array',
            items: {
              type: 'string',
            },
            $schema: 'http://json-schema.org/draft-04/schema#',
          },
        },
      ]);
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

    it('should work with contentType option alongside other options like transformer', async () => {
      const operation = responses.operation('/multiple-responses-with-a-json-compatible', 'get');
      await operation.dereference();

      const jsonSchema = operation.getResponseAsJSONSchema('200', {
        contentType: 'application/json',
        transformer: schema => {
          if ('x-readme-ref-name' in schema) {
            schema['x-readme-ref'] = `#/components/schemas/${schema['x-readme-ref-name']}`;
          }
          return schema;
        },
      });

      expect(jsonSchema).toStrictEqual([
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
            'x-readme-ref': '#/components/schemas/simple-object',
            $schema: 'http://json-schema.org/draft-04/schema#',
          },
        },
      ]);
    });
  });

  describe('`enum` handling', () => {
    it('should supplement response schema descriptions with enums', async () => {
      const spec = Oas.init(structuredClone(responseEnumsSpec));

      const operation = spec.operation('/anything', 'post');
      await operation.dereference();

      expect(operation.getResponseAsJSONSchema('200')).toStrictEqual([
        {
          label: 'Response body',
          description: 'OK',
          type: 'object',
          schema: {
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
            $schema: 'http://json-schema.org/draft-04/schema#',
          },
        },
      ]);
    });
  });

  describe('`headers` support', () => {
    // https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#response-object
    it('should include headers if they exist', () => {
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

      expect(oas.operation('/', 'get').getResponseAsJSONSchema('200')).toStrictEqual([
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
    });
  });

  describe('$schema version', () => {
    it('should add the v4 schema version to OpenAPI 3.0.x schemas', () => {
      const operation = petstore.operation('/pet/findByStatus', 'get');

      expect(operation.getResponseAsJSONSchema('200')?.[0].schema.$schema).toBe(
        'http://json-schema.org/draft-04/schema#',
      );
    });

    it('should add v2020-12 schema version on OpenAPI 3.1 schemas', async () => {
      const petstore_31 = Oas.init(structuredClone(petstore3_1Spec));
      const operation = petstore_31.operation('/pet/findByStatus', 'get');
      await operation.dereference();

      expect(operation.getResponseAsJSONSchema('200')?.[0].schema.$schema).toBe(
        'https://json-schema.org/draft/2020-12/schema#',
      );
    });
  });

  describe('quirks', () => {
    it('should not crash out when pulling a response that has no schema', () => {
      const operation = responses.operation('/response-with-example-and-no-schema', 'get');

      expect(operation.getResponseAsJSONSchema('200')).toStrictEqual([
        {
          type: 'string',
          schema: {
            $schema: 'http://json-schema.org/draft-04/schema#',
          },
          label: 'Response body',
        },
      ]);
    });

    describe('$ref quirks', () => {
      it("should retain $ref pointers in the schema even if they're circular", () => {
        const operation = circular.operation('/', 'put');

        expect(operation.getResponseAsJSONSchema('200')).toMatchSnapshot();
      });

      it('should default the root schema to a `string` if there is a circular `$ref` at the root', () => {
        const operation = circular.operation('/', 'put');

        expect(operation.getResponseAsJSONSchema('201')).toStrictEqual([
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

        const schema = operation.getResponseAsJSONSchema(200);

        expect(schema).toStrictEqual([
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
      });
    });
  });

  describe('options', () => {
    describe('transformer', () => {
      it('should be able transform part of a schema', async () => {
        const operation = petstore.operation('/pet/{petId}/uploadImage', 'post');
        await operation.dereference();

        const jsonSchema = operation.getResponseAsJSONSchema('200', {
          transformer: schema => {
            if ('x-readme-ref-name' in schema) {
              schema['x-readme-ref'] = `#/components/schemas/${schema['x-readme-ref-name']}`;
            }

            return schema;
          },
        });

        expect(jsonSchema).toStrictEqual([
          {
            type: 'object',
            schema: {
              type: 'object',
              properties: {
                code: {
                  format: 'int32',
                  type: 'integer',
                },
                message: {
                  type: 'string',
                },
                type: {
                  type: 'string',
                },
              },
              'x-readme-ref-name': 'ApiResponse',
              'x-readme-ref': '#/components/schemas/ApiResponse',
              $schema: 'http://json-schema.org/draft-04/schema#',
            },
            label: 'Response body',
            description: 'successful operation',
          },
        ]);
      });

      it('should be able to transform a schema into a non-object', async () => {
        const operation = petstore.operation('/pet/{petId}/uploadImage', 'post');
        await operation.dereference();

        const jsonSchema = operation.getResponseAsJSONSchema('200', {
          transformer: schema => {
            if ('x-readme-ref-name' in schema) {
              return schema['x-readme-ref-name'] as SchemaObject;
            }

            return schema;
          },
        });

        expect(jsonSchema).toStrictEqual([
          {
            description: 'successful operation',
            label: 'Response body',
            schema: 'ApiResponse',
            type: 'string',
          },
        ]);
      });

      describe('with the `includeDiscriminatorMappingRefs` option', () => {
        it('should be able to support an operation that has discriminator mappings', async () => {
          const ably = Oas.init(structuredClone(ablySpec));
          const operation = ably.operation('/apps/{app_id}/rules', 'post');
          await operation.dereference();

          const jsonSchema = operation.getResponseAsJSONSchema('201', {
            includeDiscriminatorMappingRefs: false,
            transformer: schema => {
              if ('x-readme-ref-name' in schema) {
                return schema['x-readme-ref-name'] as SchemaObject;
              }

              return schema;
            },
          });

          expect(jsonSchema).toStrictEqual([
            {
              type: 'string',
              schema: 'rule_response',
              label: 'Response body',
              description: 'Reactor rule created',
            },
          ]);
        });
      });
    });
  });

  describe('discriminator + allOf inheritance', () => {
    describe.each(['oas', 'operation'] as const)('and we are dereferencing at the `%s` level', dereferencingLevel => {
      it('should build oneOf from schemas that extend a discriminator base via allOf', async () => {
        const spec = Oas.init(structuredClone(discriminatorAllOfInheritance));
        if (dereferencingLevel === 'oas') {
          await spec.dereference();
        }

        const operation = spec.operation('/pets', 'get');
        if (dereferencingLevel === 'operation') {
          await operation.dereference();
        }

        const jsonSchema = operation.getResponseAsJSONSchema('200');

        expect(jsonSchema).toHaveLength(1);

        const responseSchema = jsonSchema?.[0].schema;
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

        const jsonSchema = operation.getResponseAsJSONSchema('200');

        const responseSchema = jsonSchema?.[0].schema;

        // Should only have MappedCat and MappedDog from mapping, not MappedBird
        expect(responseSchema?.oneOf).toHaveLength(2);

        const refNames = (responseSchema?.oneOf as SchemaObject[]).map(s => s['x-readme-ref-name']);
        expect(refNames).toContain('MappedCat');
        expect(refNames).toContain('MappedDog');
        expect(refNames).not.toContain('MappedBird');
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

        const jsonSchema = operation.getResponseAsJSONSchema('200');

        const responseSchema = jsonSchema?.[0].schema;

        // Should only have ExistingCat and ExistingDog from original oneOf, not ExistingBird
        expect(responseSchema?.oneOf).toHaveLength(2);
        const refNames = (responseSchema?.oneOf as SchemaObject[]).map(s => s['x-readme-ref-name']);
        expect(refNames).toContain('ExistingCat');
        expect(refNames).toContain('ExistingDog');
        expect(refNames).not.toContain('ExistingBird');
      });
    });

    it('should build oneOf from user-provided spec with Cat, Dog, and Lizard', async () => {
      const spec = Oas.init(structuredClone(petDiscriminatorAllOf));
      await spec.dereference();

      const operation = spec.operation('/pets', 'get');

      const jsonSchema = operation.getResponseAsJSONSchema('200');
      expect(jsonSchema).toMatchSnapshot();

      // Doing the same operation after dereferencing from the operation level should have the same
      // schema.
      const specAlt = Oas.init(structuredClone(petDiscriminatorAllOf));
      const operationAlt = specAlt.operation('/pets', 'get');
      await operationAlt.dereference();

      const jsonSchemaAlt = operationAlt.getResponseAsJSONSchema('200');
      expect(jsonSchema).toStrictEqual(jsonSchemaAlt);
    });
  });
});
