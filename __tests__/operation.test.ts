import type * as RMOAS from '../src/rmoas.types';
import Oas, { Operation, Callback } from '../src';
import petstore from '@readme/oas-examples/3.0/json/petstore.json';
import callbackSchema from './__datasets__/callbacks.json';
import multipleSecurities from './__datasets__/multiple-securities.json';
import referenceSpec from './__datasets__/local-link.json';
import deprecatedSchema from './__datasets__/schema-deprecated.json';
import parametersCommon from './__datasets__/parameters-common.json';
import petstoreNondereferenced from './__datasets__/petstore-nondereferenced.json';
import oas31NoResponses from './__datasets__/3-1-no-responses.json';

describe('#constructor', () => {
  const oas = Oas.init(petstore);

  it('should accept an Oas instance into a definition to be used', () => {
    const operation = new Operation(oas.getDefinition(), '/test', 'get', { summary: 'operation summary' });
    expect(operation.schema).toStrictEqual({ summary: 'operation summary' });
    expect(operation.api).toStrictEqual(petstore);
  });

  it('should accept an API definition', () => {
    const operation = new Operation(oas.getDefinition(), '/test', 'get', { summary: 'operation summary' });
    expect(operation.schema).toStrictEqual({ summary: 'operation summary' });
    expect(operation.api).toStrictEqual(petstore);
  });
});

describe('#getSummary() + #getDescription()', () => {
  it('should return if present', () => {
    const operation = Oas.init(petstore).operation('/pet/findByTags', 'get');

    expect(operation.getSummary()).toBe('Finds Pets by tags');
    expect(operation.getDescription()).toBe(
      'Muliple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.'
    );
  });

  it('should return nothing if not present', () => {
    const operation = Oas.init(referenceSpec).operation('/2.0/users/{username}', 'get');

    expect(operation.getSummary()).toBeUndefined();
    expect(operation.getDescription()).toBeUndefined();
  });

  it('should allow a common summary to override the operation-level summary', () => {
    const operation = Oas.init(parametersCommon).operation('/anything/{id}', 'get');

    expect(operation.getSummary()).toBe('[common] Summary');
    expect(operation.getDescription()).toBe('[common] Description');
  });

  describe('callbacks', () => {
    it('should return a summary if present', () => {
      const operation = Oas.init(callbackSchema).operation('/callbacks', 'get');
      const callback = operation.getCallback('myCallback', '{$request.query.queryUrl}', 'post') as Callback;

      expect(callback.getSummary()).toBe('Callback summary');
      expect(callback.getDescription()).toBe('Callback description');
    });

    it('should return nothing if present', () => {
      const operation = Oas.init(callbackSchema).operation('/callbacks', 'get');
      const callback = operation.getCallback(
        'multipleCallback',
        '{$request.multipleExpression.queryUrl}',
        'post'
      ) as Callback;

      expect(callback.getSummary()).toBeUndefined();
      expect(callback.getDescription()).toBeUndefined();
    });

    it('should allow a common summary to override the callback-level summary', () => {
      const operation = Oas.init(callbackSchema).operation('/callbacks', 'get');
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
    expect(Oas.init(petstore).operation('/pet', 'post').getContentType()).toBe('application/json');
  });

  it('should prioritise json if it exists', () => {
    expect(
      new Operation(Oas.init(petstore).getDefinition(), '/body', 'get', {
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
      new Operation(Oas.init(petstore).getDefinition(), '/body', 'get', {
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
        ...petstore,
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
    const op = new Operation(Oas.init(petstore).getDefinition(), '/form-urlencoded', 'get', {
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
    const op = new Operation(Oas.init(petstore).getDefinition(), '/multipart', 'get', {
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
    const op = new Operation(Oas.init(petstore).getDefinition(), '/json', 'get', {
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
    const op = new Operation(Oas.init(petstore).getDefinition(), '/xml', 'get', {
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

  it('should default to empty array if no securitySchemes are defined', () => {
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

  it('should default to empty array if no securitySchemes are defined', () => {
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
    const operation = oas.operation(path, method);

    expect(operation.prepareSecurity()).toStrictEqual({
      Basic: [oas.api.components.securitySchemes.securityScheme],
    });
  });

  it('http/bearer: should return with a type of Bearer', () => {
    const oas = createSecurityOas({
      securityScheme: {
        type: 'http',
        scheme: 'bearer',
      },
    });
    const operation = oas.operation(path, method);

    expect(operation.prepareSecurity()).toStrictEqual({
      Bearer: [oas.api.components.securitySchemes.securityScheme],
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
    const operation = oas.operation(path, method);

    expect(operation.prepareSecurity()).toStrictEqual({
      Query: [oas.api.components.securitySchemes.securityScheme],
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
    const operation = oas.operation(path, method);

    expect(operation.prepareSecurity()).toStrictEqual({
      Header: [oas.api.components.securitySchemes.securityScheme],
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
    const operation = oas.operation(path, method);

    expect(operation.prepareSecurity()).toStrictEqual({
      Cookie: [oas.api.components.securitySchemes.securityScheme],
    });
  });

  it('should work for petstore', () => {
    const operation = Oas.init(petstore).operation('/pet', 'post');

    expect(operation.prepareSecurity()).toMatchSnapshot();
  });

  it('should work for multiple securities (||)', () => {
    const operation = Oas.init(multipleSecurities).operation('/or-security', 'post');

    expect(Object.keys(operation.prepareSecurity())).toHaveLength(2);
  });

  it('should work for multiple securities (&&)', () => {
    const operation = Oas.init(multipleSecurities).operation('/and-security', 'post');

    expect(Object.keys(operation.prepareSecurity())).toHaveLength(2);
  });

  it('should work for multiple securities (&& and ||)', () => {
    const operation = Oas.init(multipleSecurities).operation('/and-or-security', 'post');

    expect(operation.prepareSecurity().OAuth2).toHaveLength(2);
    expect(operation.prepareSecurity().Header).toHaveLength(1);
  });

  it('should dedupe securities in within an && and || situation', () => {
    const operation = Oas.init(multipleSecurities).operation('/multiple-combo-auths-duped', 'get');

    expect(operation.prepareSecurity().Bearer).toHaveLength(1);
    expect(operation.prepareSecurity().Header).toHaveLength(2);
  });

  it.todo('should set a `key` property');

  it.todo('should throw if attempting to use a non-existent scheme');

  it('should return empty object if no security', () => {
    const operation = Oas.init(multipleSecurities).operation('/no-auth', 'post');
    expect(Object.keys(operation.prepareSecurity())).toHaveLength(0);
  });

  it('should return empty object if security scheme doesnt exist', () => {
    const operation = Oas.init(multipleSecurities).operation('/unknown-scheme', 'post');
    expect(Object.keys(operation.prepareSecurity())).toHaveLength(0);
  });

  it('should return empty if security scheme type doesnt exist', () => {
    const operation = Oas.init(multipleSecurities).operation('/unknown-auth-type', 'post');
    expect(Object.keys(operation.prepareSecurity())).toHaveLength(0);
  });
});

describe('#getHeaders()', () => {
  it('should return an object containing request headers if params exist', () => {
    const oas = Oas.init(petstore);
    const uri = `http://petstore.swagger.io/v2/pet/1`;
    const method = 'DELETE' as RMOAS.HttpMethods;

    const logOperation = oas.findOperation(uri, method);
    const operation = new Operation(oas.api, logOperation.url.path, logOperation.url.method, logOperation.operation);

    expect(operation.getHeaders()).toMatchObject({
      request: ['api_key'],
      response: [],
    });
  });

  it('should return an object containing content-type request header if media types exist in request body', () => {
    const oas = Oas.init(petstore);
    const uri = `http://petstore.swagger.io/v2/pet`;
    const method = 'POST' as RMOAS.HttpMethods;

    const logOperation = oas.findOperation(uri, method);
    const operation = new Operation(oas.api, logOperation.url.path, logOperation.url.method, logOperation.operation);

    expect(operation.getHeaders()).toMatchObject({
      request: ['Content-Type'],
      response: [],
    });
  });

  it('should return an object containing accept and content-type headers if media types exist in response', () => {
    const oas = Oas.init(petstore);
    const uri = `http://petstore.swagger.io/v2/pet/findByStatus`;
    const method = 'GET' as RMOAS.HttpMethods;

    const logOperation = oas.findOperation(uri, method);
    const operation = new Operation(oas.api, logOperation.url.path, logOperation.url.method, logOperation.operation);

    expect(operation.getHeaders()).toMatchObject({
      request: ['Accept'],
      response: ['Content-Type'],
    });
  });

  it('should return an object containing request headers if security exists', () => {
    const oas = Oas.init(multipleSecurities);
    const uri = 'http://example.com/multiple-combo-auths';
    const method = 'POST' as RMOAS.HttpMethods;

    const logOperation = oas.findOperation(uri, method);
    const operation = new Operation(oas.api, logOperation.url.path, logOperation.url.method, logOperation.operation);

    expect(operation.getHeaders()).toMatchObject({
      request: ['testKey'],
      response: [],
    });
  });

  it('should return a Cookie header if security is located in cookie scheme', () => {
    const oas = Oas.init(referenceSpec);
    const uri = 'http://local-link.com/2.0/users/johnSmith';
    const method = 'GET' as RMOAS.HttpMethods;

    const logOperation = oas.findOperation(uri, method);
    const operation = new Operation(oas.api, logOperation.url.path, logOperation.url.method, logOperation.operation);

    expect(operation.getHeaders()).toMatchObject({
      request: ['Authorization', 'Cookie', 'Accept'],
      response: ['Content-Type'],
    });
  });

  it('should target parameter refs and return names if applicable', async () => {
    const oas = Oas.init(referenceSpec);
    await oas.dereference();

    const uri = 'http://local-link.com/2.0/repositories/janeDoe/oas/pullrequests';
    const method = 'GET' as RMOAS.HttpMethods;

    const logOperation = oas.findOperation(uri, method);
    const operation = new Operation(oas.api, logOperation.url.path, logOperation.url.method, logOperation.operation);
    expect(operation.getHeaders()).toMatchObject({
      request: ['hostname', 'Accept'],
      response: ['Content-Type'],
    });
  });

  it('should not fail if there are no responses', () => {
    const oas = Oas.init(oas31NoResponses);
    const uri = `http://petstore.swagger.io/v2/pet/1`;
    const method: RMOAS.HttpMethods = 'delete';

    const logOperation = oas.findOperation(uri, method);
    const operation = new Operation(oas.api, logOperation.url.path, logOperation.url.method, logOperation.operation);

    expect(operation.getHeaders()).toMatchObject({
      request: ['api_key'],
      response: [],
    });
  });
});

describe('#hasOperationId()', () => {
  it('should return true if one exists', () => {
    const operation = Oas.init(petstore).operation('/pet/{petId}', 'delete');
    expect(operation.hasOperationId()).toBe(true);
  });

  it('should return false if one does not exist', () => {
    const operation = Oas.init(multipleSecurities).operation('/multiple-combo-auths-duped', 'get');
    expect(operation.hasOperationId()).toBe(false);
  });
});

describe('#getOperationId()', () => {
  it('should return an operation id if one exists', () => {
    const operation = Oas.init(petstore).operation('/pet/{petId}', 'delete');
    expect(operation.getOperationId()).toBe('deletePet');
  });

  it('should create one if one does not exist', () => {
    const operation = Oas.init(multipleSecurities).operation('/multiple-combo-auths-duped', 'get');
    expect(operation.getOperationId()).toBe('get_multiple-combo-auths-duped');
  });
});

describe('#getTags()', () => {
  it('should return tags if tags exist', () => {
    const operation = Oas.init(petstore).operation('/pet', 'post');

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
    const operation = Oas.init(deprecatedSchema).operation('/anything', 'post');
    expect(operation.isDeprecated()).toBe(true);
  });

  it('should return false if no deprecated flag is present', () => {
    const operation = Oas.init(petstore).operation('/pet/{petId}', 'delete');
    expect(operation.isDeprecated()).toBe(false);
  });
});

describe('#getParameters()', () => {
  it('should return parameters', () => {
    const operation = Oas.init(petstore).operation('/pet/{petId}', 'delete');
    expect(operation.getParameters()).toHaveLength(2);
  });

  it('should return an empty array if there are none', () => {
    const operation = Oas.init(petstore).operation('/pet', 'put');
    expect(operation.getParameters()).toHaveLength(0);
  });
});

describe('#getParametersAsJsonSchema()', () => {
  it('should return json schema', () => {
    const operation = Oas.init(petstore).operation('/pet', 'put');
    expect(operation.getParametersAsJsonSchema()).toMatchSnapshot();
  });
});

describe('#hasRequestBody()', () => {
  it('should return true on an operation with a requestBody', () => {
    const operation = Oas.init(petstore).operation('/pet', 'put');
    expect(operation.hasRequestBody()).toBe(true);
  });

  it('should return false on an operation without a requestBody', () => {
    const operation = Oas.init(petstore).operation('/pet/findByStatus', 'get');
    expect(operation.hasRequestBody()).toBe(false);
  });
});

describe('#getRequestBodyMediaTypes()', () => {
  it('should return an empty array if no requestBody is present', () => {
    const operation = Oas.init(petstoreNondereferenced).operation('/pet/findByStatus', 'get');
    expect(operation.getRequestBodyMediaTypes()).toHaveLength(0);
  });

  it('should return false on an operation with a non-dereferenced requestBody $ref pointer', () => {
    const operation = Oas.init(petstoreNondereferenced).operation('/anything', 'post');
    expect(operation.getRequestBodyMediaTypes()).toHaveLength(0);
  });

  it('should return the available requestBody media types', async () => {
    const oas = Oas.init(petstore);
    await oas.dereference();

    const operation = oas.operation('/pet', 'put');
    expect(operation.getRequestBodyMediaTypes()).toStrictEqual(['application/json', 'application/xml']);
  });
});

describe('#getRequestBody()', () => {
  it('should return false on an operation without a requestBody', async () => {
    const oas = Oas.init(petstore);
    await oas.dereference();

    const operation = oas.operation('/pet/findByStatus', 'get');
    expect(operation.getRequestBody('application/json')).toBe(false);
  });

  it('should return false on an operation without the specified requestBody media type', async () => {
    const oas = Oas.init(petstore);
    await oas.dereference();

    const operation = oas.operation('/pet', 'put');
    expect(operation.getRequestBody('text/xml')).toBe(false);
  });

  it('should return false on an operation with a non-dereferenced requestBody $ref pointer', () => {
    const operation = Oas.init(petstoreNondereferenced).operation('/anything', 'post');
    expect(operation.getRequestBody('application/json')).toBe(false);
  });

  it('should return the specified requestBody media type', async () => {
    const oas = Oas.init(petstore);
    await oas.dereference();

    const operation = oas.operation('/pet', 'put');
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
    it('should prefer `application/json` media types', async () => {
      const oas = Oas.init(petstore);
      await oas.dereference();

      const operation = oas.operation('/pet', 'put');
      expect(operation.getRequestBody()).toStrictEqual(['application/json', { schema: expect.any(Object) }]);
    });

    it('should pick first available if no json-like media types present', async () => {
      const oas = Oas.init(petstore);
      await oas.dereference();

      const operation = oas.operation('/pet/{petId}', 'post');
      expect(operation.getRequestBody()).toStrictEqual([
        'application/x-www-form-urlencoded',
        { schema: expect.any(Object) },
      ]);
    });
  });
});

describe('#getResponseByStatusCode()', () => {
  it('should return false if the status code doesnt exist', () => {
    const operation = Oas.init(petstore).operation('/pet/findByStatus', 'get');
    expect(operation.getResponseByStatusCode(202)).toBe(false);
  });

  it('should return the response', async () => {
    const oas = Oas.init(petstore);
    await oas.dereference();

    const operation = oas.operation('/pet/findByStatus', 'get');
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
    const operation = Oas.init(petstore).operation('/pet/findByStatus', 'get');
    expect(operation.getResponseStatusCodes()).toStrictEqual(['200', '400']);
  });

  it('should return an empty array if there are no responses', () => {
    // @ts-expect-error The easiest way to test this is to create an `Operation` instance of no data, which this does.
    const operation = Oas.init(petstore).operation('/pet/findByStatus', 'doesnotexist');
    expect(operation.getResponseStatusCodes()).toStrictEqual([]);
  });
});

describe('#hasCallbacks()', () => {
  it('should return true on an operation with callbacks', () => {
    const operation = Oas.init(callbackSchema).operation('/callbacks', 'get');
    expect(operation.hasCallbacks()).toBe(true);
  });

  it('should return false on an operation without callbacks', () => {
    const operation = Oas.init(petstore).operation('/pet/findByStatus', 'get');
    expect(operation.hasCallbacks()).toBe(false);
  });
});

describe('#getCallback()', () => {
  it('should return an operation from a callback if it exists', () => {
    const operation = Oas.init(callbackSchema).operation('/callbacks', 'get');
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
      post: {
        requestBody: expect.any(Object),
        responses: expect.any(Object),
      },
      get: {
        responses: expect.any(Object),
      },
    });
  });

  it('should return false if that callback doesnt exist', () => {
    const operation = Oas.init(callbackSchema).operation('/callbacks', 'get');
    expect(operation.getCallback('fakeCallback', 'doesntExist', 'get')).toBe(false);
  });
});

describe('#getCallbacks()', () => {
  it('should return an array of operations created from each callback', () => {
    const operation = Oas.init(callbackSchema).operation('/callbacks', 'get');
    const callbacks = operation.getCallbacks() as Array<Callback>;
    expect(callbacks).toHaveLength(4);
    callbacks.forEach(callback => expect(callback).toBeInstanceOf(Callback));
  });

  it('should return false if theres no callbacks', () => {
    const operation = Oas.init(petstore).operation('/pet', 'put');
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
                  // Instead of `post`, `get`, etc being here we just have `summary` and since that isn't a valid HTTP
                  // method we don't have any usable callbacks here to pull back with `getCallbacks`().
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
    const operation = Oas.init(callbackSchema).operation('/callbacks', 'get');
    expect(operation.getCallbackExamples()).toHaveLength(3);
  });

  it('should an empty array if there are no callback examples', () => {
    const operation = Oas.init(petstore).operation('/pet', 'put');
    expect(operation.getCallbackExamples()).toHaveLength(0);
  });
});

describe('#hasExtension()', () => {
  it('should return true if the extension exists', () => {
    const operation = Oas.init(petstore).operation('/pet', 'put');
    operation.schema['x-samples-languages'] = false;

    expect(operation.hasExtension('x-samples-languages')).toBe(true);
  });

  it("should return false if the extension doesn't exist", () => {
    const operation = Oas.init(deprecatedSchema).operation('/pet', 'put');
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
      ...petstore,
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
    const operation = Oas.init(deprecatedSchema).operation('/pet', 'put');
    expect(operation.getExtension('x-readme')).toBeUndefined();
  });

  it('should not fail if the Operation instance has no API definition', () => {
    const operation = Oas.init(undefined).operation('/pet', 'put');
    expect(operation.getExtension('x-readme')).toBeUndefined();
  });
});
