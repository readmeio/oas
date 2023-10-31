import type { DataForHAR } from '../src/lib/types.js';
import type { Request } from 'har-format';
import type { OperationObject } from 'oas/types';

import toBeAValidHAR from 'jest-expect-har';
import Oas from 'oas';
import { describe, beforeEach, it, expect } from 'vitest';

import oasToHar from '../src/index.js';

import commonParameters from './__datasets__/common-parameters.json';

expect.extend({ toBeAValidHAR });

describe('parameter handling', () => {
  describe('path', () => {
    it('should pass through unknown path params', () => {
      const spec = Oas.init({
        paths: {
          '/path-param/{id}': {
            get: {},
            post: {
              parameters: [
                {
                  name: 'something-else',
                  in: 'path',
                  required: true,
                },
              ],
            },
          },
        },
      });

      expect(oasToHar(spec, spec.operation('/path-param/{id}', 'get')).log.entries[0].request.url).toBe(
        'https://example.com/path-param/id',
      );

      expect(oasToHar(spec, spec.operation('/path-param/{id}', 'post')).log.entries[0].request.url).toBe(
        'https://example.com/path-param/id',
      );
    });

    function assertPath(operation: OperationObject, formData: DataForHAR, expected: string) {
      return async () => {
        const spec = Oas.init({
          paths: {
            '/path-param/{id}': {
              get: operation,
            },
          },
        });

        const har = oasToHar(spec, spec.operation('/path-param/{id}', 'get'), formData);
        await expect(har).toBeAValidHAR();

        expect(har.log.entries[0].request.url).toBe(expected);
      };
    }

    it(
      'should not error if empty object passed in for values',
      assertPath(
        {
          parameters: [{ name: 'id', in: 'path', required: true }],
        },
        {},
        'https://example.com/path-param/id',
      ),
    );

    it(
      'should use default if no value',
      assertPath(
        {
          parameters: [{ name: 'id', in: 'path', required: true, schema: { default: '123' } }],
        },
        {},
        'https://example.com/path-param/123',
      ),
    );

    it(
      'should add path values to the url',
      assertPath(
        {
          parameters: [{ name: 'id', in: 'path', required: true }],
        },
        { path: { id: '456' } },
        'https://example.com/path-param/456',
      ),
    );

    it(
      'should add falsy values to the url',
      assertPath(
        {
          parameters: [{ name: 'id', in: 'path', required: true }],
        },
        { path: { id: 0 } },
        'https://example.com/path-param/0',
      ),
    );
  });

  describe('query', () => {
    function assertQueryParams(operation: OperationObject, formData: DataForHAR, expected: Request['queryString']) {
      return async () => {
        const spec = Oas.init({
          paths: {
            '/query': {
              get: operation,
            },
          },
        });

        const har = oasToHar(spec, spec.operation('/query', 'get'), formData);
        await expect(har).toBeAValidHAR();

        expect(har.log.entries[0].request.queryString).toStrictEqual(expected);
      };
    }

    it(
      'should not add on empty unrequired values',
      assertQueryParams({ parameters: [{ name: 'a', in: 'query' }] }, {}, []),
    );

    it(
      'should not add the parameter name as a value if required but missing',
      assertQueryParams({ parameters: [{ name: 'a', in: 'query', required: true }] }, {}, []),
    );

    it(
      'should set defaults if no value provided but is required',
      assertQueryParams(
        {
          parameters: [{ name: 'a', in: 'query', required: true, schema: { default: 'value' } }],
        },
        {},
        [{ name: 'a', value: 'value' }],
      ),
    );

    it(
      'should pass in value if one is set and prioritize provided values',
      assertQueryParams(
        {
          parameters: [{ name: 'a', in: 'query', required: true, schema: { default: 'value' } }],
        },
        { query: { a: 'test' } },
        [{ name: 'a', value: 'test' }],
      ),
    );

    it(
      'should add falsy values to the querystring',
      assertQueryParams(
        {
          parameters: [{ name: 'id', in: 'query' }],
        },
        { query: { id: 0 } },
        [{ name: 'id', value: '0' }],
      ),
    );

    it(
      'should handle null array values',
      assertQueryParams(
        {
          parameters: [{ name: 'id', in: 'query' }],
        },
        { query: { id: [null, null] } },
        [{ name: 'id', value: '&id=' }],
      ),
    );

    it(
      'should handle null values',
      assertQueryParams(
        {
          parameters: [{ name: 'id', in: 'query' }],
        },
        { query: { id: null } },
        [{ name: 'id', value: 'null' }],
      ),
    );

    it(
      'should handle null default values',
      assertQueryParams(
        {
          parameters: [
            {
              name: 'id',
              in: 'query',
              required: true,
              schema: {
                type: 'array',
                items: {
                  type: 'string',
                },
                default: [null, null],
              },
            },
          ],
        },
        { query: {} },
        [{ name: 'id', value: '&id=' }],
      ),
    );

    describe('URI encoding', () => {
      let spec;

      beforeEach(function () {
        spec = Oas.init({
          servers: [{ url: 'https://httpbin.org/' }],
          paths: {
            '/anything': {
              get: {
                parameters: [
                  { name: 'stringPound', in: 'query', schema: { type: 'string' } },
                  { name: 'stringPound2', in: 'query', schema: { type: 'string' } },
                  { name: 'stringHash', in: 'query', schema: { type: 'string' } },
                  { name: 'stringArray', in: 'query', schema: { type: 'string' } },
                  { name: 'stringWeird', in: 'query', schema: { type: 'string' } },
                  { name: 'array', in: 'query', schema: { type: 'array', items: { type: 'string' } } },
                ],
              },
            },
          },
        });
      });

      it('should encode query parameters', async () => {
        const formData = {
          query: {
            stringPound: 'something&nothing=true',
            stringHash: 'hash#data',
            stringArray: 'where[4]=10',
            stringWeird: 'properties["$email"] == "testing"',
            array: [
              encodeURIComponent('something&nothing=true'), // This is already encoded so it shouldn't be double encoded.
              'nothing&something=false',
              'another item',
            ],
          },
        };

        const operation = spec.operation('/anything', 'get');

        const har = oasToHar(spec, operation, formData);
        await expect(har).toBeAValidHAR();

        expect(har.log.entries[0].request.queryString).toStrictEqual([
          { name: 'stringPound', value: 'something%26nothing%3Dtrue' },
          { name: 'stringHash', value: 'hash%23data' },
          { name: 'stringArray', value: 'where%5B4%5D%3D10' },
          {
            name: 'stringWeird',
            value: 'properties%5B%22%24email%22%5D%20%3D%3D%20%22testing%22',
          },
          { name: 'array', value: 'something%26nothing%3Dtrue&array=nothing%26something%3Dfalse&array=another%20item' },
        ]);
      });

      it('should not double encode query parameters that are already encoded', async () => {
        const formData = {
          query: {
            stringPound: encodeURIComponent('something&nothing=true'),
            stringHash: encodeURIComponent('hash#data'),
            stringArray: encodeURIComponent('where[4]=10'),
            stringWeird: encodeURIComponent('properties["$email"] == "testing"'),
            array: [
              'something&nothing=true', // Should still encode this one eventhrough the others are already encoded.
              encodeURIComponent('nothing&something=false'),
              encodeURIComponent('another item'),
            ],
          },
        };

        const operation = spec.operation('/anything', 'get');

        const har = oasToHar(spec, operation, formData);
        await expect(har).toBeAValidHAR();

        expect(har.log.entries[0].request.queryString).toStrictEqual([
          { name: 'stringPound', value: 'something%26nothing%3Dtrue' },
          { name: 'stringHash', value: 'hash%23data' },
          { name: 'stringArray', value: 'where%5B4%5D%3D10' },
          {
            name: 'stringWeird',
            value: 'properties%5B%22%24email%22%5D%20%3D%3D%20%22testing%22',
          },
          { name: 'array', value: 'something%26nothing%3Dtrue&array=nothing%26something%3Dfalse&array=another%20item' },
        ]);
      });
    });
  });

  describe('cookie', () => {
    function assertCookies(operation: OperationObject, formData: DataForHAR, expected: Request['cookies']) {
      return async () => {
        const spec = Oas.init({
          paths: {
            '/cookie': {
              get: operation,
            },
          },
        });

        const har = oasToHar(spec, spec.operation('/cookie', 'get'), formData);
        await expect(har).toBeAValidHAR();

        expect(har.log.entries[0].request.cookies).toStrictEqual(expected);
      };
    }

    it(
      'should not add on empty unrequired values',
      assertCookies({ parameters: [{ name: 'a', in: 'cookie' }] }, {}, []),
    );

    it(
      'should not add the parameter name as a value if required but missing',
      assertCookies({ parameters: [{ name: 'a', in: 'cookie', required: true }] }, {}, []),
    );

    it(
      'should set defaults if no value provided but is required',
      assertCookies(
        {
          parameters: [{ name: 'a', in: 'cookie', required: true, schema: { default: 'value' } }],
        },
        {},
        [{ name: 'a', value: 'value' }],
      ),
    );

    it(
      'should pass in value if one is set and prioritize provided values',
      assertCookies(
        {
          parameters: [{ name: 'a', in: 'cookie', required: true, schema: { default: 'value' } }],
        },
        { cookie: { a: 'test' } },
        [{ name: 'a', value: 'test' }],
      ),
    );

    it(
      'should add falsy values to the cookies',
      assertCookies(
        {
          parameters: [{ name: 'id', in: 'cookie' }],
        },
        { cookie: { id: 0 } },
        [{ name: 'id', value: '0' }],
      ),
    );
  });

  describe('header', () => {
    function assertHeaders(operation: OperationObject, formData: DataForHAR, expected: Request['headers']) {
      return async () => {
        const spec = Oas.init({
          paths: {
            '/header': {
              post: operation,
            },
          },
        });

        const har = oasToHar(spec, spec.operation('/header', 'post'), formData);
        await expect(har).toBeAValidHAR();

        expect(har.log.entries[0].request.headers).toStrictEqual(expected);
      };
    }

    it(
      'should not add on empty unrequired values',
      assertHeaders({ parameters: [{ name: 'a', in: 'header' }] }, {}, []),
    );

    it(
      'should not add the parameter name as a value if required but missing',
      assertHeaders({ parameters: [{ name: 'a', in: 'header', required: true }] }, {}, []),
    );

    it(
      'should set defaults if no value provided but is required',
      assertHeaders(
        {
          parameters: [{ name: 'a', in: 'header', required: true, schema: { default: 'value' } }],
        },
        {},
        [{ name: 'a', value: 'value' }],
      ),
    );

    it(
      'should pass in value if one is set and prioritize provided values',
      assertHeaders(
        {
          parameters: [{ name: 'a', in: 'header', required: true, schema: { default: 'value' } }],
        },
        { header: { a: 'test' } },
        [{ name: 'a', value: 'test' }],
      ),
    );

    it(
      'should retain defined header casing',
      assertHeaders(
        {
          parameters: [{ name: 'reqKey', in: 'header', required: true, schema: { default: 'value' } }],
        },
        { header: { reqKey: 'test' } },
        [{ name: 'reqKey', value: 'test' }],
      ),
    );

    it(
      'should pass an `accept` header if endpoint expects a content back from response',
      assertHeaders(
        {
          parameters: [{ name: 'a', in: 'header', required: true, schema: { default: 'value' } }],
          responses: {
            200: {
              description: 'ok',
              content: {
                'application/xml': { schema: { type: 'array', items: {} } },
                'text/plain': { schema: { type: 'array', items: {} } },
              },
            },
          },
        },
        {},
        [
          { name: 'accept', value: 'application/xml' },
          { name: 'a', value: 'value' },
        ],
      ),
    );

    it(
      'should pass an `accept` header if endpoint expects a content back from response, but prioritize JSON',
      assertHeaders(
        {
          parameters: [{ name: 'a', in: 'header', required: true, schema: { default: 'value' } }],
          responses: {
            200: {
              description: 'ok',
              content: {
                'application/xml': { schema: { type: 'array', items: {} } },
                'application/json': { schema: { type: 'array', items: {} } },
              },
            },
          },
        },
        {},
        [
          { name: 'accept', value: 'application/json' },
          { name: 'a', value: 'value' },
        ],
      ),
    );

    it(
      'should only add one `accept` header when multiple responses are present',
      assertHeaders(
        {
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/xml': {},
              },
            },
            400: {
              description: 'Bad Request',
              content: {
                'application/json': {},
              },
            },
          },
        },
        {},
        [{ name: 'accept', value: 'application/xml' }],
      ),
    );

    it(
      'should only receive one `accept` header if specified in values',
      assertHeaders(
        {
          parameters: [{ name: 'accept', in: 'header' }],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {},
                'application/xml': {},
              },
            },
          },
        },
        { header: { accept: 'application/xml' } },
        [{ name: 'accept', value: 'application/xml' }],
      ),
    );

    it(
      'should add `accept` header if specified in formdata',
      assertHeaders(
        {
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {},
                'application/xml': {},
              },
            },
          },
        },
        { header: { accept: 'application/xml' } },
        [{ name: 'accept', value: 'application/xml' }],
      ),
    );

    it(
      'should add falsy values to the headers',
      assertHeaders(
        {
          parameters: [{ name: 'id', in: 'header' }],
        },
        { header: { id: 0 } },
        [{ name: 'id', value: '0' }],
      ),
    );
  });

  describe('common parameters', () => {
    it('should work for common parameters', async () => {
      const spec = Oas.init(commonParameters);
      await spec.dereference();

      const har = oasToHar(spec, spec.operation('/anything/{id}', 'post'), {
        path: { id: 1234 },
        header: { 'x-extra-id': 'abcd' },
        query: { limit: 10 },
        cookie: { authtoken: 'password' },
      });

      await expect(har).toBeAValidHAR();
      expect(har.log.entries[0].request).toStrictEqual({
        bodySize: 0,
        cookies: [{ name: 'authtoken', value: 'password' }],
        headers: [{ name: 'x-extra-id', value: 'abcd' }],
        headersSize: 0,
        httpVersion: 'HTTP/1.1',
        queryString: [{ name: 'limit', value: '10' }],
        method: 'POST',
        url: 'https://httpbin.org/anything/1234',
      });
    });

    it('should not mutate the original operation that was passed in', () => {
      const spec = Oas.init(commonParameters);
      const operation = spec.operation('/anything/{id}', 'post');

      const existingCount = operation.schema.parameters.length;

      oasToHar(spec, operation, {
        path: { id: 1234 },
        header: { 'x-extra-id': 'abcd' },
        query: { limit: 10 },
        cookie: { authtoken: 'password' },
      });

      expect(operation.schema.parameters).toHaveLength(existingCount);
    });
  });
});
