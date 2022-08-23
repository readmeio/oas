import type * as RMOAS from '../src/rmoas.types';

import petstoreSpec from '@readme/oas-examples/3.0/json/petstore.json';
import openapiParser from '@readme/openapi-parser';

import Oas, { Operation, Callback } from '../src';

let petstore: Oas;
let callbackSchema: Oas;
let multipleSecurities: Oas;
let securities: Oas;
let referenceSpec: Oas;
let deprecatedSchema: Oas;
let parametersCommon: Oas;
let petstoreNondereferenced: Oas;
let oas31NoResponses: Oas;
let readme: Oas;

beforeAll(async () => {
  petstore = await import('@readme/oas-examples/3.0/json/petstore.json').then(r => r.default).then(Oas.init);
  await petstore.dereference();

  callbackSchema = await import('./__datasets__/callbacks.json').then(r => r.default).then(Oas.init);
  await callbackSchema.dereference();

  multipleSecurities = await import('./__datasets__/multiple-securities.json').then(r => r.default).then(Oas.init);
  await multipleSecurities.dereference();

  securities = await import('@readme/oas-examples/3.0/json/security.json').then(r => r.default).then(Oas.init);
  await securities.dereference();

  referenceSpec = await import('./__datasets__/local-link.json').then(r => r.default).then(Oas.init);
  await referenceSpec.dereference();

  deprecatedSchema = await import('./__datasets__/schema-deprecated.json').then(r => r.default).then(Oas.init);
  await deprecatedSchema.dereference();

  parametersCommon = await import('./__datasets__/parameters-common.json').then(r => r.default).then(Oas.init);
  await parametersCommon.dereference();

  petstoreNondereferenced = await import('./__datasets__/petstore-nondereferenced.json')
    .then(r => r.default)
    .then(Oas.init);

  oas31NoResponses = await import('./__datasets__/3-1-no-responses.json').then(r => r.default).then(Oas.init);
  await oas31NoResponses.dereference();

  readme = await import('@readme/oas-examples/3.0/json/readme.json').then(r => r.default).then(Oas.init);
  await readme.dereference();
});

describe('#constructor', () => {
  it('should accept an API definition', () => {
    const operation = new Operation(petstoreSpec as any, '/test', 'get', { summary: 'operation summary' });
    expect(operation.schema).toStrictEqual({ summary: 'operation summary' });
    expect(operation.api).toStrictEqual(petstoreSpec);
  });
});

describe('#getSummary() + #getDescription()', () => {
  it('should return if present', () => {
    const operation = petstore.operation('/pet/findByTags', 'get');

    expect(operation.getSummary()).toBe('Finds Pets by tags');
    expect(operation.getDescription()).toBe(
      'Muliple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.'
    );
  });

  it('should return nothing if not present', () => {
    const operation = referenceSpec.operation('/2.0/users/{username}', 'get');

    expect(operation.getSummary()).toBeUndefined();
    expect(operation.getDescription()).toBeUndefined();
  });

  it('should allow a common summary to override the operation-level summary', () => {
    const operation = parametersCommon.operation('/anything/{id}', 'get');

    expect(operation.getSummary()).toBe('[common] Summary');
    expect(operation.getDescription()).toBe('[common] Description');
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
        'post'
      ) as Callback;

      expect(callback.getSummary()).toBeUndefined();
      expect(callback.getDescription()).toBeUndefined();
    });

    it('should allow a common summary to override the callback-level summary', () => {
      const operation = callbackSchema.operation('/callbacks', 'get');
      const callback = operation.getCallback(
        'multipleCallback',
        '{$request.multipleMethod.queryUrl}',
        'post'
      ) as Callback;

      expect(callback.getSummary()).toBe('[common] callback summary');
      expect(callback.getDescription()).toBe('[common] callback description');
    });
  });
});

describe('#getContentType()', () => {
  it('should return the content type on an operation', () => {
    expect(petstore.operation('/pet', 'post').getContentType()).toBe('application/json');
  });

  it('should prioritise json if it exists', () => {
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
      }).getContentType()
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
      }).getContentType()
    ).toBe('text/xml');
  });

  it('should handle cases where the requestBody is a $ref', () => {
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
      }
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

describe('#getSecurity()', () => {
  const security = [{ auth: [] }];
  const securitySchemes = {
    auth: {
      type: 'http',
      scheme: 'basic',
    },
  };

  it('should return the security on this operation', () => {
    expect(
      Oas.init({
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
      })
        .operation('/things', 'post')
        .getSecurity()
    ).toBe(security);
  });

  it('should fallback to global security', () => {
    expect(
      Oas.init({
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
      })
        .operation('/things', 'post')
        .getSecurity()
    ).toBe(security);
  });

  it('should default to empty array if no security object defined', () => {
    expect(
      Oas.init({
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
      })
        .operation('/things', 'post')
        .getSecurity()
    ).toStrictEqual([]);
  });

  it('should default to empty array if no `securitySchemes` are defined', () => {
    expect(
      Oas.init({
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
      })
        .operation('/things', 'post')
        .getSecurity()
    ).toStrictEqual([]);
  });

  it('should default to empty array if an empty `securitySchemes` object is defined', () => {
    expect(
      Oas.init({
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
      })
        .operation('/things', 'post')
        .getSecurity()
    ).toStrictEqual([]);
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
          scheme: 'basic',
          type: 'http',
        },
        type: 'Basic',
      },
    ],
  ];

  it('should return the array of securities on this operation', () => {
    expect(
      Oas.init({
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
      })
        .operation('/things', 'post')
        .getSecurityWithTypes()
    ).toStrictEqual(securitiesWithTypes);
  });

  it('should return the filtered array if filter flag is set to true', () => {
    expect(
      Oas.init({
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
      })
        .operation('/things', 'post')
        .getSecurityWithTypes(true)
    ).toStrictEqual(filteredSecuritiesWithTypes);
  });

  it('should fallback to global security', () => {
    expect(
      Oas.init({
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
      })
        .operation('/things', 'post')
        .getSecurityWithTypes()
    ).toStrictEqual(securitiesWithTypes);
  });

  it('should default to empty array if no security object defined', () => {
    expect(
      Oas.init({
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
      })
        .operation('/things', 'post')
        .getSecurityWithTypes()
    ).toStrictEqual([]);
  });

  it('should default to empty array if no `securitySchemes` are defined', () => {
    expect(
      Oas.init({
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
      })
        .operation('/things', 'post')
        .getSecurityWithTypes()
    ).toStrictEqual([]);
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
          security: { type: 'apiKey', name: 'api_key', in: 'query', _key: 'api_key' },
        },
      ],
    ]);

    expect(spec.api.components.securitySchemes.api_key).toStrictEqual({
      type: 'apiKey',
      name: 'api_key',
      in: 'query',
      // _key: 'api_key' // This property should not have been added to the original API doc.
    });

    // The original API doc should still be valid.
    const clonedSpec = JSON.parse(JSON.stringify(spec.api));
    await expect(openapiParser.validate(clonedSpec)).resolves.toStrictEqual(
      expect.objectContaining({
        openapi: '3.1.0',
      })
    );
  });
});

// https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#securitySchemeObject
describe('#prepareSecurity()', () => {
  const path = '/auth';
  const method = 'get';

  /**
   * @param schemes SecurtiySchemesObject to create a test API definition for.
   * @returns Instance of Oas.
   */
  function createSecurityOas(schemes: RMOAS.SecuritySchemesObject): Oas {
    // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#securityRequirementObject
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
    const uri = 'http://petstore.swagger.io/v2/pet/1';
    const method = 'DELETE' as RMOAS.HttpMethods;

    const logOperation = petstore.findOperation(uri, method);
    const operation = new Operation(
      petstore.api,
      logOperation.url.path,
      logOperation.url.method,
      logOperation.operation
    );

    expect(operation.getHeaders()).toMatchObject({
      request: ['Authorization', 'api_key'],
      response: [],
    });
  });

  it('should return an object containing content-type request header if media types exist in request body', () => {
    const uri = 'http://petstore.swagger.io/v2/pet';
    const method = 'POST' as RMOAS.HttpMethods;

    const logOperation = petstore.findOperation(uri, method);
    const operation = new Operation(
      petstore.api,
      logOperation.url.path,
      logOperation.url.method,
      logOperation.operation
    );

    expect(operation.getHeaders()).toMatchObject({
      request: ['Authorization', 'Content-Type'],
      response: [],
    });
  });

  it('should return an object containing accept and content-type headers if media types exist in response', () => {
    const uri = 'http://petstore.swagger.io/v2/pet/findByStatus';
    const method = 'GET' as RMOAS.HttpMethods;

    const logOperation = petstore.findOperation(uri, method);
    const operation = new Operation(
      petstore.api,
      logOperation.url.path,
      logOperation.url.method,
      logOperation.operation
    );

    expect(operation.getHeaders()).toMatchObject({
      request: ['Authorization', 'Accept'],
      response: ['Content-Type'],
    });
  });

  it('should return an object containing request headers if security exists', () => {
    const uri = 'http://example.com/multiple-combo-auths';
    const method = 'POST' as RMOAS.HttpMethods;

    const logOperation = multipleSecurities.findOperation(uri, method);
    const operation = new Operation(
      multipleSecurities.api,
      logOperation.url.path,
      logOperation.url.method,
      logOperation.operation
    );

    expect(operation.getHeaders()).toMatchObject({
      request: ['testKey', 'Authorization'],
      response: [],
    });
  });

  it('should return a Cookie header if security is located in cookie scheme', () => {
    const uri = 'http://local-link.com/2.0/users/johnSmith';
    const method = 'GET' as RMOAS.HttpMethods;

    const logOperation = referenceSpec.findOperation(uri, method);
    const operation = new Operation(
      referenceSpec.api,
      logOperation.url.path,
      logOperation.url.method,
      logOperation.operation
    );

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
      const operation = securities.operation(path, method as RMOAS.HttpMethods);
      const headers = operation.getHeaders();
      expect(headers.request).toContain('Authorization');
    });
  });

  it('should target parameter refs and return names if applicable', () => {
    const uri = 'http://local-link.com/2.0/repositories/janeDoe/oas/pullrequests';
    const method = 'GET' as RMOAS.HttpMethods;

    const logOperation = referenceSpec.findOperation(uri, method);
    const operation = new Operation(
      referenceSpec.api,
      logOperation.url.path,
      logOperation.url.method,
      logOperation.operation
    );

    expect(operation.getHeaders()).toMatchObject({
      request: ['hostname', 'Accept'],
      response: ['Content-Type'],
    });
  });

  it('should not fail if there are no responses', () => {
    const uri = 'http://petstore.swagger.io/v2/pet/1';
    const method: RMOAS.HttpMethods = 'delete';

    const logOperation = oas31NoResponses.findOperation(uri, method);
    const operation = new Operation(
      oas31NoResponses.api,
      logOperation.url.path,
      logOperation.url.method,
      logOperation.operation
    );

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
});

describe('#getOperationId()', () => {
  it('should return an operation id if one exists', () => {
    const operation = petstore.operation('/pet/{petId}', 'delete');
    expect(operation.getOperationId()).toBe('deletePet');
  });

  it('should create one if one does not exist', () => {
    const operation = multipleSecurities.operation('/multiple-combo-auths-duped', 'get');
    expect(operation.getOperationId()).toBe('get_multiple-combo-auths-duped');
  });

  describe('`camelCase` option', () => {
    it('should create a camel cased operation ID if one does not exist', () => {
      const operation = multipleSecurities.operation('/multiple-combo-auths-duped', 'get');
      expect(operation.getOperationId({ camelCase: true })).toBe('getMultipleComboAuthsDuped');
    });

    it("should not touch an operationId that doesn't need to be camelCased", () => {
      const spec = Oas.init({
        openapi: '3.1.0',
        info: {
          title: 'testing',
          version: '1.0.0',
        },
        paths: {
          '/anything': {
            get: {
              // This operationID is already fine to use as a JS method accessor so we shouldn't do
              // anything to it.
              operationId: 'ExchangeRESTAPI_GetAccounts',
            },
          },
        },
      });

      const operation = spec.operation('/anything', 'get');
      expect(operation.getOperationId({ camelCase: true })).toBe('ExchangeRESTAPI_GetAccounts');
    });

    it('should clean up an operationId that has non-alphanumeric characters', () => {
      const spec = Oas.init({
        openapi: '3.1.0',
        info: {
          title: 'testing',
          version: '1.0.0',
        },
        paths: {
          '/pet/findByStatus': {
            get: {
              // This mess of a string is intentionally nasty so we can be sure that we're not
              // including anything that wouldn't look right as an operationID for a potential
              // method accessor in `api`.
              operationId: 'find/?*!@#$%^&*()-=.,<>+[]{}\\|pets-by-status',
            },
          },
        },
      });

      const operation = spec.operation('/pet/findByStatus', 'get');
      expect(operation.getOperationId({ camelCase: true })).toBe('findPetsByStatus');
    });

    it('should not double up on a method prefix if the path starts with the method', () => {
      const spec = Oas.init({
        openapi: '3.0.0',
        info: {
          title: 'testing',
          version: '1.0.0',
        },
        paths: {
          '/get-pets': {
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

      const operation = spec.operation('/get-pets', 'get');
      expect(operation.getOperationId({ camelCase: true })).toBe('getPets');
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
      const callback = operation.getCallback(
        'multipleCallback',
        '{$request.multipleMethod.queryUrl}',
        'post'
      ) as Callback;

      expect(callback.hasParameters()).toBe(true);
    });

    it('should return an empty array if there are none', () => {
      const operation = callbackSchema.operation('/callbacks', 'get');
      const callback = operation.getCallback(
        'multipleCallback',
        '{$request.multipleExpression.queryUrl}',
        'post'
      ) as Callback;

      expect(callback.hasParameters()).toBe(false);
    });
  });
});

describe('#getParameters()', () => {
  it('should return parameters', () => {
    const operation = petstore.operation('/pet/{petId}', 'delete');
    expect(operation.getParameters()).toHaveLength(2);
  });

  it('should support retrieving common parameters', () => {
    const operation = parametersCommon.operation('/anything/{id}', 'post');
    expect(operation.getParameters()).toHaveLength(3);
  });

  it('should return an empty array if there are none', () => {
    const operation = petstore.operation('/pet', 'put');
    expect(operation.getParameters()).toHaveLength(0);
  });

  describe('callbacks', () => {
    it('should return parameters', () => {
      const operation = callbackSchema.operation('/callbacks', 'get');
      const callback = operation.getCallback(
        'multipleCallback',
        '{$request.multipleMethod.queryUrl}',
        'post'
      ) as Callback;

      expect(callback.getParameters()).toHaveLength(1);
    });

    it('should support retrieving common parameters', () => {
      const operation = callbackSchema.operation('/callbacks', 'get');
      const callback = operation.getCallback(
        'multipleCallback',
        '{$request.multipleMethod.queryUrl}',
        'get'
      ) as Callback;

      expect(callback.getParameters()).toHaveLength(2);
    });

    it('should return an empty array if there are none', () => {
      const operation = callbackSchema.operation('/callbacks', 'get');
      const callback = operation.getCallback(
        'multipleCallback',
        '{$request.multipleExpression.queryUrl}',
        'post'
      ) as Callback;

      expect(callback.getParameters()).toHaveLength(0);
    });
  });
});

describe('#hasRequiredParameters()', () => {
  it('should return true if some parameters are required', () => {
    expect(readme.operation('/api-specification', 'get').hasRequiredParameters()).toBe(false);
  });

  it('should return false if there are no parameters', () => {
    expect(petstore.operation('/store/inventory', 'get').hasRequiredParameters()).toBe(false);
  });
});

describe('#getParametersAsJsonSchema()', () => {
  it('should return json schema', () => {
    const operation = petstore.operation('/pet', 'put');
    expect(operation.getParametersAsJsonSchema()).toMatchSnapshot();
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
    const operation = petstoreNondereferenced.operation('/pet/findByStatus', 'get');
    expect(operation.getRequestBodyMediaTypes()).toHaveLength(0);
  });

  it('should return false on an operation with a non-dereferenced requestBody $ref pointer', () => {
    const operation = petstoreNondereferenced.operation('/anything', 'post');
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

  it('should return false on an operation with a requestBody that is still a $ref', () => {
    const operation = petstoreNondereferenced.operation('/anything', 'post');
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

  it('should return false on an operation with a non-dereferenced requestBody $ref pointer', () => {
    const operation = petstoreNondereferenced.operation('/anything', 'post');
    expect(operation.getRequestBody('application/json')).toBe(false);
  });

  it('should return the specified requestBody media type', () => {
    const operation = petstore.operation('/pet', 'put');
    expect(operation.getRequestBody('application/json')).toStrictEqual({
      schema: {
        properties: {
          category: expect.objectContaining({ 'x-readme-ref-name': 'Category' }),
          id: expect.any(Object),
          name: expect.any(Object),
          photoUrls: expect.any(Object),
          status: expect.any(Object),
          tags: {
            items: expect.objectContaining({ 'x-readme-ref-name': 'Tag' }),
            type: 'array',
            xml: {
              name: 'tag',
              wrapped: true,
            },
          },
        },
        required: ['name', 'photoUrls'],
        type: 'object',
        xml: {
          name: 'Pet',
        },
        'x-readme-ref-name': 'Pet',
      },
    });
  });

  describe('should support retrieval without a given media type', () => {
    it('should prefer `application/json` media types', () => {
      const operation = petstore.operation('/pet', 'put');
      expect(operation.getRequestBody()).toStrictEqual(['application/json', { schema: expect.any(Object) }]);
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
});

describe('#getResponseStatusCodes()', () => {
  it('should return all valid status codes for a response', () => {
    const operation = petstore.operation('/pet/findByStatus', 'get');
    expect(operation.getResponseStatusCodes()).toStrictEqual(['200', '400']);
  });

  it('should return an empty array if there are no responses', () => {
    const operation = petstore.operation('/pet/findByStatus', 'doesnotexist' as RMOAS.HttpMethods);
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
      'post'
    ) as Callback;

    expect(callback.identifier).toBe('multipleCallback');
    expect(callback.method).toBe('post');
    expect(callback.path).toBe('{$request.multipleMethod.queryUrl}');
    expect(callback).toBeInstanceOf(Callback);

    expect(callback.parentSchema).toStrictEqual({
      summary: '[common] callback summary',
      description: '[common] callback description',
      parameters: expect.any(Array),
      post: {
        requestBody: expect.any(Object),
        responses: expect.any(Object),
      },
      get: {
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
    const callbacks = operation.getCallbacks() as Callback[];
    expect(callbacks).toHaveLength(4);
    callbacks.forEach(callback => expect(callback).toBeInstanceOf(Callback));
  });

  it('should return false if theres no callbacks', () => {
    const operation = petstore.operation('/pet', 'put');
    expect(operation.getCallbacks()).toBe(false);
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

  it('should not fail if the Operation  instance has no API definition', () => {
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
    const operation = Oas.init(undefined).operation('/pet', 'put');
    expect(operation.getExtension('x-readme')).toBeUndefined();
  });
});
