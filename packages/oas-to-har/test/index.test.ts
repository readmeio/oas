import type { Operation } from 'oas/operation';
import type { OASDocument } from 'oas/types';

import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import serverVariables from '@readme/oas-examples/3.0/json/server-variables.json' with { type: 'json' };
import toBeAValidHAR from 'jest-expect-har';
import Oas from 'oas';
import { PROXY_ENABLED } from 'oas/extensions';
import { beforeEach, describe, expect, it } from 'vitest';

import oasToHar from '../src/index.js';

// oxlint-disable-next-line vitest/require-hook
expect.extend({ toBeAValidHAR });

describe('oas-to-har', () => {
  it('should output a HAR object if no operation information is supplied', async () => {
    const har = oasToHar(Oas.init({}));

    await expect(har).toBeAValidHAR();
    expect(har).toStrictEqual({
      log: {
        entries: [
          {
            request: {
              bodySize: 0,
              cookies: [],
              headers: [],
              headersSize: 0,
              httpVersion: 'HTTP/1.1',
              method: '',
              queryString: [],
              url: 'https://example.com',
            },
          },
        ],
      },
    });
  });

  it('should create an Operation instance if supplied a plain object', async () => {
    const spec = Oas.init(structuredClone(petstore));

    const operation = { method: 'post', path: '/pet' };
    const har = oasToHar(spec, operation as Operation);

    await expect(har).toBeAValidHAR();
    expect(har).toStrictEqual({
      log: {
        entries: [
          {
            request: {
              cookies: [],
              headers: [
                // `POST /pet` normally has `Content-Type: application/json` headers but because we
                // didn't supply `oas-to-har` with the full schema of `POST /pet` we don't have
                // this information.
              ],
              headersSize: 0,
              queryString: [],
              bodySize: 0,
              method: 'POST',
              url: 'http://petstore.swagger.io/v2/pet',
              httpVersion: 'HTTP/1.1',
            },
          },
        ],
      },
    });
  });

  it('should accept an Operation instance as the operation schema', async () => {
    const spec = Oas.init(structuredClone(petstore));

    const operation = spec.operation('/pet', 'post');
    const har = oasToHar(spec, operation);

    await expect(har).toBeAValidHAR();
    expect(har).toStrictEqual({
      log: {
        entries: [
          {
            request: {
              cookies: [],
              headers: [{ name: 'content-type', value: 'application/json' }],
              headersSize: 0,
              queryString: [],
              bodySize: 0,
              method: 'POST',
              url: 'http://petstore.swagger.io/v2/pet',
              httpVersion: 'HTTP/1.1',
            },
          },
        ],
      },
    });
  });

  it('should return a valid HAR without an apiDefintion', async () => {
    const spec = Oas.init({});
    const operation = spec.operation('/pet', 'post');
    const har = oasToHar(spec, operation);

    await expect(har).toBeAValidHAR();
  });

  it('should remove empty object array items from JSON request bodies', () => {
    const spec = Oas.init({
      openapi: '3.1.0',
      paths: {
        '/empty-object-array': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      items: {
                        type: 'array',
                        items: {
                          type: 'object',
                        },
                      },
                      metadata: {
                        type: 'object',
                      },
                      wrappers: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            metadata: {
                              type: 'object',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const har = oasToHar(spec, spec.operation('/empty-object-array', 'post'), {
      body: {
        items: [{}],
        metadata: {},
        wrappers: [{ metadata: {} }],
      },
    });

    expect(har.log.entries[0].request.postData?.text).toBe('{"items":[],"metadata":{},"wrappers":[{"metadata":{}}]}');
  });

  describe('OpenAPI 3.2 support', () => {
    let spec32: Oas;

    beforeEach(() => {
      spec32 = Oas.init({
        openapi: '3.2.0',
        info: { title: 'OpenAPI 3.2 support', version: '1.0.0' },
        servers: [{ url: 'https://httpbin.org' }],
        paths: {
          '/search': {
            query: {
              operationId: 'search',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        query: { type: 'string' },
                      },
                    },
                  },
                },
              },
              responses: {
                '200': { description: 'OK' },
              },
            },
            additionalOperations: {
              PURGE: {
                operationId: 'purgeSearch',
                responses: {
                  '204': { description: 'Purged' },
                },
              },
            },
          },
        },
      });
    });

    it('should support a `query` operation with a request body', async () => {
      const har = oasToHar(spec32, spec32.operation('/search', 'query'), {
        body: { query: 'status:active' },
      });

      await expect(har).toBeAValidHAR();
      expect(har.log.entries[0].request.method).toBe('QUERY');
      expect(har.log.entries[0].request.url).toBe('https://httpbin.org/search');
      expect(har.log.entries[0].request.postData).toStrictEqual({
        mimeType: 'application/json',
        text: '{"query":"status:active"}',
      });
    });

    it('should support an operation sourced from `additionalOperations`', async () => {
      const har = oasToHar(spec32, spec32.operation('/search', 'PURGE'));

      await expect(har).toBeAValidHAR();
      expect(har.log.entries[0].request.method).toBe('PURGE');
      expect(har.log.entries[0].request.url).toBe('https://httpbin.org/search');
    });
  });

  describe('url', () => {
    it('should be constructed from oas.url()', () => {
      const spec = Oas.init(structuredClone(petstore));
      const operation = spec.operation('/pet', 'post');
      const har = oasToHar(spec, operation);

      expect(har.log.entries[0].request.url).toBe(`${spec.url()}/pet`);
    });

    it('should replace whitespace with %20', () => {
      const spec = Oas.init({
        paths: {
          '/path with spaces': {
            get: {},
          },
        },
      });

      expect(oasToHar(spec, spec.operation('/path with spaces', 'get')).log.entries[0].request.url).toBe(
        'https://example.com/path%20with%20spaces',
      );
    });

    describe('server variables', () => {
      let variablesOas: Oas;
      let operation: Operation;

      beforeEach(() => {
        variablesOas = new Oas(serverVariables as OASDocument);
        operation = variablesOas.operation('/global', 'post');
      });

      it('should use defaults if not supplied', () => {
        const har = oasToHar(variablesOas, operation, {});

        expect(har.log.entries[0].request.url).toBe('https://demo.example.com:443/v2/global');
      });

      it('should support server variables', () => {
        const formData = {
          server: {
            selected: 0,
            variables: { name: 'buster', port: 8080, basePath: 'v2.1' },
          },
        };

        const har = oasToHar(variablesOas, operation, formData);

        expect(har.log.entries[0].request.url).toBe('https://buster.example.com:8080/v2.1/global');
      });

      it('should support multiple/alternate servers', () => {
        const formData = {
          server: {
            selected: 1,
            variables: { name: 'buster', port: 8080, basePath: 'v2.1' },
          },
        };

        const har = oasToHar(variablesOas, operation, formData);

        expect(har.log.entries[0].request.url).toBe('http://buster.local/v2.1/global');
      });

      it('should not error if the selected server does not exist', () => {
        const formData = {
          server: {
            selected: 3,
          },
        };

        const har = oasToHar(variablesOas, operation, formData);

        expect(har.log.entries[0].request.url).toBe('https://example.com/global');
      });

      it('should fill in missing variables with their defaults', () => {
        const formData = {
          server: {
            selected: 0,
            variables: { name: 'buster' }, // `port` and `basePath` are missing
          },
        };

        const har = oasToHar(variablesOas, operation, formData);

        expect(har.log.entries[0].request.url).toBe('https://buster.example.com:443/v2/global');
      });

      it('should use path item servers for the request URL', () => {
        const spec = Oas.init(serverVariables as OASDocument);
        const pathServerOperation = spec.operation('/path', 'put');
        const har = oasToHar(spec, pathServerOperation);

        expect(har.log.entries[0].request.url).toBe('https://httpbin.com/anything/common/demo/path');
      });

      it('should use operation servers before path item and root servers for the request URL', () => {
        const spec = Oas.init(serverVariables as OASDocument);
        const operationServerOperation = spec.operation('/combo', 'put');
        const har = oasToHar(spec, operationServerOperation);

        expect(har.log.entries[0].request.url).toBe('https://httpbin.com/anything/demo/combo');
      });

      it('should use path item servers when supplied a plain object operation schema', () => {
        const spec = Oas.init(serverVariables as OASDocument);
        const operationSchema = { method: 'put', path: '/path' } as Operation;
        const har = oasToHar(spec, operationSchema);

        expect(har.log.entries[0].request.url).toBe('https://httpbin.com/anything/common/demo/path');
      });

      it('should use the selected operation server for the request URL', () => {
        const spec = Oas.init(serverVariables as OASDocument);
        const operationServerOperation = spec.operation('/operation', 'post');
        const har = oasToHar(spec, operationServerOperation, {
          server: {
            selected: 1,
          },
        });

        expect(har.log.entries[0].request.url).toBe('http://httpbin.com/anything/alt/demo/operation');
      });

      it('should use supplied operation server variables for the request URL', () => {
        const spec = Oas.init(serverVariables as OASDocument);
        const operationServerOperation = spec.operation('/operation', 'post');
        const har = oasToHar(spec, operationServerOperation, {
          server: {
            selected: 0,
            variables: { subpath: 'v9' },
          },
        });

        expect(har.log.entries[0].request.url).toBe('https://httpbin.com/anything/v9/operation');
      });
    });

    describe('proxy url', () => {
      let proxyOas: Oas;

      beforeEach(() => {
        proxyOas = Oas.init({
          paths: {
            '/path': {
              get: {},
            },
          },
          [PROXY_ENABLED]: true,
        });
      });

      it('should not be prefixed without proxyUrl', () => {
        const har = oasToHar(proxyOas, proxyOas.operation('/path', 'get'));

        expect(har.log.entries[0].request.url).toBe('https://example.com/path');
      });

      it('should be prefixed with proxyUrl', () => {
        const har = oasToHar(
          proxyOas,
          proxyOas.operation('/path', 'get'),
          {},
          {},
          { proxyUrl: 'https://try.readme.io' },
        );

        expect(har.log.entries[0].request.url).toBe('https://try.readme.io/https://example.com/path');
      });
    });
  });

  describe('auth', () => {
    it('should work for header', () => {
      const spec = Oas.init({
        paths: {
          '/security': {
            get: {
              security: [{ 'auth-header': [] }],
            },
          },
        },
        components: {
          securitySchemes: {
            'auth-header': {
              type: 'apiKey',
              name: 'x-auth-header',
              in: 'header',
            },
          },
        },
      });

      expect(
        oasToHar(spec, spec.operation('/security', 'get'), {}, { 'auth-header': 'value' }).log.entries[0].request
          .headers,
      ).toStrictEqual([
        {
          name: 'x-auth-header',
          value: 'value',
        },
      ]);
    });

    it('should work for query', () => {
      const spec = Oas.init({
        paths: {
          '/security': {
            get: {
              security: [{ 'auth-query': [] }],
            },
          },
        },
        components: {
          securitySchemes: {
            'auth-query': {
              type: 'apiKey',
              name: 'authQuery',
              in: 'query',
            },
          },
        },
      });

      expect(
        oasToHar(
          spec,
          spec.operation('/security', 'get'),
          {},
          {
            'auth-query': 'value',
          },
        ).log.entries[0].request.queryString,
      ).toStrictEqual([
        {
          name: 'authQuery',
          value: 'value',
        },
      ]);
    });

    it('should work for cookie', () => {
      const spec = Oas.init({
        paths: {
          '/security': {
            get: {
              security: [{ 'auth-cookie': [] }],
            },
          },
        },
        components: {
          securitySchemes: {
            'auth-cookie': {
              type: 'apiKey',
              name: 'authCookie',
              in: 'cookie',
            },
          },
        },
      });

      expect(
        oasToHar(
          spec,
          spec.operation('/security', 'get'),
          {},
          {
            'auth-cookie': 'value',
          },
        ).log.entries[0].request.cookies,
      ).toStrictEqual([
        {
          name: 'authCookie',
          value: 'value',
        },
      ]);
    });

    it('should work for multiple (||)', () => {
      const spec = Oas.init({
        paths: {
          '/security': {
            get: {
              security: [{ 'auth-header': [] }, { 'auth-header2': [] }],
            },
          },
        },
        components: {
          securitySchemes: {
            'auth-header': {
              type: 'apiKey',
              name: 'x-auth-header',
              in: 'header',
            },
            'auth-header2': {
              type: 'apiKey',
              name: 'x-auth-header2',
              in: 'header',
            },
          },
        },
      });

      expect(
        oasToHar(
          spec,
          spec.operation('/security', 'get'),
          {},
          {
            'auth-header': 'value',
            'auth-header2': 'value',
          },
        ).log.entries[0].request.headers,
      ).toStrictEqual([
        {
          name: 'x-auth-header',
          value: 'value',
        },
        {
          name: 'x-auth-header2',
          value: 'value',
        },
      ]);
    });

    it('should work for multiple (&&)', () => {
      const spec = Oas.init({
        paths: {
          '/security': {
            get: {
              security: [{ 'auth-header': [], 'auth-header2': [] }],
            },
          },
        },
        components: {
          securitySchemes: {
            'auth-header': {
              type: 'apiKey',
              name: 'x-auth-header',
              in: 'header',
            },
            'auth-header2': {
              type: 'apiKey',
              name: 'x-auth-header2',
              in: 'header',
            },
          },
        },
      });

      expect(
        oasToHar(
          spec,
          spec.operation('/security', 'get'),
          {},
          {
            'auth-header': 'value',
            'auth-header2': 'value',
          },
        ).log.entries[0].request.headers,
      ).toStrictEqual([
        {
          name: 'x-auth-header',
          value: 'value',
        },
        {
          name: 'x-auth-header2',
          value: 'value',
        },
      ]);
    });

    it('should not set non-existent values', () => {
      const spec = Oas.init({
        paths: {
          '/security': {
            get: {
              security: [{ 'auth-header': [] }],
            },
          },
        },
        components: {
          securitySchemes: {
            'auth-header': {
              type: 'apiKey',
              name: 'x-auth-header',
              in: 'header',
            },
          },
        },
      });

      const har = oasToHar(spec, spec.operation('/security', 'get'), {}, {});

      expect(har.log.entries[0].request.headers).toHaveLength(0);
    });
  });

  describe('x-headers', () => {
    it('should append any static headers to the request', () => {
      const spec = Oas.init({
        paths: {
          '/': {
            post: {},
          },
        },
        'x-headers': [
          {
            key: 'x-api-key',
            value: '123456',
          },
        ],
      });

      expect(oasToHar(spec, spec.operation('/', 'post')).log.entries[0].request.headers).toStrictEqual([
        { name: 'x-api-key', value: '123456' },
      ]);
    });
  });
});
