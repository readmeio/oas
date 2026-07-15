import type { HttpMethods, OASDocument } from '../src/types.js';

import petstoreSpec from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import serverPathLevelSpec from '@readme/oas-examples/3.0/json/server-path-level.json' with { type: 'json' };
import operationServersSpec from '@readme/oas-examples/3.0/json/server-variables.json' with { type: 'json' };
import webhooksSpec from '@readme/oas-examples/3.1/json/webhooks.json' with { type: 'json' };
import { beforeEach, describe, expect, it } from 'vitest';

import Oas from '../src/index.js';
import { Operation, Webhook } from '../src/operation/index.js';

import multipleSecuritiesSpec from './__datasets__/multiple-securities.json' with { type: 'json' };
import orderedTagsSpec from './__datasets__/ordered-tags.json' with { type: 'json' };
import pathMatchingQuirksSpec from './__datasets__/path-matching-quirks.json' with { type: 'json' };
import pathVariableQuirksSpec from './__datasets__/path-variable-quirks.json' with { type: 'json' };
import pathItemsComponentSpec from './__datasets__/pathitems-component.json' with { type: 'json' };
import petstoreServerVarsSpec from './__datasets__/petstore-server-vars.json' with { type: 'json' };
import serverVariablesSpec from './__datasets__/server-variables.json' with { type: 'json' };
import { createOasForPaths } from './__fixtures__/create-oas.js' with { type: 'json' };

describe('Oas', () => {
  let multipleSecurities: Oas;
  let orderedTags: Oas;
  let pathMatchingQuirks: Oas;
  let pathVariableQuirks: Oas;
  let petstore: Oas;
  let serverVariables: Oas;
  let webhooks: Oas;

  beforeEach(() => {
    multipleSecurities = Oas.init(structuredClone(multipleSecuritiesSpec));
    orderedTags = Oas.init(structuredClone(orderedTagsSpec));
    pathMatchingQuirks = Oas.init(structuredClone(pathMatchingQuirksSpec));
    pathVariableQuirks = Oas.init(structuredClone(pathVariableQuirksSpec));
    petstore = Oas.init(structuredClone(petstoreSpec));
    serverVariables = Oas.init(structuredClone(serverVariablesSpec));
    webhooks = Oas.init(structuredClone(webhooksSpec));
  });

  it('should be able to access properties on the class instance', () => {
    expect(petstore.api.info.version).toBe('1.0.0');
  });

  it('should be able to accept an `OASDocument` in the constructor', () => {
    expect(new Oas(petstoreSpec as OASDocument).getVersion()).toBe('3.0.0');
  });

  it('should be able to accept a string in the constructor', () => {
    expect(new Oas(JSON.stringify(petstoreSpec)).getVersion()).toBe('3.0.0');
  });

  describe('#init()', () => {
    it('should return an instance of Oas with a user', () => {
      const user = { username: 'buster' };
      const oas = Oas.init(petstoreSpec, user);

      expect(oas).toBeInstanceOf(Oas);
      expect(oas.api).toStrictEqual(petstoreSpec);
      expect(oas.user).toStrictEqual(user);
    });
  });

  describe('.getVersion()', () => {
    it('should be able to identify an OpenAPI definition', () => {
      expect(petstore.getVersion()).toBe('3.0.0');
      expect(webhooks.getVersion()).toBe('3.1.0');
    });

    it('should throw an error if unable to identify', () => {
      expect(() => {
        return Oas.init({}).getVersion();
      }).toThrow('Unable to recognize what specification version this API definition conforms to.');
    });
  });

  describe('.url([selected])', () => {
    it('should trim surrounding whitespace from the url', () => {
      expect(Oas.init({ servers: [{ url: '  http://example.com/' }] }).url()).toBe('http://example.com');
    });

    it('should remove end slash from the server URL', () => {
      expect(Oas.init({ servers: [{ url: 'http://example.com/' }] }).url()).toBe('http://example.com');
    });

    it('should default missing servers array to example.com', () => {
      expect(Oas.init({}).url()).toBe('https://example.com');
    });

    it('should default empty servers array to example.com', () => {
      expect(Oas.init({ servers: [] }).url()).toBe('https://example.com');
    });

    it('should default empty server object to example.com', () => {
      expect(Oas.init({ servers: [{}] }).url()).toBe('https://example.com');
    });

    it('should add https:// if url starts with //', () => {
      expect(Oas.init({ servers: [{ url: '//example.com' }] }).url()).toBe('https://example.com');
    });

    it('should add https:// if url does not start with a protocol', () => {
      expect(Oas.init({ servers: [{ url: 'example.com' }] }).url()).toBe('https://example.com');
    });

    it('should accept an index for servers selection', () => {
      expect(Oas.init({ servers: [{ url: 'example.com' }, { url: 'https://api.example.com' }] }).url(1)).toBe(
        'https://api.example.com',
      );
    });

    it('should default to first if selected is not valid', () => {
      expect(Oas.init({ servers: [{ url: 'https://example.com' }] }).url(10)).toBe('https://example.com');
    });

    it('should make example.com the origin if none is present', () => {
      expect(Oas.init({ servers: [{ url: '/api/v3' }] }).url()).toBe('https://example.com/api/v3');
    });

    describe('server variables', () => {
      const oas = new Oas({
        openapi: '3.0.0',
        info: {
          title: 'testing',
          version: '1.0.0',
        },
        servers: [
          {
            url: 'https://{name}.example.com:{port}/{basePath}',
            variables: {
              name: {
                default: 'demo',
              },
              port: {
                default: '443',
              },
              basePath: {
                default: 'v2',
              },
            },
          },
        ],
        paths: {},
      });

      it('should use default variables if no variables are supplied', () => {
        expect(oas.url(0)).toBe('https://demo.example.com:443/v2');
      });

      it('should prefill in variables if supplied', () => {
        expect(oas.url(0, { basePath: 'v3', name: 'subdomain', port: '8080' })).toBe(
          'https://subdomain.example.com:8080/v3',
        );
      });

      it('should use defaults', () => {
        expect(
          new Oas({
            openapi: '3.0.0',
            info: {
              title: 'testing',
              version: '1.0.0',
            },
            servers: [{ url: 'https://example.com/{path}', variables: { path: { default: 'path' } } }],
            paths: {},
          }).url(),
        ).toBe('https://example.com/path');
      });

      it('should use user variables over defaults', () => {
        expect(
          new Oas(
            {
              openapi: '3.0.0',
              info: {
                title: 'testing',
                version: '1.0.0',
              },
              servers: [{ url: 'https://{username}.example.com', variables: { username: { default: 'demo' } } }],
              paths: {},
            },
            { username: 'domh' },
          ).url(),
        ).toBe('https://domh.example.com');
      });

      it('should use user variables over defaults even if user payload has keys array', () => {
        expect(
          new Oas(
            {
              openapi: '3.0.0',
              info: {
                title: 'testing',
                version: '1.0.0',
              },
              servers: [{ url: 'https://{username}.example.com', variables: { username: { default: 'demo' } } }],
              paths: {},
            },
            {
              username: 'domh',
              keys: [
                { apiKey: '123456', name: 'app-1' },
                { apiKey: '7890', name: 'app-2' },
              ],
            },
          ).url(),
        ).toBe('https://domh.example.com');
      });

      it('should use supplied variables over user variables', () => {
        expect(
          new Oas(
            {
              openapi: '3.0.0',
              info: {
                title: 'testing',
                version: '1.0.0',
              },
              servers: [{ url: 'https://{username}.example.com', variables: { username: { default: 'demo' } } }],
              paths: {},
            },
            { username: 'domh' },
          ).url(0, { username: 'owlbert' }),
        ).toBe('https://owlbert.example.com');
      });

      it('should fetch user variables from keys array', () => {
        expect(
          new Oas(
            {
              openapi: '3.0.0',
              info: {
                title: 'testing',
                version: '1.0.0',
              },
              servers: [{ url: 'https://{username}.example.com', variables: { username: { default: 'demo' } } }],
              paths: {},
            },
            { keys: [{ name: 1, username: 'domh' }] },
          ).url(),
        ).toBe('https://domh.example.com');
      });

      it('should look for variables in selected server', () => {
        expect(
          new Oas({
            openapi: '3.0.0',
            info: {
              title: 'testing',
              version: '1.0.0',
            },
            servers: [
              { url: 'https://{username1}.example.com', variables: { username1: { default: 'demo1' } } },
              { url: 'https://{username2}.example.com', variables: { username2: { default: 'demo2' } } },
            ],
            paths: {},
          }).url(1),
        ).toBe('https://demo2.example.com');
      });

      // Test encodeURI
      it('should pass through if no default set', () => {
        expect(Oas.init({ servers: [{ url: 'https://example.com/{path}' }] }).url()).toBe('https://example.com/{path}');
      });
    });
  });

  describe('.replaceUrl()', () => {
    const url = 'https://{name}.example.com:{port}/{basePath}';

    it('should pull data from user variables', () => {
      const oas = Oas.init({}, { name: 'mysubdomain', port: '8000', basePath: 'v5' });

      expect(oas.replaceUrl(url)).toBe('https://mysubdomain.example.com:8000/v5');
    });

    it('should use template names as variables if no variables are supplied', () => {
      expect(Oas.init({}).replaceUrl(url)).toBe(url);
    });

    it('should allow variables to come in as an object of defaults from `oas.defaultVariables`', () => {
      expect(
        Oas.init({}).replaceUrl(url, {
          name: {
            default: 'demo',
          },
          port: {
            default: '443',
          },
          basePath: {
            default: 'v2',
          },
        }),
      ).toBe('https://demo.example.com:443/v2');
    });

    it('should allow variable key-value pairs to be supplied', () => {
      expect(
        Oas.init({}).replaceUrl(url, {
          name: 'subdomain',
          port: '8080',
          basePath: 'v3',
        }),
      ).toBe('https://subdomain.example.com:8080/v3');
    });

    it('should not fail if the variable objects are in weird shapes', () => {
      expect(
        Oas.init({}).replaceUrl(url, {
          name: {
            // This would normally have something like `default: 'demo'` but we're testing a weird
            // case here.
          },
          port: '443',
          basePath: [{ default: 'v2' }],
        }),
      ).toBe('https://{name}.example.com:443/{basePath}');
    });
  });

  describe('.splitUrl()', () => {
    it('should split url into chunks', () => {
      expect(
        Oas.init({
          servers: [{ url: 'https://example.com/{path}' }],
        }).splitUrl(),
      ).toStrictEqual([
        { key: 'https://example.com/-0', type: 'text', value: 'https://example.com/' },
        { key: 'path-1', type: 'variable', value: 'path', description: undefined, enum: undefined },
      ]);
    });

    it('should work for multiple path params', () => {
      expect(
        Oas.init({
          servers: [{ url: 'https://example.com/{a}/{b}/c' }],
        }).splitUrl(),
      ).toStrictEqual([
        {
          key: 'https://example.com/-0',
          type: 'text',
          value: 'https://example.com/',
        },
        {
          description: undefined,
          enum: undefined,
          key: 'a-1',
          type: 'variable',
          value: 'a',
        },
        {
          key: '/-2',
          type: 'text',
          value: '/',
        },
        {
          description: undefined,
          enum: undefined,
          key: 'b-3',
          type: 'variable',
          value: 'b',
        },
        {
          key: '/c-4',
          type: 'text',
          value: '/c',
        },
      ]);

      expect(
        Oas.init({
          servers: [{ url: 'https://example.com/v1/flight/{FlightID}/sitezonetargeting/{SiteZoneTargetingID}' }],
        }).splitUrl(),
      ).toStrictEqual([
        {
          key: 'https://example.com/v1/flight/-0',
          type: 'text',
          value: 'https://example.com/v1/flight/',
        },
        {
          description: undefined,
          enum: undefined,
          key: 'FlightID-1',
          type: 'variable',
          value: 'FlightID',
        },
        {
          key: '/sitezonetargeting/-2',
          type: 'text',
          value: '/sitezonetargeting/',
        },
        {
          description: undefined,
          enum: undefined,
          key: 'SiteZoneTargetingID-3',
          type: 'variable',
          value: 'SiteZoneTargetingID',
        },
      ]);
    });

    it('should create unique keys for duplicate values', () => {
      expect(
        Oas.init({
          servers: [{ url: 'https://example.com/{test}/{test}' }],
        }).splitUrl(),
      ).toStrictEqual([
        { key: 'https://example.com/-0', type: 'text', value: 'https://example.com/' },
        { key: 'test-1', type: 'variable', value: 'test', description: undefined, enum: undefined },
        { key: '/-2', type: 'text', value: '/' },
        { key: 'test-3', type: 'variable', value: 'test', description: undefined, enum: undefined },
      ]);
    });

    it('should return with description', () => {
      const split = new Oas({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0.0' },
        servers: [
          {
            url: 'https://example.com/{path}',
            variables: { path: { default: 'buster', description: 'path description' } },
          },
        ],
        paths: {},
      }).splitUrl()[1];

      expect(split.type === 'variable' && split.description).toBe('path description');
    });

    it('should return with enum values', () => {
      const split = new Oas({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0.0' },
        servers: [{ url: 'https://example.com/{path}', variables: { path: { default: 'v1', enum: ['v1', 'v2'] } } }],
        paths: {},
      }).splitUrl()[1];

      expect(split.type === 'variable' && split.enum).toStrictEqual(['v1', 'v2']);
    });
  });

  describe('.splitVariables()', () => {
    it('should return false if no match was found', () => {
      expect(Oas.init({}).splitVariables('https://local.dev')).toBe(false);
    });

    it('should not return any variables for a server url that has none', () => {
      expect(
        Oas.init({ servers: [{ url: 'https://example.com' }] }).splitVariables('https://example.com'),
      ).toStrictEqual({
        selected: 0,
        variables: {},
      });
    });

    it('should find and return variables', () => {
      const oas = new Oas({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0.0' },
        servers: [
          {
            url: 'http://{name}.local/{basePath}',
            variables: {
              name: { default: 'demo' },
              basePath: { default: 'v2' },
            },
          },
          {
            url: 'https://{name}.example.com:{port}/{basePath}',
            variables: {
              name: { default: 'demo' },
              port: { default: '443' },
              basePath: { default: 'v2' },
            },
          },
        ],
        paths: {},
      });

      const url = 'https://buster.example.com:3000/pet';
      const split = oas.splitVariables(url);

      expect(split).toStrictEqual({
        selected: 1,
        variables: {
          name: 'buster',
          port: '3000',
          basePath: 'pet',
        },
      });

      // @ts-expect-error This is an annoying exclusion but `split` is a known object at this point.
      expect(oas.url(split.selected, split.variables)).toBe(url);
    });

    // Surprisingly this is valid by the spec. :cowboy-sweat:
    it('should handle if a variable is duped in the server url', () => {
      const oas = new Oas({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0.0' },
        servers: [
          {
            url: 'http://{region}.api.example.com/region/{region}/{lang}',
            variables: {
              region: { default: 'us' },
              lang: { default: 'en-US' },
            },
          },
        ],
        paths: {},
      });

      expect(oas.splitVariables('http://eu.api.example.com/region/eu/fr-CH')).toStrictEqual({
        selected: 0,
        variables: {
          region: 'eu',
          lang: 'fr-CH',
        },
      });
    });
  });

  describe('.variables([selected])', () => {
    it('should return with list of variables', () => {
      const variables = { path: { default: 'buster', description: 'path description' } };

      expect(
        new Oas({
          openapi: '3.0.0',
          info: { title: 'testing', version: '1.0.0' },
          servers: [{ url: 'https://example.com/{path}', variables }],
          paths: {},
        }).variables(),
      ).toStrictEqual(variables);
    });

    it('should return with empty object if out of bounds', () => {
      expect(
        new Oas({
          openapi: '3.0.0',
          info: { title: 'testing', version: '1.0.0' },
          servers: [
            {
              url: 'https://example.com/{path}',
              variables: { path: { default: 'buster', description: 'path description' } },
            },
          ],
          paths: {},
        }).variables(10),
      ).toStrictEqual({});
    });
  });

  describe('.defaultVariables([selected])', () => {
    it('should return with list of variables', () => {
      expect(
        new Oas({
          openapi: '3.0.0',
          info: { title: 'testing', version: '1.0.0' },
          servers: [
            {
              url: 'https://example.com/{path}',
              variables: {
                path: { default: '', description: 'path description' },
                port: { default: '8000' },
              },
            },
          ],
          paths: {},
        }).defaultVariables(),
      ).toStrictEqual({ path: '', port: '8000' });
    });

    it('should embellish with user variables', () => {
      expect(
        new Oas(
          {
            openapi: '3.0.0',
            info: { title: 'testing', version: '1.0.0' },
            servers: [
              {
                url: 'https://example.com/{path}',
                variables: {
                  path: { default: 'default-path', description: 'path description' },
                  port: { default: '8000' },
                },
              },
            ],
            paths: {},
          },
          {
            path: 'user-path',
          },
        ).defaultVariables(),
      ).toStrictEqual({ path: 'user-path', port: '8000' });
    });

    it('should return with empty object if out of bounds', () => {
      expect(
        new Oas({
          openapi: '3.0.0',
          info: { title: 'testing', version: '1.0.0' },
          servers: [
            {
              url: 'https://example.com/{path}',
              variables: { path: { default: 'buster', description: 'path description' } },
            },
          ],
          paths: {},
        }).variables(10),
      ).toStrictEqual({});
    });
  });

  describe('.operation()', () => {
    it('should return an Operation object', () => {
      const operation = petstore.operation('/pet', 'post');

      expect(operation).toBeInstanceOf(Operation);
      expect(operation.path).toBe('/pet');
      expect(operation.method).toBe('post');
      expect(operation.schema).toStrictEqual({
        tags: ['pet'],
        summary: 'Add a new pet to the store',
        description: '',
        operationId: 'addPet',
        responses: expect.any(Object),
        security: expect.any(Array),
        requestBody: expect.any(Object),
      });
    });

    it('should return a Webhook object for a webhook', () => {
      const operation = webhooks.operation('newPet', 'post', { isWebhook: true });

      expect(operation).toBeInstanceOf(Webhook);
      expect(operation.path).toBe('newPet');
      expect(operation.method).toBe('post');
      expect(operation.schema).toStrictEqual({
        requestBody: expect.any(Object),
        responses: {
          200: expect.any(Object),
        },
        tags: expect.any(Array),
      });
    });

    it('should return a default when no operation', () => {
      expect(Oas.init({}).operation('/unknown', 'get')).toMatchSnapshot();
    });

    it('should return an operation object with security if it has security', () => {
      const operation = petstore.operation('/pet', 'put');

      expect(operation.getSecurity()).toStrictEqual([{ petstore_auth: ['write:pets', 'read:pets'] }]);
    });

    it("should still return an operation object if the operation isn't found", () => {
      const operation = petstore.operation('/pet', 'patch');

      expect(operation).toMatchObject({
        schema: { parameters: [] },
        api: petstore.api,
        path: '/pet',
        method: 'patch',
        contentType: undefined,
        requestBodyExamples: undefined,
        responseExamples: undefined,
        callbackExamples: undefined,
      });
    });

    it('should still return an operation object if the supplied API definition was `undefined`', () => {
      // @ts-expect-error -- mistyping test case
      const operation = Oas.init().operation('/pet', 'patch');

      expect(operation).toMatchObject({
        schema: { parameters: [] },
        api: {},
        path: '/pet',
        method: 'patch',
        contentType: undefined,
        requestBodyExamples: undefined,
        responseExamples: undefined,
        callbackExamples: undefined,
      });
    });
  });

  describe('.findOperation()', () => {
    it('should return undefined if no server found', () => {
      const uri = 'http://localhost:3000/pet/1';
      const method = 'delete';

      const res = petstore.findOperation(uri, method);

      expect(res).toBeUndefined();
    });

    it('should return undefined if origin is correct but unable to extract path', () => {
      const uri = 'http://petstore.swagger.io/';
      const method = 'get';

      const res = petstore.findOperation(uri, method);

      expect(res).toBeUndefined();
    });

    it('should return undefined if no path matches found', () => {
      const uri = 'http://petstore.swagger.io/v2/search';
      const method = 'get';

      const res = petstore.findOperation(uri, method);

      expect(res).toBeUndefined();
    });

    it('should return undefined if no matching methods in path', () => {
      const uri = 'http://petstore.swagger.io/v2/pet/1';
      const method = 'patch';

      const res = petstore.findOperation(uri, method);

      expect(res).toBeUndefined();
    });

    it('should return a result if found', () => {
      const uri = 'http://petstore.swagger.io/v2/pet/1';
      const method = 'delete';

      const res = petstore.findOperation(uri, method);

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
      const uri = 'http://petstore.swagger.io/v2/pet/1/';
      const method = 'delete';

      const res = petstore.findOperation(uri, method);

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
      const uri = 'http://petstore.swagger.io/v2/pet/findByStatus?test=2';
      const method = 'get';

      const res = petstore.findOperation(uri, method);

      expect(res).toMatchObject({
        url: {
          origin: 'http://petstore.swagger.io/v2',
          path: '/pet/findByStatus',
          slugs: {},
          method: 'GET',
        },
      });
    });

    it('should support schemeless servers', () => {
      const schemeless = structuredClone(petstoreSpec) as OASDocument;
      schemeless.servers = [{ url: '//petstore.swagger.io/v2' }];

      const oas = new Oas(schemeless);
      const uri = 'http://petstore.swagger.io/v2/pet/findByStatus?test=2';
      const method = 'get';

      const res = oas.findOperation(uri, method);

      expect(res).toMatchObject({
        url: {
          origin: '//petstore.swagger.io/v2',
          path: '/pet/findByStatus',
          slugs: {},
          method: 'GET',
        },
      });
    });

    it('should return result if server has a trailing slash', () => {
      const oas = new Oas({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0.0' },
        servers: [
          {
            url: 'https://example.com/',
          },
        ],
        paths: {
          '/pets/:id': {
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

      const uri = 'https://example.com/pets/:id';
      const method = 'get';

      const res = oas.findOperation(uri, method);

      expect(res?.url).toStrictEqual({
        origin: 'https://example.com',
        path: '/pets/:id',
        nonNormalizedPath: '/pets/:id',
        slugs: { ':id': ':id' },
        method: 'GET',
      });
    });

    it('should return result if path is slash', () => {
      const oas = new Oas({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0.0' },
        servers: [
          {
            url: 'https://example.com',
          },
        ],
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

      const uri = 'https://example.com';
      const method = 'get';

      const res = oas.findOperation(uri, method);

      expect(res?.url).toStrictEqual({
        origin: 'https://example.com',
        path: '/',
        nonNormalizedPath: '/',
        slugs: {},
        method: 'GET',
      });

      expect(res?.operation).toStrictEqual({
        responses: {
          200: {
            description: 'OK',
          },
        },
      });
    });

    it('should return result if in server variable defaults', () => {
      const uri = 'https://demo.example.com:443/v2/post';
      const method = 'post';

      const res = serverVariables.findOperation(uri, method);

      expect(res).toMatchObject({
        url: {
          origin: 'https://demo.example.com:443/v2',
          path: '/post',
          nonNormalizedPath: '/post',
          slugs: {},
          method: 'POST',
        },
        operation: expect.objectContaining({
          summary: 'Should fetch variables from defaults and user values',
        }),
      });
    });

    it('should render any target server variable defaults', () => {
      const oas = Oas.init(structuredClone(petstoreServerVarsSpec));
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

    it('should not overwrite the servers in the core OAS while looking for matches', () => {
      const uri = 'https://demo.example.com:443/v2/post';
      const method = 'post';

      expect(serverVariables.api.servers?.[0].url).toBe('https://{name}.example.com:{port}/{basePath}');

      const res = serverVariables.findOperation(uri, method);

      expect(res?.url).toMatchObject({
        origin: 'https://demo.example.com:443/v2',
        path: '/post',
        nonNormalizedPath: '/post',
        slugs: {},
        method: 'POST',
      });

      expect(serverVariables.api.servers?.[0].url).toBe('https://{name}.example.com:{port}/{basePath}');
    });

    it('should be able to match against servers with a variable hostname that includes subdomains and a port', () => {
      const uri = 'http://online.example.global:3001/api/public/v1/tables/c445a575-ee58-4aa7/rows/5ba96283-29c2-47f7';
      const method = 'put';

      const res = serverVariables.findOperation(uri, method);

      expect(res?.url).toStrictEqual({
        origin: '{protocol}://{hostname}/api/public/v1',
        path: '/tables/:tableId/rows/:rowId',
        nonNormalizedPath: '/tables/{tableId}/rows/{rowId}',
        slugs: {
          ':rowId': '5ba96283-29c2-47f7',
          ':tableId': 'c445a575-ee58-4aa7',
        },
        method: 'PUT',
      });
    });

    describe('quirks', () => {
      it('should return result if the operation path has malformed path parameters', () => {
        const uri = 'https://api.example.com/v2/games/destiny-2/dlc/witch-queen';
        const method = 'get';
        const res = pathMatchingQuirks.findOperation(uri, method);

        expect(res?.url).toStrictEqual({
          origin: 'https://api.example.com/v2',
          path: '/games/:game/dlc/:dlcrelease',
          nonNormalizedPath: '/games/{game}/dlc/{dlcrelease}}',
          slugs: { ':game': 'destiny-2', ':dlcrelease': 'witch-queen' },
          method: 'GET',
        });
      });

      it('should support a path parameter that has a hypen in it', () => {
        const uri = 'https://api.example.com/v2/games/destiny-2/platforms/ps5/dlc/witch-queen';
        const method = 'get';
        const res = pathMatchingQuirks.findOperation(uri, method);

        expect(res?.url).toStrictEqual({
          origin: 'https://api.example.com/v2',
          path: '/games/:game/platforms/:platform/dlc/:dlcrelease',
          nonNormalizedPath: '/games/{game}/platforms/{platform}/dlc/{dlc-release}',
          slugs: {
            ':game': 'destiny-2',
            ':platform': 'ps5',
            ':dlcrelease': 'witch-queen',
          },
          method: 'GET',
        });
      });

      it('should return a match if a defined server has camelcasing, but the uri is all lower', () => {
        const oas = new Oas({
          openapi: '3.0.0',
          info: { title: 'testing', version: '1.0.0' },
          servers: [{ url: 'https://api.EXAMPLE.com/' }],
          paths: {
            '/anything': {
              get: {
                responses: { 200: { description: 'OK' } },
              },
            },
          },
        });

        const uri = 'https://api.example.com/anything';
        const method = 'get';

        const res = oas.findOperation(uri, method);

        expect(res?.url).toStrictEqual({
          origin: 'https://api.EXAMPLE.com',
          path: '/anything',
          nonNormalizedPath: '/anything',
          slugs: {},
          method: 'GET',
        });
      });

      it("should return a match if the uri has variable casing but the defined server doesn't", () => {
        const oas = new Oas({
          openapi: '3.0.0',
          info: { title: 'testing', version: '1.0.0' },
          servers: [{ url: 'https://api.example.com/' }],
          paths: {
            '/anything': {
              get: {
                responses: { 200: { description: 'OK' } },
              },
            },
          },
        });

        const uri = 'https://api.EXAMPLE.com/anything';
        const method = 'get';

        const res = oas.findOperation(uri, method);

        expect(res?.url).toStrictEqual({
          origin: 'https://api.example.com',
          path: '/anything',
          nonNormalizedPath: '/anything',
          slugs: {},
          method: 'GET',
        });
      });

      it('should return result if path contains non-variabled colons', () => {
        const uri = 'https://api.example.com/people/GWID:3';
        const method = 'post';

        const res = pathVariableQuirks.findOperation(uri, method);

        expect(res).toMatchObject({
          url: {
            origin: 'https://api.example.com',
            path: '/people/:personIdType::personId',
            nonNormalizedPath: '/people/{personIdType}:{personId}',
            slugs: { ':personIdType': 'GWID', ':personId': '3' },
            method: 'POST',
          },
          operation: {
            parameters: [
              {
                name: 'personIdType',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
              {
                name: 'personId',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
          },
        });
      });

      it('should not error if an unrelated OAS path has a query param in it', () => {
        const uri = 'https://api.example.com/v2/listings';
        const method = 'post';

        const res = pathMatchingQuirks.findOperation(uri, method);

        expect(res?.url).toStrictEqual({
          origin: 'https://api.example.com/v2',
          path: '/listings',
          nonNormalizedPath: '/listings',
          slugs: {},
          method: 'POST',
        });
      });

      it('should match a path that has a query param in its OAS path definition', () => {
        const uri = 'https://api.example.com/v2/rating_stats';
        const method = 'get';

        const res = pathMatchingQuirks.findOperation(uri, method);

        expect(res?.url).toStrictEqual({
          origin: 'https://api.example.com/v2',
          path: '/rating_stats',
          nonNormalizedPath: '/rating_stats?listing_ids[]=1234567',
          slugs: {},
          method: 'GET',
        });
      });

      it('should match a path that has a hash in its OAS path definition', () => {
        const uri = 'https://api.example.com/v2/listings#hash';
        const method = 'get';

        const res = pathMatchingQuirks.findOperation(uri, method);

        expect(res?.url).toStrictEqual({
          origin: 'https://api.example.com/v2',
          path: '/listings#hash',
          nonNormalizedPath: '/listings#hash',
          slugs: {},
          method: 'GET',
        });
      });

      it('should be able to find an operation if `servers` are missing from the API definition', () => {
        const oas = new Oas({
          openapi: '3.0.1',
          info: {
            title: 'Some Test API',
            version: '1',
          },
          paths: {
            '/v1/endpoint': {
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

        const uri = 'https://example.com/v1/endpoint';
        const method = 'get';

        const res = oas.findOperation(uri, method);

        expect(res?.url).toStrictEqual({
          origin: 'https://example.com',
          path: '/v1/endpoint',
          nonNormalizedPath: '/v1/endpoint',
          slugs: {},
          method: 'GET',
        });
      });

      it('should not error if one of the paths in the API definition has a malformed path parameter', () => {
        const oas = new Oas({
          openapi: '3.0.1',
          info: {
            title: 'Some Test API',
            version: '1',
          },
          paths: {
            '/v1/endpoint': {
              get: {
                responses: {
                  200: {
                    description: 'OK',
                  },
                },
              },
            },
            '/}/v1/endpoint': {
              get: {
                summary:
                  "The path on this operation is malformed and will throw an error in `path-to-regexp` if we don't handle it.",
                responses: {
                  200: {
                    description: 'OK',
                  },
                },
              },
            },
          },
        });

        const uri = 'https://example.com/v1/endpoint';
        const method = 'get';

        // Calling `findOperation` twice in this test so we can make sure that not only does it not
        // throw an exception but that it still returns the data we want.
        expect(() => {
          oas.findOperation(uri, method);
        }).not.toThrow(new TypeError('Unexpected CLOSE at 1, expected END'));

        const res = oas.findOperation(uri, method);
        expect(res?.url).toStrictEqual({
          origin: 'https://example.com',
          path: '/v1/endpoint',
          nonNormalizedPath: '/v1/endpoint',
          slugs: {},
          method: 'GET',
        });
      });
    });

    describe('operation and path-item servers', () => {
      let operationServers: Oas;
      let pathLevelServers: Oas;

      beforeEach(() => {
        operationServers = Oas.init(structuredClone(operationServersSpec));
        pathLevelServers = Oas.init(structuredClone(serverPathLevelSpec));
      });

      it('should find an operation served by an operation-level server', () => {
        const res = operationServers.findOperation('https://httpbin.com/anything/demo/operation', 'post');

        expect(res?.url).toStrictEqual({
          origin: 'https://httpbin.com/anything/demo',
          path: '/operation',
          nonNormalizedPath: '/operation',
          slugs: {},
          method: 'POST',
        });
      });

      it('should find an operation served by an operation-level server with a non-default variable', () => {
        const res = operationServers.findOperation('https://httpbin.com/anything/custom/operation', 'post');

        expect(res?.url).toStrictEqual({
          origin: 'https://httpbin.com/anything/{subpath}',
          path: '/operation',
          nonNormalizedPath: '/operation',
          slugs: {},
          method: 'POST',
        });
      });

      it('should find an operation served by a path-item server', () => {
        const res = operationServers.findOperation('https://httpbin.com/anything/common/demo/path', 'put');

        expect(res?.url).toStrictEqual({
          origin: 'https://httpbin.com/anything/common/demo',
          path: '/path',
          nonNormalizedPath: '/path',
          slugs: {},
          method: 'PUT',
        });
      });

      it('should prefer operation-level servers over path-item servers', () => {
        const res = operationServers.findOperation('https://httpbin.com/anything/demo/combo', 'put');

        expect(res?.url).toStrictEqual({
          origin: 'https://httpbin.com/anything/demo',
          path: '/combo',
          nonNormalizedPath: '/combo',
          slugs: {},
          method: 'PUT',
        });

        // Because `/combo` defines operation-level servers, its path-item servers shouldn't serve
        // it.
        expect(operationServers.findOperation('https://httpbin.com/anything/common/demo/combo', 'put')).toBeUndefined();
      });

      it('should still match against root servers when an operation has no server overrides', () => {
        const res = operationServers.findOperation('https://demo.example.com:443/v2/global', 'post');

        expect(res?.url).toStrictEqual({
          origin: 'https://demo.example.com:443/v2',
          path: '/global',
          nonNormalizedPath: '/global',
          slugs: {},
          method: 'POST',
        });
      });

      it('should support relative path-item and operation-level servers', () => {
        expect(pathLevelServers.findOperation('https://example.com/v2/relative-path-server', 'get')?.url).toStrictEqual(
          {
            origin: '/v2',
            path: '/relative-path-server',
            nonNormalizedPath: '/relative-path-server',
            slugs: {},
            method: 'GET',
          },
        );

        expect(
          pathLevelServers.findOperation('https://example.com/v3/relative-operation-server', 'get')?.url,
        ).toStrictEqual({
          origin: '/v3',
          path: '/relative-operation-server',
          nonNormalizedPath: '/relative-operation-server',
          slugs: {},
          method: 'GET',
        });
      });

      it('should support operation-level server variables', () => {
        expect(
          pathLevelServers.findOperation('https://operation.example.com/v3/operation-server-variables', 'get')?.url,
        ).toStrictEqual({
          origin: 'https://operation.example.com/v3',
          path: '/operation-server-variables',
          nonNormalizedPath: '/operation-server-variables',
          slugs: {},
          method: 'GET',
        });

        expect(
          pathLevelServers.findOperation('https://operation.example.com/v9/operation-server-variables', 'get')?.url,
        ).toStrictEqual({
          origin: 'https://operation.example.com/{version}',
          path: '/operation-server-variables',
          nonNormalizedPath: '/operation-server-variables',
          slugs: {},
          method: 'GET',
        });
      });

      it('should resolve path-item `$ref` servers', () => {
        expect(
          pathLevelServers.findOperation('https://path-item-ref.example.com/path-item-ref-server', 'get')?.url,
        ).toStrictEqual({
          origin: 'https://path-item-ref.example.com',
          path: '/path-item-ref-server',
          nonNormalizedPath: '/path-item-ref-server',
          slugs: {},
          method: 'GET',
        });
      });

      it('should treat empty server arrays as absent when applying precedence', () => {
        expect(
          pathLevelServers.findOperation('https://empty-operation-path.example.com/empty-operation-servers', 'get')
            ?.url,
        ).toStrictEqual({
          origin: 'https://empty-operation-path.example.com',
          path: '/empty-operation-servers',
          nonNormalizedPath: '/empty-operation-servers',
          slugs: {},
          method: 'GET',
        });

        expect(
          pathLevelServers.findOperation('https://demo.example.com:443/v2/empty-path-item-servers', 'get')?.url,
        ).toStrictEqual({
          origin: 'https://demo.example.com:443/v2',
          path: '/empty-path-item-servers',
          nonNormalizedPath: '/empty-path-item-servers',
          slugs: {},
          method: 'GET',
        });
      });

      it('should be discoverable through `findOperationWithoutMethod()` and `getOperation()`', () => {
        // `url.method` is only stamped by method filtering, so it shouldn't appear here.
        expect(
          operationServers.findOperationWithoutMethod('https://httpbin.com/anything/demo/operation')?.url,
        ).toStrictEqual({
          origin: 'https://httpbin.com/anything/demo',
          path: '/operation',
          nonNormalizedPath: '/operation',
          slugs: {},
        });

        const operation = pathLevelServers.getOperation(
          'https://operation.example.com/v3/operation-server-variables',
          'get',
        );

        expect(operation).toBeInstanceOf(Operation);
        expect(operation?.getSummary()).toBe('Operation-level server variables');
        expect(operation?.url()).toBe('https://operation.example.com/v3');
      });
    });
  });

  // Since this is just a wrapper for findOperation, we don't need to re-test everything that the
  // tests for that does. All we need to know is that if findOperation fails this fails, as well as
  // the reverse.
  describe('.getOperation()', () => {
    it('should return undefined if #findOperation returns undefined', () => {
      const uri = 'http://localhost:3000/pet/1';
      const method = 'delete';

      expect(petstore.getOperation(uri, method)).toBeUndefined();
    });

    it('should return a result if found', () => {
      const uri = 'http://petstore.swagger.io/v2/pet/1';
      const method = 'delete';

      const res = petstore.getOperation(uri, method);

      expect(res).toBeInstanceOf(Operation);
      expect(res?.path).toBe('/pet/{petId}');
      expect(res?.method).toBe('delete');
    });

    it('should have security present on an operation that has it', () => {
      const security = [{ petstore_auth: ['write:pets', 'read:pets'] }];

      expect(petstore.api.paths?.['/pet']?.put?.security).toStrictEqual(security);

      const res = petstore.getOperation('http://petstore.swagger.io/v2/pet', 'put');

      expect(res?.getSecurity()).toStrictEqual(security);
    });

    it('should handle paths with uri templates', () => {
      const operation = petstore.getOperation('http://petstore.swagger.io/v2/store/order/1234', 'get');

      expect(operation?.schema.parameters).toHaveLength(1);
      expect(operation?.schema.operationId).toBe('getOrderById');
      expect(operation?.path).toBe('/store/order/{orderId}');
      expect(operation?.method).toBe('get');
    });

    describe('server variables', () => {
      const apiDefinition = {
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0.0' },
        servers: [
          {
            url: 'https://{region}.node.example.com/v14',
            variables: {
              region: {
                default: 'us',
                enum: ['us', 'eu'],
              },
            },
          },
        ],
        paths: {
          '/api/esm': {
            put: {
              responses: {
                200: {
                  description: '200',
                },
              },
            },
          },
        },
      };

      it('should be able to find an operation where the variable matches the url', () => {
        const source = {
          url: 'https://eu.node.example.com/v14/api/esm',
          method: 'put',
        };

        const method = source.method.toLowerCase() as HttpMethods;
        const oas = new Oas(apiDefinition, { region: 'eu' });
        const operation = oas.getOperation(source.url, method);

        expect(operation).toBeDefined();
        expect(operation?.path).toBe('/api/esm');
        expect(operation?.method).toBe('put');
      });

      it("should be able to find an operation where the variable **doesn't** match the url", () => {
        const source = {
          url: 'https://eu.node.example.com/v14/api/esm',
          method: 'put' as HttpMethods,
        };

        const oas = new Oas(apiDefinition, { region: 'us' });
        const operation = oas.getOperation(source.url, source.method);

        expect(operation).toBeDefined();
        expect(operation?.path).toBe('/api/esm');
        expect(operation?.method).toBe('put');
      });

      it('should be able to find an operation if there are no user variables present', () => {
        const source = {
          url: 'https://eu.node.example.com/v14/api/esm',
          method: 'put' as HttpMethods,
        };

        const oas = new Oas(apiDefinition);
        const operation = oas.getOperation(source.url, source.method);

        expect(operation).toBeDefined();
        expect(operation?.path).toBe('/api/esm');
        expect(operation?.method).toBe('put');
      });

      it('should fail to find a match on a url that doesnt quite match', () => {
        const source = {
          url: 'https://eu.buster.example.com/v14/api/esm',
          method: 'put' as HttpMethods,
        };

        const oas = new Oas(apiDefinition, { region: 'us' });
        const operation = oas.getOperation(source.url, source.method);

        expect(operation).toBeUndefined();
      });

      it('should be able to find a match on a url with a non-default port', () => {
        const oas = new Oas({
          openapi: '3.0.0',
          info: { title: 'testing', version: '1.0.0' },
          servers: [{ url: 'https://example.com:{port}' }],
          paths: {
            '/api/esm': {
              put: {
                responses: {
                  200: {
                    description: '200',
                  },
                },
              },
            },
          },
        });

        const source = {
          url: 'https://example.com:8080/api/esm',
          method: 'put' as HttpMethods,
        };

        const operation = oas.getOperation(source.url, source.method);

        expect(operation).toBeDefined();
        expect(operation?.path).toBe('/api/esm');
        expect(operation?.method).toBe('put');
      });

      it('should be able to find a match on a url with an server OAS that doesnt have fleshed out server variables', () => {
        const oas = new Oas({
          openapi: '3.0.0',
          info: { title: 'testing', version: '1.0.0' },
          servers: [{ url: 'https://{region}.node.example.com/v14' }],
          paths: {
            '/api/esm': {
              put: {
                responses: {
                  200: {
                    description: '200',
                  },
                },
              },
            },
          },
        });

        const source = {
          url: 'https://us.node.example.com/v14/api/esm',
          method: 'put' as HttpMethods,
        };

        const operation = oas.getOperation(source.url, source.method);

        expect(operation).toBeDefined();
        expect(operation?.path).toBe('/api/esm');
        expect(operation?.method).toBe('put');
      });

      it('should be able to find a match on a url that contains colons', () => {
        const source = {
          url: 'https://api.example.com/people/GWID:3',
          method: 'post' as HttpMethods,
        };

        const operation = pathVariableQuirks.getOperation(source.url, source.method);

        expect(operation).toBeDefined();
        expect(operation?.path).toBe('/people/{personIdType}:{personId}');
        expect(operation?.method).toBe('post');
      });
    });
  });

  describe('.getOperationById()', () => {
    describe('given an operation that does have an operationId', () => {
      it('should return an operation', () => {
        const operation = petstore.getOperationById('deletePet');

        expect(operation?.path).toBe('/pet/{petId}');
        expect(operation?.method).toBe('delete');
      });

      it('should return `undefined` if not found', () => {
        expect(petstore.getOperationById('deletepet')).toBeUndefined();
      });

      describe('and the same operationId is duplicated with different casing', () => {
        it('should return the matching operation', () => {
          const spec = createOasForPaths({
            '/anything': {
              get: {
                operationId: 'findpetsbystatus',
                responses: {},
              },
              post: {
                operationId: 'findPetsByStatus',
                responses: {},
              },
            },
          });

          const operation = spec.getOperationById('findPetsByStatus');

          expect(operation?.path).toBe('/anything');
          expect(operation?.method).toBe('post');
        });
      });

      describe('and it contains non-alphanumeric characters', () => {
        it('should return an operation', () => {
          const spec = createOasForPaths({
            '/anything': {
              get: {
                operationId: 'find/?*!@#$%^&*()-=.,<>+[]{}\\|pets-by-status',
                responses: {},
              },
              post: {
                operationId: 'find/?*!@#$%^&*()-=.,<>+[]{}\\|pets-by-statuses',
                responses: {},
              },
            },
          });

          const operation = spec.getOperationById('find/?*!@#$%^&*()-=.,<>+[]{}\\|pets-by-status');

          expect(operation?.path).toBe('/anything');
          expect(operation?.method).toBe('get');
        });
      });
    });

    describe('given an api definition with webhooks', () => {
      it('should return an operation', () => {
        const webhook = webhooks.operation('newPet', 'post', { isWebhook: true });

        expect(webhook).toBeInstanceOf(Webhook);
        expect(webhook.getOperationId()).toBe('post_newpet');

        const operation = webhooks.getOperationById('post_newpet');

        expect(operation?.path).toBe('newPet');
        expect(operation?.method).toBe('post');
      });
    });

    describe('given an operation that doesnt have an operationId', () => {
      it('should return an operation', () => {
        const operation = multipleSecurities.getOperationById('get_multiple-combo-auths-duped');

        expect(operation?.path).toBe('/multiple-combo-auths-duped');
        expect(operation?.method).toBe('get');
      });

      describe('and the path we are looking for begins with double forward slashes', () => {
        it('should return an operation', () => {
          const spec = createOasForPaths({
            '//candidate/{candidate_id}/': {
              get: {
                responses: {},
              },
            },
          });

          const operationId = spec.operation('//candidate/{candidate_id}/', 'get').getOperationId();

          expect(operationId).toBe('get_candidate-candidate-id');

          const operation = spec.getOperationById(operationId);

          expect(operation?.path).toBe('//candidate/{candidate_id}/');
          expect(operation?.method).toBe('get');
        });
      });
    });
  });

  describe('.findOperationWithoutMethod()', () => {
    it('should return undefined if no server found', () => {
      const uri = 'http://localhost:3000/pet/1';

      const res = petstore.findOperationWithoutMethod(uri);

      expect(res).toBeUndefined();
    });

    it('should return undefined if origin is correct but unable to extract path', () => {
      const uri = 'http://petstore.swagger.io/';

      const res = petstore.findOperationWithoutMethod(uri);

      expect(res).toBeUndefined();
    });

    it('should return undefined if no path matches found', () => {
      const uri = 'http://petstore.swagger.io/v2/search';

      const res = petstore.findOperationWithoutMethod(uri);

      expect(res).toBeUndefined();
    });

    it('should return all results for valid path match', () => {
      const uri = 'http://petstore.swagger.io/v2/pet/1';

      const res = petstore.findOperationWithoutMethod(uri);
      const petIndexResult = petstore.api.paths?.['/pet/{petId}'];

      const expected = {
        match: {
          params: {
            petId: '1',
          },
          path: '/pet/1',
        },
        operation: {
          ...petIndexResult,
        },
        url: {
          nonNormalizedPath: '/pet/{petId}',
          origin: 'http://petstore.swagger.io/v2',
          path: '/pet/:petId',
          slugs: {
            ':petId': '1',
          },
        },
      };

      expect(res).toMatchObject(expected);
    });
  });

  describe('.hasSecurityScheme()', () => {
    it('should return true for an existing security scheme name', () => {
      expect(multipleSecurities.hasSecurityScheme('oauthScheme')).toBe(true);
      expect(multipleSecurities.hasSecurityScheme('apiKeyScheme')).toBe(true);
      expect(multipleSecurities.hasSecurityScheme('httpBearer')).toBe(true);
      expect(multipleSecurities.hasSecurityScheme('basicAuth')).toBe(true);
    });

    it('should return false for a non-existent security scheme name', () => {
      expect(multipleSecurities.hasSecurityScheme('nonExistent')).toBe(false);
    });

    it('should return false when the API has no components', () => {
      expect(
        Oas.init({
          openapi: '3.0.0',
          info: { title: 'testing', version: '1.0.0' },
          paths: {},
        }).hasSecurityScheme('any'),
      ).toBe(false);
    });

    it('should return false when components has no `securitySchemes`', () => {
      expect(
        Oas.init({
          openapi: '3.0.0',
          info: { title: 'testing', version: '1.0.0' },
          paths: {},
          components: {},
        }).hasSecurityScheme('any'),
      ).toBe(false);
    });
  });

  describe('.getSecurityScheme()', () => {
    it('should return the security scheme object for an existing inline scheme', () => {
      const scheme = multipleSecurities.getSecurityScheme('apiKeyScheme');
      expect(scheme).toStrictEqual({
        type: 'apiKey',
        name: 'testKey',
        in: 'header',
      });
    });

    it('should return different scheme types correctly', () => {
      expect(multipleSecurities.getSecurityScheme('httpBearer')).toStrictEqual({
        type: 'http',
        scheme: 'bearer',
      });

      expect(multipleSecurities.getSecurityScheme('oauthScheme')).toStrictEqual({
        type: 'oauth2',
        flows: {
          implicit: {
            authorizationUrl: 'http://example.com/oauth/dialog',
            scopes: {
              'write:things': 'Add things to your account',
            },
          },
        },
      });
    });

    it('should return undefined for a non-existent security scheme name', () => {
      expect(multipleSecurities.getSecurityScheme('nonExistent')).toBeUndefined();
    });

    it('should return undefined when the API has no components or `securitySchemes`', () => {
      expect(
        Oas.init({ openapi: '3.0.0', info: { title: 'testing', version: '1.0.0' }, paths: {} }).getSecurityScheme(
          'any',
        ),
      ).toBeUndefined();
    });

    it('should lazily dereference a security scheme `$ref` and return the resolved scheme', () => {
      const oas = Oas.init({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0.0' },
        paths: {},
        components: {
          securitySchemes: {
            inlineScheme: {
              type: 'apiKey',
              name: 'X-Key',
              in: 'header',
            },
            refScheme: {
              $ref: '#/components/securitySchemes/inlineScheme',
            },
          },
        },
      });

      expect(oas.hasSecurityScheme('refScheme')).toBe(true);
      const scheme = oas.getSecurityScheme('refScheme');

      expect(scheme).toBeDefined();
      expect(scheme).toMatchObject({
        type: 'apiKey',
        name: 'X-Key',
        in: 'header',
      });
    });

    it('should return undefined when the security scheme $ref cannot be resolved', () => {
      const oas = Oas.init({
        openapi: '3.0.0',
        info: { title: 'testing', version: '1.0.0' },
        paths: {},
        components: {
          securitySchemes: {
            invalidRef: {
              $ref: '#/components/securitySchemes/missing',
            },
          },
        },
      });

      expect(oas.getSecurityScheme('invalidRef')).toBeUndefined();
    });
  });

  describe('.getPaths()', () => {
    it('should return all paths if paths are present', () => {
      const paths = petstore.getPaths();

      expect(Object.keys(paths)).toHaveLength(14);
      expect(paths['/pet']).toStrictEqual({
        post: expect.any(Operation),
        put: expect.any(Operation),
      });
    });

    it('should return an empty object if no paths are present', () => {
      expect(webhooks.getPaths()).toStrictEqual({});
    });

    it("should return an empty object for the path if only only properties present aren't supported HTTP methods", () => {
      const oas = Oas.init({
        openapi: '3.0.0',
        info: {
          version: '1.0.0',
          title: 'Unknown object keys',
        },
        servers: [{ url: 'http://httpbin.org' }],
        paths: {
          '/post': {
            'x-deprecated': true,
          },
        },
      });

      expect(oas.getPaths()).toStrictEqual({
        '/post': {},
      });
    });

    it('should be able to handle, and ignore, extensions set at the `paths` level', () => {
      const oas = Oas.init({
        openapi: '3.0.0',
        info: {
          version: '1.0.0',
          title: '`paths`-level extensions',
        },
        servers: [{ url: 'http://httpbin.org' }],
        paths: {
          '/post': {},
          'x-extension-name': 'buster',
        },
      });

      expect(oas.getPaths()).toStrictEqual({
        '/post': {},
      });
    });

    it('should be able to handle OpenAPI 3.1 `pathItem` reference objects without dereferencing', () => {
      const oas = Oas.init(structuredClone(pathItemsComponentSpec));

      const paths = oas.getPaths();

      expect(Object.keys(paths)).toHaveLength(1);
      expect(paths['/pet/:id']).toStrictEqual({
        put: expect.any(Operation),
        get: expect.any(Operation),
      });
    });
  });

  describe('.getWebhooks()', () => {
    it('should return all webhooks if webhooks are present', () => {
      const hooks = webhooks.getWebhooks();

      expect(Object.keys(hooks)).toHaveLength(1);
      expect(hooks).toStrictEqual({
        newPet: {
          post: expect.any(Webhook),
          delete: expect.any(Webhook),
        },
      });
    });

    it('should return an empty object if no webhooks are present', () => {
      expect(petstore.getWebhooks()).toStrictEqual({});
    });
  });

  describe('.getTags()', () => {
    it('should return all tags that are present in a definition', () => {
      expect(petstore.getTags()).toStrictEqual(['pet', 'store', 'user']);
      expect(webhooks.getTags()).toStrictEqual(['Webhooks']);
    });

    it('should respect `tags` array ordering', () => {
      expect(orderedTags.getTags()).toStrictEqual(['user', 'store', 'pet', 'endpoint']);
    });

    it('should acknowledge `disable-tag-sorting` extension', () => {
      orderedTags.api['x-readme'] = { 'disable-tag-sorting': true };

      expect(orderedTags.getTags()).toStrictEqual(['pet', 'endpoint', 'store', 'user']);
    });

    describe('setIfMissing option', () => {
      it('should return no tags if none are present', () => {
        expect(serverVariables.getTags()).toHaveLength(0);
      });

      it('should ensure that operations without a tag still have a tag set as the path name if `setIfMissing` is true', () => {
        expect(serverVariables.getTags(true)).toStrictEqual(['/post', '/tables/{tableId}/rows/{rowId}']);
      });
    });
  });

  describe('.hasExtension()', () => {
    it('should return true if the extension exists', () => {
      const oas = Oas.init({
        ...petstoreSpec,
        'x-samples-languages': false,
      });

      expect(oas.hasExtension('x-samples-languages')).toBe(true);
    });

    it("should return false if the extension doesn't exist", () => {
      expect(petstore.hasExtension('x-readme')).toBe(false);
    });

    it('should not fail if the Oas instance has no API definition', () => {
      // @ts-expect-error -- mistyping test case
      const oas = Oas.init();

      expect(oas.hasExtension('x-readme')).toBe(false);
    });
  });
});
