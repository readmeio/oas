const getPath = require('../../src/lib/get-path');
const Oas = require('../../src/oas');

const petstore = require('@readme/oas-examples/3.0/json/petstore');

const swagger = new Oas(petstore);

describe('getPath', () => {
  it('should return path from swagger file', () => {
    const doc = { swagger: { path: '/user/logout' }, api: { method: 'get' } };

    expect(getPath(swagger, doc)).toStrictEqual({
      get: {
        tags: ['user'],
        summary: 'Logs out current logged in user session',
        description: '',
        operationId: 'logoutUser',
        parameters: [],
        responses: {
          default: {
            description: 'successful operation',
          },
        },
      },
    });
  });

  it('should return parameters object if doc does not have swagger property', () => {
    const doc = { api: { method: 'get' } };

    expect(getPath(swagger, doc)).toStrictEqual({
      parameters: [],
    });
  });
});
