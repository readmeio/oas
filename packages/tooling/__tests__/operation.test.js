const Oas = require('../src/oas');
const Operation = require('../src/operation');
const petstore = require('./__fixtures__/petstore.json');
const multipleSecurities = require('./__fixtures__/multiple-securities.json');
const referenceSpec = require('./__fixtures__/local-link.json');

describe('#getSecurity()', () => {
  const security = [{ auth: [] }];

  it('should return the security on this endpoint', () => {
    expect(
      new Oas({
        info: { version: '1.0' },
        paths: {
          '/things': {
            post: {
              security,
            },
          },
        },
      })
        .operation('/things', 'post')
        .getSecurity()
    ).toBe(security);
  });

  it('should fallback to global security', () => {
    expect(
      new Oas({
        info: { version: '1.0' },
        paths: {
          '/things': {
            post: {},
          },
        },
        security,
      })
        .operation('/things', 'post')
        .getSecurity()
    ).toBe(security);
  });

  it('should default to empty array', () => {
    expect(
      new Oas({
        info: { version: '1.0' },
        paths: {
          '/things': {
            post: {},
          },
        },
      })
        .operation('/things', 'post')
        .getSecurity()
    ).toStrictEqual([]);
  });
});

// https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#securitySchemeObject
describe('#prepareSecurity()', () => {
  const path = '/auth';
  const method = 'get';

  function createSecurityOas(schemes) {
    // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#securityRequirementObject
    const security = Object.keys(schemes).map(scheme => {
      return { [scheme]: [] };
    });

    return new Oas({
      components: { securitySchemes: schemes },
      paths: {
        [path]: {
          [method]: { security },
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
      Basic: [oas.components.securitySchemes.securityScheme],
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
      Bearer: [oas.components.securitySchemes.securityScheme],
    });
  });

  it('apiKey/query: should return with a type of Query', () => {
    const oas = createSecurityOas({
      securityScheme: {
        type: 'apiKey',
        in: 'query',
      },
    });
    const operation = oas.operation(path, method);

    expect(operation.prepareSecurity()).toStrictEqual({
      Query: [oas.components.securitySchemes.securityScheme],
    });
  });

  it('apiKey/header: should return with a type of Header', () => {
    const oas = createSecurityOas({
      securityScheme: {
        type: 'apiKey',
        in: 'header',
      },
    });
    const operation = oas.operation(path, method);

    expect(operation.prepareSecurity()).toStrictEqual({
      Header: [oas.components.securitySchemes.securityScheme],
    });
  });

  it('should work for petstore', () => {
    const operation = new Oas(petstore).operation('/pet', 'post');

    expect(operation.prepareSecurity()).toMatchSnapshot();
  });

  it('should work for multiple securities (||)', () => {
    const operation = new Oas(multipleSecurities).operation('/or-security', 'post');

    expect(Object.keys(operation.prepareSecurity())).toHaveLength(2);
  });

  it('should work for multiple securities (&&)', () => {
    const operation = new Oas(multipleSecurities).operation('/and-security', 'post');

    expect(Object.keys(operation.prepareSecurity())).toHaveLength(2);
  });

  it('should work for multiple securities (&& and ||)', () => {
    const operation = new Oas(multipleSecurities).operation('/and-or-security', 'post');

    expect(operation.prepareSecurity().OAuth2).toHaveLength(2);
    expect(operation.prepareSecurity().Header).toHaveLength(1);
  });

  it.todo('should set a `key` property');

  // TODO We dont currently support cookies?
  it.todo('apiKey/cookie: should return with a type of Cookie');

  it.todo('should throw if attempting to use a non-existent scheme');

  it('should return empty object if no security', () => {
    const operation = new Oas(multipleSecurities).operation('/no-auth', 'post');
    expect(Object.keys(operation.prepareSecurity())).toHaveLength(0);
  });

  it('should return empty object if security scheme doesnt exist', () => {
    const operation = new Oas(multipleSecurities).operation('/unknown-scheme', 'post');
    expect(Object.keys(operation.prepareSecurity())).toHaveLength(0);
  });

  it('should return empty if security scheme type doesnt exist', () => {
    const operation = new Oas(multipleSecurities).operation('/unknown-auth-type', 'post');
    expect(Object.keys(operation.prepareSecurity())).toHaveLength(0);
  });
});

describe('#getHeaders()', () => {
  it('should return an object containing request headers if params exist', () => {
    const oas = new Oas(petstore);
    const uri = `http://petstore.swagger.io/v2/pet/1`;
    const method = 'DELETE';

    const logOperation = oas.findOperation(uri, method);
    const operation = new Operation(oas, logOperation.url.path, logOperation.url.method, logOperation.operation);

    expect(operation.getHeaders()).toMatchObject({
      request: ['testKey'],
      response: [],
    });
  });

  it('should return an object containing content-type request header if media types exist in request body', () => {
    const oas = new Oas(petstore);
    const uri = `http://petstore.swagger.io/v2/pet`;
    const method = 'POST';

    const logOperation = oas.findOperation(uri, method);
    const operation = new Operation(oas, logOperation.url.path, logOperation.url.method, logOperation.operation);

    expect(operation.getHeaders(true)).toMatchObject({
      request: ['Content-Type'],
      response: [],
    });
  });

  it('should return an object containing accept and content-type headers if media types exist in response', () => {
    const oas = new Oas(petstore);
    const uri = `http://petstore.swagger.io/v2/pet/findByStatus`;
    const method = 'GET';

    const logOperation = oas.findOperation(uri, method);
    const operation = new Operation(oas, logOperation.url.path, logOperation.url.method, logOperation.operation);

    expect(operation.getHeaders(true)).toMatchObject({
      request: ['Accept'],
      response: ['Content-Type'],
    });
  });

  it('should return an object containing request headers if security exists', () => {
    const oas = new Oas(multipleSecurities);
    const uri = 'http://example.com/multiple-combo-auths';
    const method = 'POST';

    const logOperation = oas.findOperation(uri, method);
    const operation = new Operation(oas, logOperation.url.path, logOperation.url.method, logOperation.operation);

    expect(operation.getHeaders()).toMatchObject({
      request: ['testKey'],
      response: [],
    });
  });

  it('should return a Cookie header if security is located in cookie scheme', () => {
    const oas = new Oas(referenceSpec);
    const uri = 'http://local-link.com/2.0/users/johnSmith';
    const method = 'GET';

    const logOperation = oas.findOperation(uri, method);
    const operation = new Operation(oas, logOperation.url.path, logOperation.url.method, logOperation.operation);

    expect(operation.getHeaders()).toMatchObject({
      request: ['Cookie', 'Authorization', 'Accept'],
      response: ['Content-Type'],
    });
  });

  it('should target parameter refs and return names if applicable', () => {
    const oas = new Oas(referenceSpec);
    const uri = 'http://local-link.com/2.0/repositories/janeDoe/oas/pullrequests';
    const method = 'GET';

    const logOperation = oas.findOperation(uri, method);
    const operation = new Operation(oas, logOperation.url.path, logOperation.url.method, logOperation.operation);
    expect(operation.getHeaders()).toMatchObject({
      request: ['hostname', 'Accept'],
      response: ['Content-Type'],
    });
  });
});
