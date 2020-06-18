const Oas = require('../src/oas');
const { Operation } = require('../src/oas');
const petstore = require('./__fixtures__/petstore.json');
const petstoreServerVars = require('./__fixtures__/petstore-server-vars.json');
const serverVariables = require('./__fixtures__/server-variables.json');

describe('#url()', () => {
  it('should trim surrounding whitespace from the url', () => {
    expect(new Oas({ servers: [{ url: '  http://example.com/' }] }).url()).toBe('http://example.com');
  });
});

describe('#operation()', () => {
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

  it('should return an operation object with security if it has security', () => {
    const operation = new Oas(petstore).operation('/pet', 'put');
    expect(operation.getSecurity()).toStrictEqual([{ petstore_auth: ['write:pets', 'read:pets'] }]);
  });
});

test('should remove end slash from the server URL', () => {
  expect(new Oas({ servers: [{ url: 'http://example.com/' }] }).url()).toBe('http://example.com');
});

test('should default missing servers array to example.com', () => {
  expect(new Oas({}).url()).toBe('https://example.com');
});

test('should default empty servers array to example.com', () => {
  expect(new Oas({ servers: [] }).url()).toBe('https://example.com');
});

test('should default empty server object to example.com', () => {
  expect(new Oas({ servers: [{}] }).url()).toBe('https://example.com');
});

test('should add https:// if url starts with //', () => {
  expect(new Oas({ servers: [{ url: '//example.com' }] }).url()).toBe('https://example.com');
});

test('should add https:// if url does not start with a protocol', () => {
  expect(new Oas({ servers: [{ url: 'example.com' }] }).url()).toBe('https://example.com');
});

test('should be able to access properties on oas', () => {
  expect(
    new Oas({
      info: { version: '1.0' },
    }).info.version
  ).toBe('1.0');
});

describe('#findOperation()', () => {
  it('should return undefined if no server found', () => {
    const oas = new Oas(petstore);
    const uri = 'http://localhost:3000/pet/1';
    const method = 'delete';

    const res = oas.findOperation(uri, method);
    expect(res).toBeUndefined();
  });

  it('should return undefined if origin is correct but unable to extract path', () => {
    const oas = new Oas(petstore);
    const uri = 'http://petstore.swagger.io/';
    const method = 'get';

    const res = oas.findOperation(uri, method);
    expect(res).toBeUndefined();
  });

  it('should return undefined if no path matches found', () => {
    const oas = new Oas(petstore);
    const uri = 'http://petstore.swagger.io/v2/search';
    const method = 'get';

    const res = oas.findOperation(uri, method);
    expect(res).toBeUndefined();
  });

  it('should return undefined if no matching methods in path', () => {
    const oas = new Oas(petstore);
    const uri = 'http://petstore.swagger.io/v2/pet/1';
    const method = 'patch';

    const res = oas.findOperation(uri, method);
    expect(res).toBeUndefined();
  });

  it('should return a result if found', () => {
    const oas = new Oas(petstore);
    const uri = 'http://petstore.swagger.io/v2/pet/1';
    const method = 'delete';

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
    const uri = 'http://petstore.swagger.io/v2/pet/1/';
    const method = 'delete';

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
    const uri = 'http://petstore.swagger.io/v2/pet/findByStatus?test=2';
    const method = 'get';

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

  it('should return result if in server variable defaults', () => {
    const oas = new Oas(serverVariables);
    const uri = 'https://demo.example.com:443/v2/post';
    const method = 'post';

    const res = oas.findOperation(uri, method);
    expect(res).toMatchObject({
      url: {
        origin: 'https://demo.example.com:443/v2',
        path: '/post',
        nonNormalizedPath: '/post',
        slugs: {},
        method: 'POST',
      },
      operation: {
        summary: 'Should fetch variables from defaults and user values',
        description: '',
        parameters: [],
        responses: {},
      },
    });
  });

  it('should render any target server variable defaults', () => {
    const oas = new Oas(petstoreServerVars);
    const uri = 'http://petstore.swagger.io/v2/pet';
    const method = 'post';

    const res = oas.findOperation(uri, method);
    expect(res).toMatchObject({
      url: {
        origin: 'http://petstore.swagger.io/v2',
        path: '/pet',
        nonNormalizedPath: '/pet',
        slugs: {},
        method: 'POST',
      },
      operation: {
        summary: 'Add a new pet to the store',
        description: '',
        responses: {},
      },
    });
  });
});

// Since this is just a wrapper for findOperation, we don't need to re-test everything that the tests for that does. All
// we need to know is that if findOperation fails this fails, as well as the reverse.
describe('#getOperation()', () => {
  it('should return undefined if #findOperation returns undefined', () => {
    const oas = new Oas(petstore);
    const uri = 'http://localhost:3000/pet/1';
    const method = 'delete';

    expect(oas.getOperation(uri, method)).toBeUndefined();
  });

  it('should return a result if found', () => {
    const oas = new Oas(petstore);
    const uri = 'http://petstore.swagger.io/v2/pet/1';
    const method = 'delete';

    const res = oas.getOperation(uri, method);

    expect(res).toBeInstanceOf(Operation);
    expect(res.path).toBe('/pet/{petId}');
    expect(res.method).toBe('delete');
  });

  it('should have security present on an operation that has it', () => {
    const oas = new Oas(petstore);
    const security = [{ petstore_auth: ['write:pets', 'read:pets'] }];

    expect(petstore.paths['/pet'].put.security).toStrictEqual(security);

    const res = oas.getOperation('http://petstore.swagger.io/v2/pet', 'put');
    expect(res.getSecurity()).toStrictEqual(security);
  });

  it('should handle paths with uri templates', () => {
    const oas = new Oas(petstore);
    const operation = oas.getOperation('http://petstore.swagger.io/v2/store/order/1234', 'get');

    expect(operation.parameters).toHaveLength(1);
    expect(operation.operationId).toBe('getOrderById');
    expect(operation.path).toBe('/store/order/{orderId}');
    expect(operation.method).toBe('get');
  });
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
