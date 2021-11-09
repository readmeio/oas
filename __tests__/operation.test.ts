import type * as RMOAS from '../src/rmoas.types';
import Oas, { Operation, Callback } from '../src';
import petstore from '@readme/oas-examples/3.0/json/petstore.json';
import callbackSchema from './__datasets__/callbacks.json';
import multipleSecurities from './__datasets__/multiple-securities.json';
import referenceSpec from './__datasets__/local-link.json';
import deprecatedSchema from './__datasets__/schema-deprecated.json';

describe('#constructor', () => {
  const oas = Oas.init(petstore);

  it('should accept an Oas instance into a definition to be used', () => {
    const operation = new Operation(oas, '/test', 'get', { summary: 'operation summary' });
    expect(operation.schema).toStrictEqual({ summary: 'operation summary' });
    expect(operation.api).toStrictEqual(petstore);
  });

  it('should accept an API definition', () => {
    const operation = new Operation(oas.getDefinition(), '/test', 'get', { summary: 'operation summary' });
    expect(operation.schema).toStrictEqual({ summary: 'operation summary' });
    expect(operation.api).toStrictEqual(petstore);
  });
});

describe('#getContentType()', () => {
  it('should return the content type on an operation', () => {
    expect(Oas.init(petstore).operation('/pet', 'post').getContentType()).toBe('application/json');
  });

  it('should prioritise json if it exists', () => {
    expect(
      new Operation(Oas.init(petstore), '/body', 'get', {
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
      new Operation(Oas.init(petstore), '/body', 'get', {
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
      }),
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
    const op = new Operation(Oas.init(petstore), '/form-urlencoded', 'get', {
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
    const op = new Operation(Oas.init(petstore), '/multipart', 'get', {
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
    const op = new Operation(Oas.init(petstore), '/json', 'get', {
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
    const op = new Operation(Oas.init(petstore), '/xml', 'get', {
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

describe('#getResponseByStatusCode()', () => {
  it('should return false if the status code doesnt exist', () => {
    const operation = Oas.init(petstore).operation('/pet/findByStatus', 'get');
    expect(operation.getResponseByStatusCode(202)).toBe(false);
  });

  it('should return the response', () => {
    const operation = Oas.init(petstore).operation('/pet/findByStatus', 'get');
    expect(operation.getResponseByStatusCode(200)).toStrictEqual({
      content: {
        'application/json': {
          schema: {
            items: {
              $ref: '#/components/schemas/Pet',
            },
            type: 'array',
          },
        },
        'application/xml': {
          schema: {
            items: {
              $ref: '#/components/schemas/Pet',
            },
            type: 'array',
          },
        },
      },
      description: 'successful operation',
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
    const callback = operation.getCallback('myCallback', '{$request.query.queryUrl}', 'post') as Callback;

    expect(callback.identifier).toBe('myCallback');
    expect(callback.method).toBe('post');
    expect(callback.path).toBe('{$request.query.queryUrl}');
    expect(callback).toBeInstanceOf(Callback);
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
});
