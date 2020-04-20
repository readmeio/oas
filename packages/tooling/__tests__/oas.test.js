const Oas = require('../src/oas');
const { Operation } = require('../src/oas');
const petstore = require('./__fixtures__/petstore.json');
const multipleSecurities = require('./__fixtures__/multiple-securities.json');
const referenceSpec = require('./__fixtures__/local-link.json');

describe('class.Oas', () => {
  describe('operation()', () => {
    it('should return an operation object', () => {
      const oas = { paths: { '/path': { get: { a: 1 } } } };
      const operation = new Oas(oas).operation('/path', 'get');
      expect(operation).toBeInstanceOf(Operation);
      expect(operation.a).toBe(1);
      expect(operation.path).toBe('/path');
      expect(operation.method).toBe('get');
    });

    it('should return a default when no operation', () => {
      expect(new Oas({}).operation('/unknown', 'get')).toMatchSnapshot();
    });
  });

  it('should remove end slash from the server URL', () => {
    expect(new Oas({ servers: [{ url: 'http://example.com/' }] }).url()).toBe('http://example.com');
  });

  it('should default missing servers array to example.com', () => {
    expect(new Oas({}).url()).toBe('https://example.com');
  });

  it('should default empty servers array to example.com', () => {
    expect(new Oas({ servers: [] }).url()).toBe('https://example.com');
  });

  it('should default empty server object to example.com', () => {
    expect(new Oas({ servers: [{}] }).url()).toBe('https://example.com');
  });

  it('should add https:// if url starts with //', () => {
    expect(new Oas({ servers: [{ url: '//example.com' }] }).url()).toBe('https://example.com');
  });

  it('should add https:// if url does not start with a protocol', () => {
    expect(new Oas({ servers: [{ url: 'example.com' }] }).url()).toBe('https://example.com');
  });

  it('should be able to access properties on oas', () => {
    expect(
      new Oas({
        info: { version: '1.0' },
      }).info.version
    ).toBe('1.0');
  });

  describe('server variables', () => {
    it('should use defaults', () => {
      expect(
        new Oas({
          servers: [{ url: 'https://example.com/{path}', variables: { path: { default: 'path' } } }],
        }).url()
      ).toBe('https://example.com/path');
    });

    it('should use user variables over defaults', () => {
      expect(
        new Oas(
          {
            servers: [{ url: 'https://{username}.example.com', variables: { username: { default: 'demo' } } }],
          },
          { username: 'domh' }
        ).url()
      ).toBe('https://domh.example.com');
    });

    it('should fetch user variables from keys array', () => {
      expect(
        new Oas(
          {
            servers: [{ url: 'https://{username}.example.com', variables: { username: { default: 'demo' } } }],
          },
          { keys: [{ name: 1, username: 'domh' }] }
        ).url()
      ).toBe('https://domh.example.com');
    });

    it.skip('should fetch user variables from selected app', () => {
      expect(
        new Oas(
          {
            servers: [{ url: 'https://{username}.example.com', variables: { username: { default: 'demo' } } }],
          },
          {
            keys: [
              { name: 1, username: 'domh' },
              { name: 2, username: 'readme' },
            ],
          },
          2
        ).url()
      ).toBe('https://readme.example.com');
    });

    // Test encodeURI
    it('should pass through if no default set', () => {
      expect(new Oas({ servers: [{ url: 'https://example.com/{path}' }] }).url()).toBe('https://example.com/{path}');
    });
  });

  describe('findOperation', () => {
    it('should return undefined if no server found', () => {
      const oas = new Oas(petstore);
      const uri = `http://localhost:3000/pet/1`;
      const method = 'DELETE';

      const res = oas.findOperation(uri, method);
      expect(res).toBeUndefined();
    });

    it('should return undefined if origin is correct but unable to extract path', () => {
      const oas = new Oas(petstore);
      const uri = `http://petstore.swagger.io/`;
      const method = 'GET';

      const res = oas.findOperation(uri, method);
      expect(res).toBeUndefined();
    });

    it('should return undefined if no path matches found', () => {
      const oas = new Oas(petstore);
      const uri = `http://petstore.swagger.io/v2/search`;
      const method = 'GET';

      const res = oas.findOperation(uri, method);
      expect(res).toBeUndefined();
    });

    it('should return undefined if no matching methods in path', () => {
      const oas = new Oas(petstore);
      const uri = `http://petstore.swagger.io/v2/pet/1`;
      const method = 'PATCH';

      const res = oas.findOperation(uri, method);
      expect(res).toBeUndefined();
    });

    it('should return a result if found', () => {
      const oas = new Oas(petstore);
      const uri = `http://petstore.swagger.io/v2/pet/1`;
      const method = 'DELETE';

      const res = oas.findOperation(uri, method);
      expect(res).toMatchObject({
        url: {
          origin: 'http://petstore.swagger.io/v2',
          path: '/pet/:petId',
          slugs: {
            ':petId': '1',
          },
          method: 'DELETE',
        },
      });
    });

    it('should return normally if path is formatted poorly', () => {
      const oas = new Oas(petstore);
      const uri = `http://petstore.swagger.io/v2/pet/1/`;
      const method = 'DELETE';

      const res = oas.findOperation(uri, method);
      expect(res).toMatchObject({
        url: {
          origin: 'http://petstore.swagger.io/v2',
          path: '/pet/:petId',
          slugs: {
            ':petId': '1',
          },
          method: 'DELETE',
        },
      });
    });

    it('should return object if query string is included', () => {
      const oas = new Oas(petstore);
      const uri = `http://petstore.swagger.io/v2/pet/findByStatus?test=2`;
      const method = 'GET';

      const res = oas.findOperation(uri, method);
      expect(res).toMatchObject({
        url: {
          origin: 'http://petstore.swagger.io/v2',
          path: '/pet/findByStatus',
          slugs: {},
          method: 'GET',
        },
      });
    });
  });
});

describe('class.operation', () => {
  describe('getSecurity()', () => {
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
  describe('prepareSecurity()', () => {
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

  describe('getHeaders()', () => {
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
});
