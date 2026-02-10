import type { HttpMethods, SecuritySchemesObject } from '../../src/types.js';

import parametersCommonSpec from '@readme/oas-examples/3.0/json/parameters-common.json' with { type: 'json' };
import petstoreSpec from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import readmeLegacySpec from '@readme/oas-examples/3.0/json/readme-legacy.json' with { type: 'json' };
import securitySpec from '@readme/oas-examples/3.0/json/security.json' with { type: 'json' };
import readmeSpec from '@readme/oas-examples/3.1/json/readme.json' with { type: 'json' };
import trainTravelSpec from '@readme/oas-examples/3.1/json/train-travel.json' with { type: 'json' };
import { validate } from '@readme/openapi-parser';
import { beforeEach, describe, expect, it } from 'vitest';

import Oas from '../../src/index.js';
import { Callback, Operation, Webhook } from '../../src/operation/index.js';
import openapi31NoResponsesSpec from '../__datasets__/3-1-no-responses.json' with { type: 'json' };
import callbacksSpec from '../__datasets__/callbacks.json' with { type: 'json' };
import calblacksWeirdSummaryDescriptionSpec from '../__datasets__/callbacks-weird-summary-description.json' with { type: 'json' };
import linkSpec from '../__datasets__/local-link.json' with { type: 'json' };
import multipleSecuritiesSpec from '../__datasets__/multiple-securities.json' with { type: 'json' };
import deprecatedSchemaSpec from '../__datasets__/schema-deprecated.json' with { type: 'json' };
import { createOasForPaths } from '../__fixtures__/create-oas.js';

describe('Operation', () => {
  let petstore: Oas;
  let callbackSchema: Oas;
  let multipleSecurities: Oas;
  let securities: Oas;
  let referenceSpec: Oas;
  let deprecatedSchema: Oas;
  let parametersCommon: Oas;
  let oas31NoResponses: Oas;
  let readme: Oas;
  let readmeLegacy: Oas;
  let callbacksWeirdSummaryDescription: Oas;
  let trainTravel: Oas;

  beforeEach(async () => {
    petstore = Oas.init(structuredClone(petstoreSpec));
    callbackSchema = Oas.init(structuredClone(callbacksSpec));
    multipleSecurities = Oas.init(structuredClone(multipleSecuritiesSpec));
    securities = Oas.init(structuredClone(securitySpec));
    referenceSpec = Oas.init(structuredClone(linkSpec));
    deprecatedSchema = Oas.init(structuredClone(deprecatedSchemaSpec));
    callbacksWeirdSummaryDescription = Oas.init(structuredClone(calblacksWeirdSummaryDescriptionSpec));
    parametersCommon = Oas.init(structuredClone(parametersCommonSpec));
    oas31NoResponses = Oas.init(structuredClone(openapi31NoResponsesSpec));
    readme = Oas.init(structuredClone(readmeSpec));
    readmeLegacy = Oas.init(structuredClone(readmeLegacySpec));
    trainTravel = Oas.init(structuredClone(trainTravelSpec));
  });

  it('should accept an API definition', () => {
    const operation = new Operation(petstoreSpec as any, '/test', 'get', { summary: 'operation summary' });

    expect(operation.schema).toStrictEqual({ summary: 'operation summary' });
    expect(operation.api).toStrictEqual(petstoreSpec);
  });

  describe('#getSummary() + #getDescription()', () => {
    it('should return if present', () => {
      const operation = petstore.operation('/pet/findByTags', 'get');

      expect(operation.getSummary()).toBe('Finds Pets by tags');
      expect(operation.getDescription()).toBe(
        'Muliple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.',
      );
    });

    it('should return nothing if not present', () => {
      const operation = referenceSpec.operation('/2.0/users/{username}', 'get');

      expect(operation.getSummary()).toBeUndefined();
      expect(operation.getDescription()).toBeUndefined();
    });

    it('should allow an operation-level summary + description to override the common one', () => {
      const operation = parametersCommon.operation('/anything/{id}', 'get');

      expect(operation.getSummary()).toBe('[get] Summary');
      expect(operation.getDescription()).toBe('[get] Description');
    });

    it('should account for non-string summaries and descriptions', () => {
      const operation = callbacksWeirdSummaryDescription.operation('/callbacks', 'get');

      expect(operation.getSummary()).toBeUndefined();
      expect(operation.getDescription()).toBeUndefined();
    });

    it('should account for non-string common summaries and descriptions', () => {
      const operation = callbacksWeirdSummaryDescription.operation('/callbacks', 'post');

      expect(operation.getSummary()).toBeUndefined();
      expect(operation.getDescription()).toBeUndefined();
    });

    describe('callbacks', () => {
      it('should return a summary if present', () => {
        const operation = callbackSchema.operation('/callbacks', 'get');
        const callback = operation.getCallback('myCallback', '{$request.query.queryUrl}', 'post') as Callback;

        expect(callback.getSummary()).toBe('Callback summary');
        expect(callback.getDescription()).toBe('Callback description');
      });

      it('should return nothing if present', () => {
        const operation = callbackSchema.operation('/callbacks', 'get');
        const callback = operation.getCallback(
          'multipleCallback',
          '{$request.multipleExpression.queryUrl}',
          'post',
        ) as Callback;

        expect(callback.getSummary()).toBeUndefined();
        expect(callback.getDescription()).toBeUndefined();
      });

      it('should allow an operation-level callback summary + description to override the common one', () => {
        const operation = callbackSchema.operation('/callbacks', 'get');
        const callback = operation.getCallback(
          'multipleCallback',
          '{$request.multipleMethod.queryUrl}',
          'post',
        ) as Callback;

        expect(callback.getSummary()).toBe('[post] callback summary');
        expect(callback.getDescription()).toBe('[post] callback description');
      });

      it('should account for non-string summaries and descriptions', () => {
        const operation = callbacksWeirdSummaryDescription.operation('/callbacks', 'get');

        const callback = operation.getCallback('myCallback', '{$request.query.queryUrl}', 'post') as Callback;

        expect(callback.getSummary()).toBeUndefined();
        expect(callback.getDescription()).toBeUndefined();
      });

      it('should account for non-string common callback summary + descriptions', () => {
        const operation = callbacksWeirdSummaryDescription.operation('/callbacks', 'get');
        const callback = operation.getCallback(
          'multipleCallback',
          '{$request.multipleMethod.queryUrl}',
          'post',
        ) as Callback;

        expect(callback.getSummary()).toBeUndefined();
        expect(callback.getDescription()).toBeUndefined();
      });
    });
  });

  describe('#getContentType()', () => {
    it('should return the content type on an operation', () => {
      expect(petstore.operation('/pet', 'post').getContentType()).toBe('application/json');
    });

    it('should prioritize JSON if it exists', () => {
      expect(
        new Operation(petstore.getDefinition(), '/body', 'get', {
          requestBody: {
            content: {
              'text/xml': {
                schema: {
                  type: 'string',
                  required: ['a'],
                  properties: {
                    a: {
                      type: 'string',
                    },
                  },
                },
                example: { a: 'value' },
              },
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['a'],
                  properties: {
                    a: {
                      type: 'string',
                    },
                  },
                },
                example: { a: 'value' },
              },
            },
          },
        }).getContentType(),
      ).toBe('application/json');
    });

    it('should fetch the type from the first requestBody if it is not JSON-like', () => {
      expect(
        new Operation(petstore.getDefinition(), '/body', 'get', {
          requestBody: {
            content: {
              'text/xml': {
                schema: {
                  type: 'object',
                  required: ['a'],
                  properties: {
                    a: {
                      type: 'string',
                    },
                  },
                },
                example: { a: 'value' },
              },
            },
          },
        }).getContentType(),
      ).toBe('text/xml');
    });

    it('should handle cases where the requestBody is a `$ref`', () => {
      const op = new Operation(
        Oas.init({
          ...petstore.getDefinition(),
          components: {
            requestBodies: {
              payload: {
                required: true,
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        'Document file': {
                          type: 'string',
                          format: 'binary',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }).getDefinition(),
        '/body',
        'post',
        {
          requestBody: {
            $ref: '#/components/requestBodies/payload',
          },
        },
      );

      expect(op.getContentType()).toBe('multipart/form-data');
    });
  });

  describe('#isFormUrlEncoded()', () => {
    it('should identify `application/x-www-form-urlencoded`', () => {
      const op = new Operation(petstore.getDefinition(), '/form-urlencoded', 'get', {
        requestBody: {
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
          },
        },
      });

      expect(op.getContentType()).toBe('application/x-www-form-urlencoded');
      expect(op.isFormUrlEncoded()).toBe(true);
    });
  });

  describe('#isMultipart()', () => {
    it('should identify `multipart/form-data`', () => {
      const op = new Operation(petstore.getDefinition(), '/multipart', 'get', {
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  documentFile: {
                    type: 'string',
                    format: 'binary',
                  },
                },
              },
            },
          },
        },
      });

      expect(op.getContentType()).toBe('multipart/form-data');
      expect(op.isMultipart()).toBe(true);
    });
  });

  describe('#isJson()', () => {
    it('should identify `application/json`', () => {
      const op = new Operation(petstore.getDefinition(), '/json', 'get', {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
          },
        },
      });

      expect(op.getContentType()).toBe('application/json');
      expect(op.isJson()).toBe(true);
    });
  });

  describe('#isXml()', () => {
    it('should identify `application/xml`', () => {
      const op = new Operation(petstore.getDefinition(), '/xml', 'get', {
        requestBody: {
          content: {
            'application/xml': {
              schema: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
          },
        },
      });

      expect(op.getContentType()).toBe('application/xml');
      expect(op.isXml()).toBe(true);
    });
  });

  describe('#isWebhook()', () => {
    it('should return `false` for Operation class', () => {
      const operation = new Operation(petstoreSpec as any, '/test', 'get', { summary: 'operation summary' });

      expect(operation.isWebhook()).toBe(false);
    });

    it('should return `false` for Callback class', () => {
      const operation = new Callback(petstoreSpec as any, '/test', 'get', { summary: 'operation summary' }, 'test', {});

      expect(operation.isWebhook()).toBe(false);
    });

    it('should return `true` for Webhook class', () => {
      const operation = new Webhook(petstoreSpec as any, '/test', 'get', { summary: 'operation summary' });

      expect(operation.isWebhook()).toBe(true);
    });
  });

  describe('#getSecurity()', () => {
    const security = [{ auth: [] }];
    const securitySchemes = {
      auth: {
        type: 'http',
        scheme: 'basic',
      },
    };

    it('should return the security on this operation', () => {
      const spec = Oas.init({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0' },
        paths: {
          '/things': {
            post: {
              security,
              responses: {
                200: {
                  description: 'ok',
                },
              },
            },
          },
        },
        components: {
          securitySchemes,
        },
      });

      expect(spec.operation('/things', 'post').getSecurity()).toStrictEqual(security);
    });

    it('should fallback to global security', () => {
      const spec = Oas.init({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0' },
        paths: {
          '/things': {
            post: {
              responses: {
                200: {
                  description: 'ok',
                },
              },
            },
          },
        },
        security,
        components: {
          securitySchemes,
        },
      });

      expect(spec.operation('/things', 'post').getSecurity()).toStrictEqual(security);
    });

    it('should default to empty array if no security object defined', () => {
      const spec = Oas.init({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0' },
        paths: {
          '/things': {
            post: {
              responses: {
                200: {
                  description: 'ok',
                },
              },
            },
          },
        },
      });

      expect(spec.operation('/things', 'post').getSecurity()).toStrictEqual([]);
    });

    it('should default to empty array if no `securitySchemes` are defined', () => {
      const spec = Oas.init({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0' },
        paths: {
          '/things': {
            post: {
              security,
              responses: {
                200: {
                  description: 'ok',
                },
              },
            },
          },
        },
        components: {},
      });

      expect(spec.operation('/things', 'post').getSecurity()).toStrictEqual([]);
    });

    it('should default to empty array if an empty `securitySchemes` object is defined', () => {
      const spec = Oas.init({
        openapi: '3.1.0',
        info: { title: 'testing', version: '1.0' },
        paths: {
          '/things': {
            post: {
              security,
            },
          },
        },
        components: {
          securitySchemes: {},
        },
      });

      expect(spec.operation('/things', 'post').getSecurity()).toStrictEqual([]);
    });
  });

  describe('#getSecurityWithTypes()', () => {
    const security = [{ auth: [], invalid: [] }];
    const securitySchemes = {
      auth: {
        type: 'http',
        scheme: 'basic',
      },
    };

    const securitiesWithTypes = [
      [
        {
          security: {
            _key: 'auth',
            _requirements: [],
            scheme: 'basic',
            type: 'http',
          },
          type: 'Basic',
        },
        false,
      ],
    ];

    const filteredSecuritiesWithTypes = [
      [
        {
          security: {
            _key: 'auth',
            _requirements: [],
            scheme: 'basic',
            type: 'http',
          },
          type: 'Basic',
        },
      ],
    ];

    it('should return the array of securities on this operation', () => {
      const spec = Oas.init({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0' },
        paths: {
          '/things': {
            post: {
              security,
              responses: {
                200: {
                  description: 'ok',
                },
              },
            },
          },
        },
        components: {
          securitySchemes,
        },
      });

      expect(spec.operation('/things', 'post').getSecurityWithTypes()).toStrictEqual(securitiesWithTypes);
    });

    it('should return the filtered array if filter flag is set to true', () => {
      const spec = Oas.init({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0' },
        paths: {
          '/things': {
            post: {
              security,
              responses: {
                200: {
                  description: 'ok',
                },
              },
            },
          },
        },
        components: {
          securitySchemes,
        },
      });

      expect(spec.operation('/things', 'post').getSecurityWithTypes(true)).toStrictEqual(filteredSecuritiesWithTypes);
    });

    it('should fallback to global security', () => {
      const spec = Oas.init({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0' },
        paths: {
          '/things': {
            post: {
              responses: {
                200: {
                  description: 'ok',
                },
              },
            },
          },
        },
        security,
        components: {
          securitySchemes,
        },
      });

      expect(spec.operation('/things', 'post').getSecurityWithTypes()).toStrictEqual(securitiesWithTypes);
    });

    it('should default to empty array if no security object defined', () => {
      const spec = Oas.init({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0' },
        paths: {
          '/things': {
            post: {
              responses: {
                200: {
                  description: 'ok',
                },
              },
            },
          },
        },
      });

      expect(spec.operation('/things', 'post').getSecurityWithTypes()).toStrictEqual([]);
    });

    it('should default to empty array if no `securitySchemes` are defined', () => {
      const spec = Oas.init({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0' },
        paths: {
          '/things': {
            post: {
              security,
              responses: {
                200: {
                  description: 'ok',
                },
              },
            },
          },
        },
        components: {},
      });

      expect(spec.operation('/things', 'post').getSecurityWithTypes()).toStrictEqual([]);
    });

    it('should not pollute the original OAS with a `_key` property in the security scheme', async () => {
      const spec = Oas.init({
        openapi: '3.1.0',
        info: { title: 'testing', version: '1.0' },
        paths: {
          '/things': {
            get: {
              security: [
                {
                  api_key: [],
                },
              ],
            },
          },
        },
        components: {
          securitySchemes: {
            api_key: {
              type: 'apiKey',
              name: 'api_key',
              in: 'query',
            },
          },
        },
      });

      expect(spec.operation('/things', 'get').getSecurityWithTypes()).toStrictEqual([
        [
          {
            type: 'Query',
            security: { type: 'apiKey', name: 'api_key', in: 'query', _key: 'api_key', _requirements: [] },
          },
        ],
      ]);

      expect(spec.api.components?.securitySchemes?.api_key).toStrictEqual({
        type: 'apiKey',
        name: 'api_key',
        in: 'query',
        // _key: 'api_key' // This property should not have been added to the original API doc.
      });

      // The original API definition should still be valid.
      await expect(validate(spec.api)).resolves.toStrictEqual({
        valid: true,
        warnings: [],
        specification: 'OpenAPI',
      });
    });
  });

  describe('#prepareSecurity()', () => {
    const path = '/auth';
    const method = 'get';

    /**
     * @param schemes SecurtiySchemesObject to create a test API definition for.
     */
    function createSecurityOas(schemes: SecuritySchemesObject): Oas {
      // https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#security-requirement-object
      const security = Object.keys(schemes).map(scheme => {
        return { [scheme]: [] };
      });

      return Oas.init({
        openapi: '3.0.0',
        info: {
          title: 'testing',
          version: '1.0.0',
        },
        components: { securitySchemes: schemes },
        paths: {
          [path]: {
            [method]: {
              security,
              responses: {
                200: {
                  description: 'ok',
                },
              },
            },
          },
        },
      });
    }

    it('http/basic: should return with a type of Basic', () => {
      const oas = createSecurityOas({
        securityScheme: {
          type: 'http',
          scheme: 'basic',
        },
      });

      expect(oas.operation(path, method).prepareSecurity()).toStrictEqual({
        Basic: [{ scheme: 'basic', type: 'http', _key: 'securityScheme' }],
      });
    });

    it('http/bearer: should return with a type of Bearer', () => {
      const oas = createSecurityOas({
        securityScheme: {
          type: 'http',
          scheme: 'bearer',
        },
      });

      expect(oas.operation(path, method).prepareSecurity()).toStrictEqual({
        Bearer: [{ scheme: 'bearer', type: 'http', _key: 'securityScheme' }],
      });
    });

    it('apiKey/query: should return with a type of Query', () => {
      const oas = createSecurityOas({
        securityScheme: {
          type: 'apiKey',
          in: 'query',
          name: 'apiKey',
        },
      });

      expect(oas.operation(path, method).prepareSecurity()).toStrictEqual({
        Query: [{ type: 'apiKey', in: 'query', name: 'apiKey', _key: 'securityScheme' }],
      });
    });

    it('apiKey/header: should return with a type of Header', () => {
      const oas = createSecurityOas({
        securityScheme: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      });

      expect(oas.operation(path, method).prepareSecurity()).toStrictEqual({
        Header: [{ type: 'apiKey', in: 'header', name: 'x-api-key', _key: 'securityScheme' }],
      });
    });

    it('apiKey/cookie: should return with a type of Cookie', () => {
      const oas = createSecurityOas({
        securityScheme: {
          type: 'apiKey',
          in: 'cookie',
          name: 'api_key',
        },
      });

      expect(oas.operation(path, method).prepareSecurity()).toStrictEqual({
        Cookie: [{ type: 'apiKey', in: 'cookie', name: 'api_key', _key: 'securityScheme' }],
      });
    });

    it('should work for petstore', () => {
      const operation = petstore.operation('/pet', 'post');

      expect(operation.prepareSecurity()).toMatchSnapshot();
    });

    it('should work for multiple securities (||)', () => {
      const operation = multipleSecurities.operation('/or-security', 'post');

      expect(Object.keys(operation.prepareSecurity())).toHaveLength(2);
    });

    it('should work for multiple securities (&&)', () => {
      const operation = multipleSecurities.operation('/and-security', 'post');

      expect(Object.keys(operation.prepareSecurity())).toHaveLength(2);
    });

    it('should work for multiple securities (&& and ||)', () => {
      const operation = multipleSecurities.operation('/and-or-security', 'post');

      expect(operation.prepareSecurity().OAuth2).toHaveLength(2);
      expect(operation.prepareSecurity().Header).toHaveLength(1);
    });

    it('should dedupe securities in within an && and || situation', () => {
      const operation = multipleSecurities.operation('/multiple-combo-auths-duped', 'get');

      expect(operation.prepareSecurity().Bearer).toHaveLength(1);
      expect(operation.prepareSecurity().Header).toHaveLength(2);
    });

    it.todo('should set a `key` property');

    it.todo('should throw if attempting to use a non-existent scheme');

    it('should return empty object if no security', () => {
      const operation = multipleSecurities.operation('/no-auth', 'post');

      expect(Object.keys(operation.prepareSecurity())).toHaveLength(0);
    });

    it('should return empty object if security scheme doesnt exist', () => {
      const operation = multipleSecurities.operation('/unknown-scheme', 'post');

      expect(Object.keys(operation.prepareSecurity())).toHaveLength(0);
    });

    it('should return empty if security scheme type doesnt exist', () => {
      const operation = multipleSecurities.operation('/unknown-auth-type', 'post');

      expect(Object.keys(operation.prepareSecurity())).toHaveLength(0);
    });
  });

  describe('#getHeaders()', () => {
    it('should return an object containing request headers if params exist', () => {
      const operation = petstore.operation('/pet/{petId}', 'delete');
      expect(operation.getHeaders()).toMatchObject({
        request: ['Authorization', 'api_key'],
        response: [],
      });
    });

    it('should return an object containing content-type request header if media types exist in request body', () => {
      const operation = petstore.operation('/pet', 'post');
      expect(operation.getHeaders()).toMatchObject({
        request: ['Authorization', 'Content-Type'],
        response: [],
      });
    });

    it('should return an object containing accept and content-type headers if media types exist in response', () => {
      const operation = petstore.operation('/pet/findByStatus', 'get');
      expect(operation.getHeaders()).toMatchObject({
        request: ['Authorization', 'Accept'],
        response: ['Content-Type'],
      });
    });

    it('should return an object containing request headers if security exists', () => {
      const operation = multipleSecurities.operation('/multiple-combo-auths', 'post');
      expect(operation.getHeaders()).toMatchObject({
        request: ['testKey', 'Authorization'],
        response: [],
      });
    });

    it('should return a Cookie header if security is located in cookie scheme', () => {
      const operation = referenceSpec.operation('/2.0/users/{username}', 'get');
      expect(operation.getHeaders()).toMatchObject({
        request: ['Authorization', 'Cookie', 'Accept'],
        response: ['Content-Type'],
      });
    });

    describe('authorization headers', () => {
      it.each([
        ['HTTP Basic', '/anything/basic', 'post'],
        ['HTTP Bearer', '/anything/bearer', 'post'],
        ['OAuth2', '/anything/oauth2', 'post'],
      ])('should find an authorization header for a %s request', (_, path, method) => {
        const operation = securities.operation(path, method as HttpMethods);
        const headers = operation.getHeaders();

        expect(headers.request).toContain('Authorization');
      });
    });

    it('should target parameter refs and return names if applicable', () => {
      const operation = referenceSpec.operation('/2.0/repositories/{username}/{slug}/pullrequests', 'get');

      expect(operation.getHeaders()).toMatchObject({
        request: ['hostname', 'Accept'],
        response: ['Content-Type'],
      });
    });

    it('should not fail if there are no responses', () => {
      const operation = oas31NoResponses.operation('/pet/{petId}', 'delete');

      expect(operation.getHeaders()).toMatchObject({
        request: ['Authorization', 'api_key'],
        response: [],
      });
    });
  });

  describe('#hasOperationId()', () => {
    it('should return true if one exists', () => {
      const operation = petstore.operation('/pet/{petId}', 'delete');

      expect(operation.hasOperationId()).toBe(true);
    });

    it('should return false if one does not exist', () => {
      const operation = multipleSecurities.operation('/multiple-combo-auths-duped', 'get');

      expect(operation.hasOperationId()).toBe(false);
    });

    it("should return false if one is present but it's empty", () => {
      const spec = Oas.init({
        openapi: '3.1.0',
        info: {
          title: 'testing',
          version: '1.0.0',
        },
        paths: {
          '/anything': {
            get: {
              operationId: '',
            },
          },
        },
      });

      const operation = spec.operation('/anything', 'get');

      expect(operation.hasOperationId()).toBe(false);
    });

    it('should return true the operation has one and is defined through a `$ref` pointer', () => {
      const spec = Oas.init({
        openapi: '3.1.0',
        info: {
          title: 'testing',
          version: '1.0.0',
        },
        paths: {
          '/referenced': {
            get: {
              $ref: '#/components/schemas/referenced',
            },
          },
        },
        components: {
          schemas: {
            referenced: {
              operationId: 'getReferenced',
            },
          },
        },
      });

      const operation = spec.operation('/referenced', 'get');

      expect(operation.hasOperationId()).toBe(true);
    });

    describe('and we are using the static method instead of the instance', () => {
      it('should return true if one exists', () => {
        const operation = petstore.operation('/pet/{petId}', 'delete');

        expect(Operation.hasOperationId(operation.schema)).toBe(true);
      });
    });
  });

  describe('#getOperationId()', () => {
    it('should return an operation id if one exists', () => {
      const operation = petstore.operation('/pet/{petId}', 'delete');

      expect(operation.getOperationId()).toBe('deletePet');
    });

    it('should our operation id if the operation is defined through a `$ref` pointer', () => {
      const spec = Oas.init({
        openapi: '3.1.0',
        info: {
          title: 'testing',
          version: '1.0.0',
        },
        paths: {
          '/referenced': {
            get: {
              $ref: '#/components/schemas/referenced',
            },
          },
        },
        components: {
          schemas: {
            referenced: {
              operationId: 'getReferenced',
            },
          },
        },
      });

      const operation = spec.operation('/referenced', 'get');

      expect(operation.getOperationId()).toBe('getReferenced');
    });

    it('should create one if one does not exist', () => {
      const operation = multipleSecurities.operation('/multiple-combo-auths-duped', 'get');

      expect(operation.getOperationId()).toBe('get_multiple-combo-auths-duped');
    });

    it('should not sanitize underscores by default', () => {
      const spec = Oas.init({
        openapi: '3.1.0',
        info: {
          title: 'testing',
          version: '1.0.0',
        },
        paths: {
          '/ac_eq_hazard/18.0': {
            post: {},
          },
        },
      });

      const operation = spec.operation('/ac_eq_hazard/18.0', 'post');

      expect(operation.getOperationId()).toBe('post_ac-eq-hazard-18-0');
    });

    describe('options', () => {
      describe('given a path without an operationId', () => {
        it.each([
          ['camelCase', 'getMultipleComboAuthsDuped'],
          ['friendlyCase', 'getMultipleComboAuthsDuped'],
        ])('%s', (option, expected) => {
          const operation = multipleSecurities.operation('/multiple-combo-auths-duped', 'get');

          expect(operation.getOperationId({ [option]: true })).toBe(expected);
        });
      });

      describe('given a path with underscores', () => {
        it.each([
          ['camelCase', 'postAc_eq_hazard180'],
          ['friendlyCase', 'postAcEqHazard180'],
        ])('%s', (option, expected) => {
          const spec = createOasForPaths({
            '/ac_eq_hazard/18.0': {
              post: {
                responses: {},
              },
            },
          });

          const operation = spec.operation('/ac_eq_hazard/18.0', 'post');

          expect(operation.getOperationId({ [option]: true })).toBe(expected);
        });
      });

      describe('given a path that begins with a prefix matching the http method its associated with', () => {
        it.each([
          ['camelCase', 'getPets'],
          ['friendlyCase', 'getPets'],
        ])('%s', (option, expected) => {
          const spec = createOasForPaths({
            '/get-pets': {
              get: {
                responses: {},
              },
            },
          });

          const operation = spec.operation('/get-pets', 'get');

          expect(operation.getOperationId({ [option]: true })).toBe(expected);
        });
      });

      describe('given a path that begins with double forward slashes', () => {
        it.each([
          ['camelCase', 'getCandidateCandidate_id'],
          ['friendlyCase', 'getCandidateId'],
        ])('%s', (option, expected) => {
          const spec = createOasForPaths({
            '//candidate/{candidate_id}/': {
              get: {
                responses: {},
              },
            },
          });

          const operation = spec.operation('/candidate/{candidate_id}/', 'get');

          expect(operation.getOperationId({ [option]: true })).toBe(expected);
        });
      });

      describe('given an operationId that we already consider to be good enough', () => {
        it.each([
          ['camelCase', 'exchangeRESTAPI_GetAccounts'],
          ['friendlyCase', 'exchangeRESTAPIGetAccounts'],
        ])('%s', (option, expected) => {
          const spec = createOasForPaths({
            '/anything': {
              get: {
                // This operationID is already fine to use as a JS method accessor we're just slightly
                // modifying it so it fits as a method accessor.
                operationId: 'ExchangeRESTAPI_GetAccounts',
                responses: {},
              },
            },
          });

          const operation = spec.operation('/anything', 'get');

          expect(operation.getOperationId({ [option]: true })).toBe(expected);
        });
      });

      describe('given an operationId that contains non-alphanumeric characters', () => {
        it.each([
          ['camelCase', 'findPetsByStatus'],
          ['friendlyCase', 'findPetsByStatus'],
        ])('%s', (option, expected) => {
          const spec = createOasForPaths({
            '/anything': {
              get: {
                // This mess of a string is intentionally nasty so we can be sure that we're not
                // including anything that wouldn't look right as an operationID for a potential method
                // accessor in `api`.
                operationId: 'find/?*!@#$%^&*()-=.,<>+[]{}\\|pets-by-status',
                responses: {},
              },
            },
          });

          const operation = spec.operation('/anything', 'get');

          expect(operation.getOperationId({ [option]: true })).toBe(expected);
        });
      });

      describe('given an operationId that ends in non-alphanumeric characters', () => {
        it.each([
          ['camelCase', 'findPetsByStatusDeprecated'],
          ['friendlyCase', 'findPetsByStatusDeprecated'],
        ])('%s', (option, expected) => {
          const spec = createOasForPaths({
            '/anything': {
              get: {
                operationId: 'find pets by status (deprecated?*!@#$%^&*()-=.,<>+[]{})',
                responses: {},
              },
            },
          });

          const operation = spec.operation('/anything', 'get');

          expect(operation.getOperationId({ [option]: true })).toBe(expected);
        });
      });

      describe('given an operationId that begins with non-alphanumeric characters', () => {
        it.each([
          ['camelCase', 'findPetsByStatus'],
          ['friendlyCase', 'findPetsByStatus'],
        ])('%s', (option, expected) => {
          const spec = createOasForPaths({
            '/anything': {
              get: {
                operationId: '(?*!@#$%^&*()-=.,<>+[]{}) find pets by status',
                responses: {},
              },
            },
          });

          const operation = spec.operation('/anything', 'get');

          expect(operation.getOperationId({ [option]: true })).toBe(expected);
        });
      });

      describe('given an operationId that begins with a number', () => {
        it.each([
          ['camelCase', '_400oD_Browse_by_Date_Feed'],
          ['friendlyCase', '_400oDBrowseByDateFeed'],
        ])('%s', (option, expected) => {
          const spec = createOasForPaths({
            '/anything': {
              get: {
                operationId: '400oD_Browse_by_Date_Feed',
                responses: {},
              },
            },
          });

          const operation = spec.operation('/anything', 'get');

          expect(operation.getOperationId({ [option]: true })).toBe(expected);
        });
      });

      describe('`friendlyCase`', () => {
        it('should not create an operationId that includes the same word in a consecutive sequence', () => {
          const spec = createOasForPaths({
            '/pet/{pet}/adoption': {
              post: {
                responses: {},
              },
            },
          });

          const operation = spec.operation('/pet/{pet}/adoption', 'post');

          expect(operation.getOperationId({ friendlyCase: true })).toBe('postPetAdoption');
        });
      });
    });

    describe('and we are using the static method instead of the instance', () => {
      it('should return an operation id if one exists', () => {
        const operation = petstore.operation('/pet/{petId}', 'delete');

        expect(Operation.getOperationId(operation.path, operation.method, operation.schema)).toBe('deletePet');
      });
    });
  });

  describe('#getTags()', () => {
    it('should return tags if tags exist', () => {
      const operation = petstore.operation('/pet', 'post');

      expect(operation.getTags()).toStrictEqual([
        {
          name: 'pet',
          description: 'Everything about your Pets',
          externalDocs: { description: 'Find out more', url: 'http://swagger.io' },
        },
      ]);
    });

    it("should not return any tag metadata with the tag if it isn't defined at the OAS level", () => {
      const spec = Oas.init({
        openapi: '3.0.0',
        info: {
          title: 'testing',
          version: '1.0.0',
        },
        paths: {
          '/': {
            get: {
              tags: ['dogs'],
              responses: {
                200: {
                  description: 'OK',
                },
              },
            },
          },
        },
      });

      const operation = spec.operation('/', 'get');

      expect(operation.getTags()).toStrictEqual([{ name: 'dogs' }]);
    });

    it('should return an empty array if no tags are present', () => {
      const spec = Oas.init({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0.0' },
        paths: {
          '/': {
            get: {
              responses: {
                200: {
                  description: 'OK',
                },
              },
            },
          },
        },
      });

      const operation = spec.operation('/', 'get');

      expect(operation.getTags()).toHaveLength(0);
    });

    it('should our tags if the operation is defined through a `$ref` pointer', () => {
      const spec = Oas.init({
        openapi: '3.1.0',
        info: {
          title: 'testing',
          version: '1.0.0',
        },
        paths: {
          '/referenced': {
            get: {
              $ref: '#/components/schemas/referenced',
            },
          },
        },
        components: {
          schemas: {
            referenced: {
              operationId: 'getReferenced',
              tags: ['referenced'],
            },
          },
        },
      });

      const operation = spec.operation('/referenced', 'get');

      expect(operation.getTags()).toStrictEqual([{ name: 'referenced' }]);
    });
  });

  describe('#isDeprecated()', () => {
    it('should return deprecated flag if present', () => {
      const operation = deprecatedSchema.operation('/anything', 'post');

      expect(operation.isDeprecated()).toBe(true);
    });

    it('should return false if no deprecated flag is present', () => {
      const operation = petstore.operation('/pet/{petId}', 'delete');

      expect(operation.isDeprecated()).toBe(false);
    });
  });

  describe('#hasParameters()', () => {
    it('should return true on an operation with parameters', () => {
      const operation = petstore.operation('/pet/{petId}', 'delete');

      expect(operation.hasParameters()).toBe(true);
    });

    it('should return false on an operation without any parameters', () => {
      const operation = petstore.operation('/pet', 'put');

      expect(operation.hasParameters()).toBe(false);
    });

    describe('callbacks', () => {
      it('should return parameters', () => {
        const operation = callbackSchema.operation('/callbacks', 'get');
        const callback = operation.getCallback('multipleCallback', '{$request.multipleMethod.queryUrl}', 'post');

        expect(callback).toBeInstanceOf(Callback);
        expect((callback as Callback).hasParameters()).toBe(true);
      });

      it('should return an empty array if there are none', () => {
        const operation = callbackSchema.operation('/callbacks', 'get');
        const callback = operation.getCallback('multipleCallback', '{$request.multipleExpression.queryUrl}', 'post');

        expect(callback).toBeInstanceOf(Callback);
        expect((callback as Callback).hasParameters()).toBe(false);
      });
    });
  });

  describe('#getParameters()', () => {
    it('should return parameters', () => {
      const operation = petstore.operation('/pet/{petId}', 'delete');

      expect(operation.getParameters()).toStrictEqual([
        {
          in: 'header',
          name: 'api_key',
          required: false,
          schema: {
            type: 'string',
          },
        },
        {
          description: 'Pet id to delete',
          in: 'path',
          name: 'petId',
          required: true,
          schema: {
            format: 'int64',
            type: 'integer',
          },
        },
      ]);
    });

    it('should support retrieving common parameters', () => {
      const operation = parametersCommon.operation('/anything/{id}', 'post');

      expect(operation.getParameters()).toStrictEqual([
        {
          description: 'The numbers of items to return.',
          in: 'query',
          name: 'limit',
          required: false,
          schema: {
            default: 20,
            maximum: 50,
            minimum: 1,
            type: 'integer',
          },
        },
        {
          description: 'ID parameter',
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'number',
          },
        },
        {
          in: 'header',
          name: 'x-extra-id',
          schema: {
            type: 'string',
          },
        },
      ]);
    });

    it('should return an empty array if there are none', () => {
      const operation = petstore.operation('/pet', 'put');

      expect(operation.getParameters()).toHaveLength(0);
    });

    it('should return parameters that are defined through a `$ref` pointer', () => {
      const operation = readmeLegacy.operation('/api-specification', 'get');

      expect(operation.getParameters()).toMatchSnapshot();
    });

    describe('callbacks', () => {
      it('should return parameters', () => {
        const operation = callbackSchema.operation('/callbacks', 'get');
        const callback = operation.getCallback('multipleCallback', '{$request.multipleMethod.queryUrl}', 'post');

        expect(callback).toBeInstanceOf(Callback);
        expect((callback as Callback).getParameters()).toStrictEqual([
          {
            in: 'query',
            name: 'queryParam',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ]);
      });

      it('should support retrieving common parameters', () => {
        const operation = callbackSchema.operation('/callbacks', 'get');
        const callback = operation.getCallback('multipleCallback', '{$request.multipleMethod.queryUrl}', 'get');

        expect(callback).toBeInstanceOf(Callback);
        expect((callback as Callback).getParameters()).toStrictEqual([
          {
            in: 'query',
            name: 'queryParam',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            in: 'query',
            name: 'anotherQueryParam',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ]);
      });

      it('should return an empty array if there are none', () => {
        const operation = callbackSchema.operation('/callbacks', 'get');
        const callback = operation.getCallback('multipleCallback', '{$request.multipleExpression.queryUrl}', 'post');

        expect(callback).toBeInstanceOf(Callback);
        expect((callback as Callback).getParameters()).toHaveLength(0);
      });
    });
  });

  describe('#hasRequiredParameters()', () => {
    it('should return true if some parameters are required', () => {
      expect(readme.operation('/branches/{branch}/apis', 'get').hasRequiredParameters()).toBe(true);
    });

    it('should return false if there are no parameters', () => {
      expect(petstore.operation('/store/inventory', 'get').hasRequiredParameters()).toBe(false);
    });
  });

  describe('#getParametersAsJSONSchema()', () => {
    it('should return the parameters of an operation as JSON Schema', () => {
      const operation = petstore.operation('/pet', 'put');

      expect(operation.getParametersAsJSONSchema()).toMatchSnapshot();
    });
  });

  describe('#hasRequestBody()', () => {
    it('should return true on an operation with a requestBody', () => {
      const operation = petstore.operation('/pet', 'put');

      expect(operation.hasRequestBody()).toBe(true);
    });

    it('should return false on an operation without a requestBody', () => {
      const operation = petstore.operation('/pet/findByStatus', 'get');

      expect(operation.hasRequestBody()).toBe(false);
    });
  });

  describe('#getRequestBodyMediaTypes()', () => {
    it('should return an empty array if no requestBody is present', () => {
      const operation = petstore.operation('/pet/findByStatus', 'get');

      expect(operation.getRequestBodyMediaTypes()).toHaveLength(0);
    });

    it('should return the available requestBody media types', () => {
      const operation = petstore.operation('/pet', 'put');

      expect(operation.getRequestBodyMediaTypes()).toStrictEqual(['application/json', 'application/xml']);
    });
  });

  describe('#hasRequiredRequestBody()', () => {
    it('should return true on an operation with a required requestBody', () => {
      const operation = petstore.operation('/pet', 'put');

      expect(operation.hasRequiredRequestBody()).toBe(true);
    });

    it('should return true on an optional requestBody payload that required schemas', () => {
      const operation = new Operation(petstore.getDefinition(), '/anything', 'post', {
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['a'],
                properties: {
                  a: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      });

      expect(operation.hasRequiredRequestBody()).toBe(true);
    });

    it('should return true on an optional `application/x-www-form-urlencoded` requestBody payload that required schemas', () => {
      const operation = new Operation(petstore.getDefinition(), '/anything', 'post', {
        requestBody: {
          required: false,
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                required: ['a'],
                properties: {
                  a: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      });

      expect(operation.hasRequiredRequestBody()).toBe(true);
    });

    it('should return false on an operation without a requestBody', () => {
      const operation = petstore.operation('/pet/findByStatus', 'get');

      expect(operation.hasRequiredRequestBody()).toBe(false);
    });
  });

  describe('#getRequestBody()', () => {
    it('should return false on an operation without a requestBody', () => {
      const operation = petstore.operation('/pet/findByStatus', 'get');

      expect(operation.getRequestBody('application/json')).toBe(false);
    });

    it('should return false on an operation without the specified requestBody media type', () => {
      const operation = petstore.operation('/pet', 'put');

      expect(operation.getRequestBody('text/xml')).toBe(false);
    });

    it('should return the specified requestBody media type', () => {
      const operation = petstore.operation('/pet', 'put');

      expect(operation.getRequestBody('application/json')).toStrictEqual({
        schema: {
          $ref: '#/components/schemas/Pet',
        },
      });
    });

    describe('should support retrieval without a given media type', () => {
      it('should prefer `application/json` media types', () => {
        const operation = petstore.operation('/pet', 'put');

        expect(operation.getRequestBody()).toStrictEqual([
          'application/json',
          { schema: expect.any(Object) },
          'Pet object that needs to be added to the store',
        ]);
      });

      it('should pick first available if no json-like media types present', () => {
        const operation = petstore.operation('/pet/{petId}', 'post');

        expect(operation.getRequestBody()).toStrictEqual([
          'application/x-www-form-urlencoded',
          { schema: expect.any(Object) },
        ]);
      });
    });
  });

  describe('#getResponseByStatusCode()', () => {
    it('should return false if the status code doesnt exist', () => {
      const operation = petstore.operation('/pet/findByStatus', 'get');

      expect(operation.getResponseByStatusCode(202)).toBe(false);
    });

    it('should return the response', () => {
      const operation = petstore.operation('/pet/findByStatus', 'get');

      expect(operation.getResponseByStatusCode(200)).toStrictEqual({
        description: 'successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: expect.any(Object),
            },
          },
          'application/xml': {
            schema: {
              type: 'array',
              items: expect.any(Object),
            },
          },
        },
      });
    });

    it('should return the response even if its defined as a `$ref` pointer', () => {
      const operation = trainTravel.operation('/trips', 'get');

      expect(operation.getResponseByStatusCode(400)).toStrictEqual({
        description: 'Bad Request',
        headers: {
          RateLimit: {
            $ref: '#/components/headers/RateLimit',
          },
        },
        content: {
          'application/problem+json': {
            schema: {
              $ref: '#/components/schemas/Problem',
            },
            example: {
              detail: 'The request is invalid or missing required parameters.',
              status: 400,
              title: 'Bad Request',
              type: 'https://example.com/errors/bad-request',
            },
          },
          'application/problem+xml': {
            schema: {
              $ref: '#/components/schemas/Problem',
            },
            example: {
              detail: 'The request is invalid or missing required parameters.',
              status: 400,
              title: 'Bad Request',
              type: 'https://example.com/errors/bad-request',
            },
          },
        },
      });
    });
  });

  describe('#getResponseStatusCodes()', () => {
    it('should return all valid status codes for a response', () => {
      const operation = petstore.operation('/pet/findByStatus', 'get');

      expect(operation.getResponseStatusCodes()).toStrictEqual(['200', '400']);
    });

    it('should return an empty array if there are no responses', () => {
      const operation = petstore.operation('/pet/findByStatus', 'doesnotexist' as HttpMethods);

      expect(operation.getResponseStatusCodes()).toStrictEqual([]);
    });
  });

  describe('#hasCallbacks()', () => {
    it('should return true on an operation with callbacks', () => {
      const operation = callbackSchema.operation('/callbacks', 'get');

      expect(operation.hasCallbacks()).toBe(true);
    });

    it('should return false on an operation without callbacks', () => {
      const operation = petstore.operation('/pet/findByStatus', 'get');

      expect(operation.hasCallbacks()).toBe(false);
    });
  });

  describe('#getCallback()', () => {
    it('should return an operation from a callback if it exists', () => {
      const operation = callbackSchema.operation('/callbacks', 'get');
      const callback = operation.getCallback(
        'multipleCallback',
        '{$request.multipleMethod.queryUrl}',
        'post',
      ) as Callback;

      expect(callback).toBeInstanceOf(Callback);
      expect(callback.identifier).toBe('multipleCallback');
      expect(callback.method).toBe('post');
      expect(callback.path).toBe('{$request.multipleMethod.queryUrl}');
      expect(callback.parentSchema).toStrictEqual({
        summary: '[common] callback summary',
        description: '[common] callback description',
        parameters: expect.any(Array),
        post: {
          description: '[post] callback description',
          summary: '[post] callback summary',
          requestBody: expect.any(Object),
          responses: expect.any(Object),
        },
        get: {
          description: '[get] callback description',
          summary: '[get] callback summary',
          parameters: expect.any(Array),
          responses: expect.any(Object),
        },
      });
    });

    it('should return false if that callback doesnt exist', () => {
      const operation = callbackSchema.operation('/callbacks', 'get');

      expect(operation.getCallback('fakeCallback', 'doesntExist', 'get')).toBe(false);
    });
  });

  describe('#getCallbacks()', () => {
    it('should return an array of operations created from each callback', () => {
      const operation = callbackSchema.operation('/callbacks', 'get');
      const callbacks = operation.getCallbacks();

      expect(callbacks).toHaveLength(4);
      expect(callbacks.every(callback => callback instanceof Callback)).toBe(true);
    });

    it('should return an empty array if theres no callbacks', () => {
      const operation = petstore.operation('/pet', 'put');

      expect(operation.getCallbacks()).toHaveLength(0);
    });

    it("should return an empty object for the operation if only callbacks present aren't supported HTTP methods", () => {
      const oas = Oas.init({
        openapi: '3.1.0',
        info: {
          version: '1.0.0',
          title: 'operation with just common param callbacks',
        },
        paths: {
          '/anything': {
            post: {
              callbacks: {
                batchSuccess: {
                  '{$url}': {
                    // Instead of `post`, `get`, etc being here we just have `summary` and since that
                    // isn't a valid HTTP method we don't have any usable callbacks here to pull back
                    // with `getCallbacks()`.
                    summary: 'Batch call webhook',
                  },
                },
              },
            },
          },
        },
      });

      expect(oas.operation('/anything', 'post').getCallbacks()).toStrictEqual([]);
    });
  });

  describe('#getCallbackExamples()', () => {
    it('should return an array of examples for each callback that has them', () => {
      const operation = callbackSchema.operation('/callbacks', 'get');

      expect(operation.getCallbackExamples()).toHaveLength(3);
    });

    it('should an empty array if there are no callback examples', () => {
      const operation = petstore.operation('/pet', 'put');

      expect(operation.getCallbackExamples()).toHaveLength(0);
    });
  });

  describe('#hasExtension()', () => {
    it('should return true if the extension exists', () => {
      const operation = petstore.operation('/pet', 'put');
      operation.schema['x-samples-languages'] = false;

      expect(operation.hasExtension('x-samples-languages')).toBe(true);
    });

    it("should return false if the extension doesn't exist", () => {
      const operation = deprecatedSchema.operation('/pet', 'put');

      expect(operation.hasExtension('x-readme')).toBe(false);
    });

    it('should not fail if the Operation instance has no API definition', () => {
      // @ts-expect-error -- Testing a mistyping case here.
      const operation = Oas.init(undefined).operation('/pet', 'put');

      expect(operation.hasExtension('x-readme')).toBe(false);
    });
  });

  describe('#getExtension()', () => {
    it('should return the extension if it exists', () => {
      const oas = Oas.init({
        ...petstore.getDefinition(),
        'x-readme': {
          'samples-languages': ['js', 'python'],
        },
      });

      const operation = oas.operation('/pet', 'put');
      operation.schema['x-readme'] = {
        'samples-languages': ['php', 'go'],
      };

      expect(operation.getExtension('x-readme')).toStrictEqual({
        'samples-languages': ['php', 'go'],
      });
    });

    it("should return nothing if the extension doesn't exist", () => {
      const operation = deprecatedSchema.operation('/pet', 'put');

      expect(operation.getExtension('x-readme')).toBeUndefined();
    });

    it('should not fail if the Operation instance has no API definition', () => {
      // @ts-expect-error -- Testing a mistyping case here.
      const operation = Oas.init(undefined).operation('/pet', 'put');

      expect(operation.getExtension('x-readme')).toBeUndefined();
    });
  });
});
