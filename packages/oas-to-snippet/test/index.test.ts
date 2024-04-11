import type { SupportedLanguages } from '../src/languages.js';
import type { HarRequest } from '@readme/httpsnippet';

import fileUploads from '@readme/oas-examples/3.0/json/file-uploads.json';
import petstoreOas from '@readme/oas-examples/3.0/json/petstore.json';
import harExamples from 'har-examples';
import httpsnippetClientAPIPlugin from 'httpsnippet-client-api';
import Oas from 'oas';
import { PROXY_ENABLED } from 'oas/extensions';
import { describe, beforeEach, it, expect } from 'vitest';

import oasToSnippet from '../src/index.js';
import { getSupportedLanguages } from '../src/languages.js';

import owlbertShrub from './__datasets__/owlbert-shrub.dataurl.json';
import owlbert from './__datasets__/owlbert.dataurl.json';
import queryEncodedHAR from './__datasets__/query-encoded.har.json';
import multipartFormDataOneOfRequestBody from './__datasets__/quirks/multipart-oneOf-requestbody.json';

const petstore = Oas.init(petstoreOas);

const OAS_REGISTRY_IDENTIFIER = '@developers/v2.0#17273l2glm9fq4l5';

const formData = {
  path: {
    petId: 123,
  },
  body: {
    name: 'buster',
  },
};

describe('oas-to-snippet', () => {
  describe('HAR overrides', () => {
    it('should be able to accept a har override', () => {
      const { code } = oasToSnippet(null, null, null, null, 'node', { harOverride: harExamples.full });
      expect(code).toBe(`const { URLSearchParams } = require('url');
const fetch = require('node-fetch');
const encodedParams = new URLSearchParams();

encodedParams.set('foo', 'bar');

const url = 'https://httpbin.org/post?foo=bar&foo=baz&baz=abc&key=value';
const options = {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
    cookie: 'foo=bar; bar=baz'
  },
  body: encodedParams
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error('error:' + err));`);
    });

    it('should treat overrides as if they are not yet encoded', () => {
      const { code } = oasToSnippet(null, null, null, null, 'node', {
        harOverride: queryEncodedHAR as unknown as HarRequest,
      });

      expect(code).toBe(`const fetch = require('node-fetch');

const url = 'https://httpbin.org/anything?startTime=2019-06-13T19%3A08%3A25.455Z&endTime=2015-09-15T14%3A00%3A12-04%3A00';
const options = {method: 'GET'};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error('error:' + err));`);
    });
  });

  it('should return falsy values for an unknown language', () => {
    // @ts-expect-error Testing an improper typing case here.
    const codeSnippet = oasToSnippet(petstore, petstore.operation('/pet/{petId}', 'get'), {}, {}, 'css');

    expect(codeSnippet).toStrictEqual({
      code: '',
      highlightMode: false,
      install: false,
    });
  });

  it('should pass through values to code snippet', () => {
    const { code } = oasToSnippet(petstore, petstore.operation('/pet/{petId}', 'get'), formData, {}, 'node');

    expect(code).toContain('http://petstore.swagger.io/v2/pet/123');
  });

  it('should pass through json values to code snippet', () => {
    const { code } = oasToSnippet(petstore, petstore.operation('/pet', 'post'), { body: { id: '123' } }, {}, 'node');

    expect(code).toContain("body: JSON.stringify({id: '123'}");
  });

  it('should pass through form encoded values to code snippet', () => {
    const { code } = oasToSnippet(
      petstore,
      petstore.operation('/pet/{petId}', 'post'),
      {
        path: { petId: 123 },
        formData: {
          id: '123',
          name: 'buster',
        },
      },
      {},
      'node',
    );

    expect(code).toContain("encodedParams.set('id', '123');");
    expect(code).toContain("encodedParams.set('name', 'buster');");
    expect(code).toContain('body: encodedParams');
  });

  it('should have special indents for curl snippets', () => {
    const oas = Oas.init({
      paths: {
        '/body': {
          get: {
            requestBody: {
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
          },
        },
      },
    });

    const { code } = oasToSnippet(
      oas,
      oas.operation('/body', 'get'),
      { formData: { a: 'test', b: [1, 2, 3] } },
      {},
      'shell',
    );

    expect(code).toBe(`curl --request GET \\
     --url https://example.com/body \\
     --header 'content-type: application/x-www-form-urlencoded' \\
     --data a=test \\
     --data 'b=1,2,3'`);
  });

  it('should have special indents in curl snippets for JSON payloads', () => {
    const oas = Oas.init({
      paths: {
        '/body': {
          get: {
            requestBody: {
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
          },
        },
      },
    });

    const { code } = oasToSnippet(
      oas,
      oas.operation('/body', 'get'),
      { body: { a: 'test', b: [1, 2, 3] } },
      {},
      'shell',
    );

    expect(code).toBe(`curl --request GET \\
     --url https://example.com/body \\
     --header 'content-type: application/json' \\
     --data '
{
  "a": "test",
  "b": [
    1,
    2,
    3
  ]
}
'`);
  });

  it('should not contain proxy url', () => {
    const oas = new Oas({
      ...JSON.parse(JSON.stringify(petstoreOas)),
      [PROXY_ENABLED]: true,
    });

    const { code } = oasToSnippet(oas, oas.operation('/pet/{petId}', 'post'), formData, {}, 'node');

    expect(code).toContain('http://petstore.swagger.io/v2/pet/123');
    expect(code).not.toContain('try.readme.io');
  });

  it('should not contain `withCredentials` in javascript snippets', () => {
    const { code } = oasToSnippet(petstore, petstore.operation('/pet/{petId}', 'post'), {}, {}, 'javascript');

    expect(code).not.toMatch(/withCredentials/);
  });

  it('should return with unhighlighted code', () => {
    const { code } = oasToSnippet(petstore, petstore.operation('/pet/{petId}', 'post'), {}, {}, 'javascript');

    expect(code).not.toMatch(/cm-s-tomorrow-night/);
  });

  describe('multipart/form-data handlings', () => {
    let formDataOas;

    beforeEach(() => {
      formDataOas = Oas.init({
        servers: [{ url: 'https://example.com' }],
        paths: {
          '/multipart': {
            post: {
              security: [
                {
                  bearerAuth: [],
                },
              ],
              requestBody: {
                $ref: '#/components/requestBodies/payload',
              },
              responses: {
                default: {
                  description: 'OK',
                },
              },
            },
          },
        },
        components: {
          requestBodies: {
            payload: {
              required: true,
              content: {
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    properties: {
                      orderId: {
                        type: 'integer',
                      },
                      userId: {
                        type: 'integer',
                      },
                      documentFile: {
                        type: 'string',
                        format: 'binary',
                      },
                    },
                  },
                },
              },
            },
          },
          securitySchemes: {
            bearerAuth: {
              type: 'apiKey',
              name: 'Authorization',
              in: 'header',
            },
          },
        },
      });
    });

    it('should convert a `multipart/form-data` operation into a proper snippet that uses the original file', () => {
      const { code } = oasToSnippet(
        formDataOas,
        formDataOas.operation('/multipart', 'post'),
        {
          body: { orderId: 10, userId: 3232, documentFile: owlbert },
        },
        {},
        'shell',
      );

      expect(code).toBe(`curl --request POST \\
     --url https://example.com/multipart \\
     --header 'content-type: multipart/form-data' \\
     --form orderId=10 \\
     --form userId=3232 \\
     --form documentFile='@owlbert.png'`);
    });

    it('should handle a `multipart/form-data` schema that has a `oneOf`', async () => {
      const oas = Oas.init(multipartFormDataOneOfRequestBody);
      await oas.dereference();

      const { code } = oasToSnippet(
        oas,
        oas.operation('/anything', 'post'),
        {
          body: {
            output_type: 'cutout',
            bg_blur: 0,
            scale: 'fit',
            format: 'PNG',
            bg_image: 'fef',
          },
        },
        {},
        'shell',
      );

      expect(code).toBe(`curl --request POST \\
     --url https://httpbin.org/anything \\
     --header 'content-type: multipart/form-data' \\
     --form output_type=cutout \\
     --form bg_blur=0 \\
     --form scale=fit \\
     --form format=PNG \\
     --form bg_image=fef`);
    });
  });

  it('should not double-encode query strings', () => {
    const startTime = '2019-06-13T19:08:25.455Z';
    const endTime = '2015-09-15T14:00:12-04:00';

    const oas = Oas.init({
      paths: {
        '/': {
          get: {
            parameters: [
              {
                explode: true,
                in: 'query',
                name: 'startTime',
                schema: {
                  type: 'string',
                },
                style: 'form',
              },
              {
                explode: true,
                in: 'query',
                name: 'endTime',
                schema: {
                  type: 'string',
                },
                style: 'form',
              },
            ],
          },
        },
      },
    });

    const snippet = oasToSnippet(oas, oas.operation('/', 'get'), { query: { startTime, endTime } }, {}, 'javascript');

    expect(snippet.code).toContain(encodeURIComponent(startTime));
    expect(snippet.code).toContain(encodeURIComponent(endTime));
    expect(snippet.code).not.toContain(encodeURIComponent(encodeURIComponent(startTime)));
    expect(snippet.code).not.toContain(encodeURIComponent(encodeURIComponent(endTime)));
  });

  it('should handle `multipart/form-data` payloads of multiple files', () => {
    const oas = Oas.init(fileUploads);

    const snippet = oasToSnippet(
      oas,
      oas.operation('/anything/multipart-formdata', 'put'),
      { body: { filename: [owlbert, owlbertShrub] } },
      {},
      'node',
    );

    expect(snippet.code).toContain("formData.append('filename', fs.createReadStream('owlbert.png'));");
    expect(snippet.code).toContain("formData.append('filename', fs.createReadStream('owlbert-shrub.png'));");
  });

  it('should handle a `multipart/form-data` payload where a file has an underscore in its name', () => {
    const oas = Oas.init(fileUploads);

    const snippet = oasToSnippet(
      oas,
      oas.operation('/anything/multipart-formdata', 'post'),
      {
        body: {
          documentFile: 'data:text/plain;name=lorem_ipsum.txt;base64,TG9yZW0gaXBzdW0gZG9sb3Igc2l0IG1ldA==',
        },
      },
      {},
      'node',
    );

    expect(snippet.code).toContain("formData.append('documentFile', fs.createReadStream('lorem_ipsum.txt'));");
  });

  describe('supported languages', () => {
    const supportedLanguages = getSupportedLanguages({
      plugins: [httpsnippetClientAPIPlugin],
    });

    describe.each(Object.keys(supportedLanguages))('%s', (lang: keyof SupportedLanguages) => {
      const targets = Object.keys(supportedLanguages[lang].httpsnippet.targets);

      it('should have a language definition', () => {
        expect(supportedLanguages[lang].highlight).toStrictEqual(expect.any(String));
        expect(supportedLanguages[lang].httpsnippet.lang).toStrictEqual(expect.any(String));
        expect(supportedLanguages[lang].httpsnippet.default).toStrictEqual(expect.any(String));
        expect(supportedLanguages[lang].httpsnippet.targets).toStrictEqual(expect.any(Object));

        expect(targets.length).toBeGreaterThanOrEqual(1);
        expect(targets).toContain(supportedLanguages[lang].httpsnippet.default);
      });

      it('should generate code for the default target', () => {
        const snippet = oasToSnippet(petstore, petstore.operation('/pet', 'post'), formData, {}, lang);

        expect(snippet).toMatchSnapshot();
      });

      describe('targets', () => {
        describe.each(targets)('%s', target => {
          it('should be properly defined', () => {
            expect(supportedLanguages[lang].httpsnippet.targets[target].name).toStrictEqual(expect.any(String));

            if ('opts' in supportedLanguages[lang].httpsnippet.targets[target]) {
              // eslint-disable-next-line vitest/no-conditional-expect
              expect(supportedLanguages[lang].httpsnippet.targets[target].opts).toStrictEqual(expect.any(Object));
            }

            if ('install' in supportedLanguages[lang].httpsnippet.targets[target]) {
              // eslint-disable-next-line vitest/no-conditional-expect
              expect(supportedLanguages[lang].httpsnippet.targets[target].install).toStrictEqual(expect.any(String));
            }
          });

          it('should support snippet generation', () => {
            const snippet = oasToSnippet(
              petstore,
              petstore.operation('/user/login', 'get'),
              {
                query: { username: 'woof', password: 'barkbarkbark' },
              },
              {},
              [lang, target],
              {
                openapi: {
                  registryIdentifier: OAS_REGISTRY_IDENTIFIER,
                  // variableName: 'developers',
                },
                plugins: [httpsnippetClientAPIPlugin],
              },
            );

            expect(snippet).toMatchSnapshot();
          });

          if (lang === 'node' && target === 'api') {
            it('should support custom variable names', () => {
              const snippet = oasToSnippet(
                petstore,
                petstore.operation('/user/login', 'get'),
                {
                  query: { username: 'woof', password: 'barkbarkbark' },
                },
                {},
                [lang, target],
                {
                  openapi: {
                    registryIdentifier: OAS_REGISTRY_IDENTIFIER,
                    variableName: 'developers',
                  },
                  plugins: [httpsnippetClientAPIPlugin],
                },
              );

              expect(snippet).toMatchSnapshot();
            });
          }
        });
      });
    });

    it('should gracefully fallback to `fetch` snippets if our `api` target fails', () => {
      // Reason that this'll trigger a failure in the `api` snippet target is because we aren't
      // passing in an API definition for it to look or an operation in.
      const snippet = oasToSnippet(null, null, null, null, ['node', 'api'], {
        harOverride: harExamples.full,
        openapi: {
          registryIdentifier: OAS_REGISTRY_IDENTIFIER,
        },
        plugins: [httpsnippetClientAPIPlugin],
      });

      expect(snippet.code).toContain('node-fetch');
      expect(snippet.highlightMode).toBe('javascript');
    });

    it('should gracefully fallback to `fetch` snippets if our `api` plugin isnt loaded', () => {
      expect(() => {
        oasToSnippet(null, null, null, null, ['node', 'api'], {
          harOverride: harExamples.full,
          openapi: {
            registryIdentifier: OAS_REGISTRY_IDENTIFIER,
          },
        });
      }).toThrow(/is not supported/);
    });
  });
});
