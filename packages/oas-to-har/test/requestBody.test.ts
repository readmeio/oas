import fileUploads from '@readme/oas-examples/3.0/json/file-uploads.json';
import schemaTypes from '@readme/oas-examples/3.0/json/schema-types.json';
import toBeAValidHAR from 'jest-expect-har';
import Oas from 'oas';
import { HEADERS } from 'oas/extensions';
import { describe, it, expect } from 'vitest';

import oasToHar from '../src/index.js';

import deeplyNestedJsonFormats from './__datasets__/deeply-nested-json-formats.json';
import multipartFormDataArrayOfFiles from './__datasets__/multipart-form-data/array-of-files.json';
import multipartFormDataOneOfRequestBody from './__datasets__/multipart-form-data/oneOf-requestbody.json';
import multipartFormData from './__datasets__/multipart-form-data.json';
import owlbertShrubDataURL from './__datasets__/owlbert-shrub.dataurl.json';
import owlbertDataURL from './__datasets__/owlbert.dataurl.json';
import requestBodyRawBody from './__datasets__/requestBody-raw_body.json';

expect.extend({ toBeAValidHAR });

describe('request body handling', () => {
  describe('`body` data handling', () => {
    it('should not fail if a requestBody is present without a `schema`', () => {
      const spec = Oas.init({
        paths: {
          '/requestBody': {
            post: {
              requestBody: {
                content: {
                  'text/plain': {
                    example: '',
                  },
                },
              },
            },
          },
        },
      });

      expect(oasToHar(spec, spec.operation('/requestBody', 'post')).log.entries[0].request.postData).toBeUndefined();
    });

    it('should not add on empty unrequired values', () => {
      const spec = Oas.init({
        paths: {
          '/requestBody': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
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

      expect(oasToHar(spec, spec.operation('/requestBody', 'post')).log.entries[0].request.postData).toBeUndefined();
    });

    it('should pass in value if one is set and prioritize provided values', () => {
      const spec = Oas.init({
        paths: {
          '/requestBody': {
            post: {
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

      const har = oasToHar(spec, spec.operation('/requestBody', 'post'), { body: { a: 'test' } });

      expect(har.log.entries[0].request.postData.text).toBe(JSON.stringify({ a: 'test' }));
    });

    it('should support a null-assigned property', () => {
      const spec = Oas.init({
        paths: {
          '/requestBody': {
            post: {
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        foo: {
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

      const har = oasToHar(spec, spec.operation('/requestBody', 'post'), { body: { foo: null } });

      expect(har.log.entries[0].request.postData.text).toBe(JSON.stringify({ foo: null }));
    });

    it('should return nothing for undefined body property', () => {
      const spec = Oas.init({
        paths: {
          '/requestBody': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
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

      const har = oasToHar(spec, spec.operation('/requestBody', 'post'), { body: { a: undefined } });

      expect(har.log.entries[0].request.postData.text).toBeUndefined();
    });

    it('should work for schemas that require a lookup', () => {
      const spec = Oas.init({
        paths: {
          '/requestBody': {
            post: {
              requestBody: {
                $ref: '#/components/requestBodies/schema',
              },
            },
          },
        },
        components: {
          requestBodies: {
            schema: {
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { a: { type: 'integer' } } },
                },
              },
            },
          },
        },
      });

      const har = oasToHar(spec, spec.operation('/requestBody', 'post'), { body: { a: 123 } });

      expect(har.log.entries[0].request.postData.text).toBe(JSON.stringify({ a: 123 }));
    });

    it('should work for top level primitives', () => {
      const spec = Oas.init({
        paths: {
          '/requestBody': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
            put: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'integer',
                      format: 'int64',
                    },
                  },
                },
              },
            },
            patch: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'boolean',
                    },
                  },
                },
              },
            },
          },
        },
      });

      let har = oasToHar(spec, spec.operation('/requestBody', 'post'), { body: 'string' });
      expect(har.log.entries[0].request.postData.text).toBe(JSON.stringify('string'));

      har = oasToHar(spec, spec.operation('/requestBody', 'put'), { body: 123 });
      expect(har.log.entries[0].request.postData.text).toBe(JSON.stringify(123));

      har = oasToHar(spec, spec.operation('/requestBody', 'patch'), { body: true });
      expect(har.log.entries[0].request.postData.text).toBe(JSON.stringify(true));
    });

    it('should work for top level falsy primitives', () => {
      const spec = Oas.init({
        paths: {
          '/requestBody': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
            put: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'integer',
                      format: 'int64',
                    },
                  },
                },
              },
            },
            patch: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'boolean',
                    },
                  },
                },
              },
            },
          },
        },
      });

      let har = oasToHar(spec, spec.operation('/requestBody', 'post'), { body: '' });
      expect(har.log.entries[0].request.postData.text).toBe(JSON.stringify(''));

      har = oasToHar(spec, spec.operation('/requestBody', 'put'), { body: 0 });
      expect(har.log.entries[0].request.postData.text).toBe(JSON.stringify(0));

      har = oasToHar(spec, spec.operation('/requestBody', 'patch'), { body: false });
      expect(har.log.entries[0].request.postData.text).toBe(JSON.stringify(false));
    });

    it('should not include objects with undefined sub properties', () => {
      const spec = Oas.init({
        paths: {
          '/requestBody': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        a: {
                          type: 'object',
                          properties: {
                            b: {
                              type: 'string',
                            },
                            c: {
                              type: 'object',
                              properties: {
                                d: {
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
              },
            },
          },
        },
      });

      const har = oasToHar(spec, spec.operation('/requestBody', 'post'), {
        body: { a: { b: undefined, c: { d: undefined } } },
      });

      expect(har.log.entries[0].request.postData.text).toBeUndefined();
    });

    // When we first render the form, `formData.body` is `undefined` until something is typed into
    // the form. When using anyOf/oneOf if we change the schema before typing anything into the
    // form, then `onChange` is fired with `undefined` which causes this to error.
    it('should not error if `formData.body` is undefined', () => {
      const spec = Oas.init({
        paths: {
          '/requestBody': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
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

      const har = oasToHar(spec, spec.operation('/requestBody', 'post'), { body: undefined });
      expect(har.log.entries[0].request.postData).toBeUndefined();
    });

    describe('raw payloads', () => {
      it('should support raw JSON payloads', () => {
        const spec = Oas.init(schemaTypes);

        const har = oasToHar(spec, spec.operation('/anything/strings/top-level-payloads', 'post'), {
          body: JSON.stringify({ pug: 'buster' }),
        });

        expect(har.log.entries[0].request.postData.text).toBe('{"pug":"buster"}');
      });

      it('should support raw XML payloads', () => {
        const spec = Oas.init({
          paths: {
            '/requestBody': {
              post: {
                requestBody: {
                  content: {
                    'application/xml': {
                      schema: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
          },
        });

        const har = oasToHar(spec, spec.operation('/requestBody', 'post'), {
          body: '<xml>some content</xml>',
        });

        expect(har.log.entries[0].request.postData.text).toBe('<xml>some content</xml>');
      });
    });

    describe('`RAW_BODY`-named properties', () => {
      it('should work for RAW_BODY primitives', () => {
        const spec = Oas.init(requestBodyRawBody);
        const har = oasToHar(spec, spec.operation('/primitive', 'post'), { body: { RAW_BODY: 'test' } });

        expect(har.log.entries[0].request.postData.text).toBe('test');
      });

      it('should return empty for falsy RAW_BODY primitives', () => {
        const spec = Oas.init(requestBodyRawBody);
        const har = oasToHar(spec, spec.operation('/primitive', 'post'), { body: { RAW_BODY: '' } });

        expect(har.log.entries[0].request.postData.text).toBe('');
      });

      it('should work for RAW_BODY json', () => {
        const spec = Oas.init(requestBodyRawBody);
        const har = oasToHar(spec, spec.operation('/json', 'post'), { body: { RAW_BODY: '{ "a": 1 }' } });

        expect(har.log.entries[0].request.postData.text).toBe(JSON.stringify({ a: 1 }));
      });

      it('should work for RAW_BODY xml', () => {
        const spec = Oas.init(requestBodyRawBody);
        const har = oasToHar(spec, spec.operation('/xml', 'post'), { body: { RAW_BODY: '<xml>' } });

        expect(har.log.entries[0].request.postData.text).toBe('<xml>');
      });

      it('should work for RAW_BODY objects', () => {
        const spec = Oas.init(requestBodyRawBody);
        const har = oasToHar(spec, spec.operation('/objects', 'post'), { body: { RAW_BODY: { a: 'test' } } });

        expect(har.log.entries[0].request.postData.text).toBe(JSON.stringify({ a: 'test' }));
      });

      it('should work for RAW_BODY objects (but data is a primitive somehow)', () => {
        const spec = Oas.init(requestBodyRawBody);
        const har = oasToHar(spec, spec.operation('/objects', 'post'), { body: { RAW_BODY: 'test' } });

        expect(har.log.entries[0].request.postData.text).toBe('test');
      });

      it('should return empty for RAW_BODY objects', () => {
        const spec = Oas.init(requestBodyRawBody);
        const har = oasToHar(spec, spec.operation('/objects', 'post'), { body: { RAW_BODY: {} } });

        expect(har.log.entries[0].request.postData.text).toBeUndefined();
      });
    });

    describe('content types', () => {
      describe('multipart/form-data', () => {
        it('should handle multipart/form-data request bodies', () => {
          const fixture = Oas.init(multipartFormData);
          const har = oasToHar(fixture, fixture.operation('/anything', 'post'), {
            body: { orderId: 12345, userId: 67890, documentFile: owlbertDataURL },
          });

          expect(har.log.entries[0].request.headers).toStrictEqual([
            { name: 'content-type', value: 'multipart/form-data' },
          ]);

          expect(har.log.entries[0].request.postData).toStrictEqual({
            mimeType: 'multipart/form-data',
            params: [
              { name: 'orderId', value: '12345' },
              { name: 'userId', value: '67890' },
              {
                contentType: 'image/png',
                fileName: 'owlbert.png',
                name: 'documentFile',
                value: owlbertDataURL,
              },
            ],
          });
        });

        it('should handle multipart/form-data requests where the requestBody is a `oneOf`', async () => {
          const oas = Oas.init(multipartFormDataOneOfRequestBody);
          await oas.dereference();
          const operation = oas.operation('/anything', 'post');
          const values = {
            body: {
              output_type: 'cutout',
              bg_blur: 0,
              scale: 'fit',
              format: 'PNG',
              bg_image: 'fef',
            },
          };

          const har = oasToHar(oas, operation, values, {});

          expect(har.log.entries[0].request.headers).toStrictEqual([
            { name: 'content-type', value: 'multipart/form-data' },
          ]);

          expect(har.log.entries[0].request.postData).toStrictEqual({
            mimeType: 'multipart/form-data',
            params: [
              { name: 'output_type', value: 'cutout' },
              { name: 'bg_blur', value: '0' },
              { name: 'scale', value: 'fit' },
              { name: 'format', value: 'PNG' },
              { name: 'bg_image', value: 'fef' },
            ],
          });
        });

        it('should handle multipart/form-data request bodies where the filename contains parentheses', () => {
          // Doing this manually for now until when/if https://github.com/data-uri/datauri/pull/29 is accepted.
          const specialcharacters = owlbertDataURL.replace(
            'name=owlbert.png;',
            `name=${encodeURIComponent('owlbert (1).png')};`,
          );

          const fixture = Oas.init(multipartFormData);
          const har = oasToHar(fixture, fixture.operation('/anything', 'post'), {
            body: { orderId: 12345, userId: 67890, documentFile: specialcharacters },
          });

          expect(har.log.entries[0].request.headers).toStrictEqual([
            { name: 'content-type', value: 'multipart/form-data' },
          ]);

          expect(har.log.entries[0].request.postData).toStrictEqual({
            mimeType: 'multipart/form-data',
            params: [
              { name: 'orderId', value: '12345' },
              { name: 'userId', value: '67890' },
              {
                contentType: 'image/png',
                fileName: encodeURIComponent('owlbert (1).png'),
                name: 'documentFile',
                value: specialcharacters,
              },
            ],
          });
        });

        it('should handle a multipart/form-data request where files are in an array', () => {
          const fixture = Oas.init(multipartFormDataArrayOfFiles);
          const har = oasToHar(fixture, fixture.operation('/anything', 'post'), {
            body: {
              documentFiles: [owlbertDataURL, owlbertShrubDataURL],
            },
          });

          expect(har.log.entries[0].request.postData).toStrictEqual({
            mimeType: 'multipart/form-data',
            params: [
              {
                name: 'documentFiles',
                value: owlbertDataURL,
                fileName: 'owlbert.png',
                contentType: 'image/png',
              },
              {
                name: 'documentFiles',
                value: owlbertShrubDataURL,
                fileName: 'owlbert-shrub.png',
                contentType: 'image/png',
              },
            ],
          });
        });

        it('should handle a file that has an underscore in its name', () => {
          const fixture = Oas.init(fileUploads);
          const har = oasToHar(fixture, fixture.operation('/anything/multipart-formdata', 'post'), {
            body: {
              documentFile: 'data:text/plain;name=lorem_ipsum.txt;base64,TG9yZW0gaXBzdW0gZG9sb3Igc2l0IG1ldA==',
            },
          });

          expect(har.log.entries[0].request.postData).toStrictEqual({
            mimeType: 'multipart/form-data',
            params: [
              {
                fileName: 'lorem_ipsum.txt',
                contentType: 'text/plain',
                name: 'documentFile',
                value: 'data:text/plain;name=lorem_ipsum.txt;base64,TG9yZW0gaXBzdW0gZG9sb3Igc2l0IG1ldA==',
              },
            ],
          });
        });

        it('should retain filename casing', () => {
          const fixture = Oas.init(fileUploads);
          const har = oasToHar(fixture, fixture.operation('/anything/multipart-formdata', 'post'), {
            body: {
              documentFile: 'data:text/plain;name=LoREM_IpSuM.txt;base64,TG9yZW0gaXBzdW0gZG9sb3Igc2l0IG1ldA==',
            },
          });

          expect(har.log.entries[0].request.postData).toStrictEqual({
            mimeType: 'multipart/form-data',
            params: [
              {
                fileName: 'LoREM_IpSuM.txt',
                contentType: 'text/plain',
                name: 'documentFile',
                value: 'data:text/plain;name=LoREM_IpSuM.txt;base64,TG9yZW0gaXBzdW0gZG9sb3Igc2l0IG1ldA==',
              },
            ],
          });
        });
      });

      describe('image/png', () => {
        it('should handle a image/png request body', async () => {
          const spec = Oas.init({
            paths: {
              '/image': {
                post: {
                  requestBody: {
                    content: {
                      'image/png': {
                        schema: {
                          type: 'string',
                          format: 'binary',
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          const har = oasToHar(spec, spec.operation('/image', 'post'), { body: owlbertDataURL });
          await expect(har).toBeAValidHAR();

          /**
           * The `postData` contents here should be the data URL of the image for a couple reasons:
           *
           * 1. The HAR spec doesn't have support for covering a case where you're making a PUT
           *  request to an endpoint with the contents of a file, eg. `curl -T filename.png`.
           *  Since there's no parameter name, as this is the entire content of the payload body,
           *  we can't promote this up to `postData.params`.
           *
           * 2. Since the HAR spec doesn't have support for this, neither does the `httpsnippet`
           *  module, which we couple with this library to generate code snippets. Since that
           *  doesn't have support for `curl -T filename.png` cases, the only thing we can do is
           *  just set the data URL of the file as the content of `postData.text`.
           *
           * It's less than ideal, and code snippets for these kinds of operations are going to be
           * extremely ugly, but there isn't anything we can do about it.
           */
          expect(har.log.entries[0].request.postData.mimeType).toBe('image/png');
          expect(har.log.entries[0].request.postData.text).toBe(`${owlbertDataURL}`);
        });
      });
    });

    describe('format: `json`', () => {
      it('should handle deeply nested `json` formatted schemas within a `oneOf`', async () => {
        const spec = Oas.init(deeplyNestedJsonFormats);
        await spec.dereference();

        const har = oasToHar(spec, spec.operation('/anything', 'post'), {
          body: {
            destination: {
              service_account_key: JSON.stringify({ buster: true }),
            },
          },
        });

        expect(har.log.entries[0].request.postData.text).toStrictEqual(
          JSON.stringify({
            destination: {
              service_account_key: { buster: true },
            },
          }),
        );
      });

      it('should handle deeply nested `json` formatted schemas', () => {
        const spec = Oas.init({
          paths: {
            '/anything': {
              post: {
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          root: {
                            type: 'string',
                            format: 'json',
                          },
                          obj: {
                            type: 'object',
                            properties: {
                              jsonProp: {
                                type: 'string',
                                format: 'json',
                              },
                            },
                          },
                          arr: {
                            type: 'array',
                            items: {
                              type: 'string',
                              format: 'json',
                            },
                          },
                          arrOfObjects: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                arrProp: {
                                  type: 'string',
                                  format: 'json',
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

        const har = oasToHar(spec, spec.operation('/anything', 'post'), {
          body: {
            root: '{"im.json": 1234}',
            obj: {
              jsonProp: '{"buster": true}',
            },
            arr: ['{"buster": true}'],
            arrOfObjects: [{ arrProp: '{"buster": true}' }, { arrProp: 'not json' }],
          },
        });

        expect(har.log.entries[0].request.postData.text).toBe(
          JSON.stringify({
            root: { 'im.json': 1234 },
            obj: {
              jsonProp: { buster: true },
            },
            arr: [{ buster: true }],
            arrOfObjects: [{ arrProp: { buster: true } }, { arrProp: 'not json' }],
          }),
        );
      });

      it('should work for refs that require a lookup', async () => {
        const spec = Oas.init({
          paths: {
            '/requestBody': {
              post: {
                requestBody: {
                  $ref: '#/components/requestBodies/schema',
                },
              },
            },
          },
          components: {
            requestBodies: {
              schema: {
                content: {
                  'application/json': {
                    schema: {
                      string: 'object',
                      properties: { a: { type: 'string', format: 'json' } },
                    },
                  },
                },
              },
            },
          },
        });

        await spec.dereference();

        const har = oasToHar(spec, spec.operation('/requestBody', 'post'), { body: { a: '{ "b": 1 }' } });
        expect(har.log.entries[0].request.postData.text).toBe(JSON.stringify({ a: JSON.parse('{ "b": 1 }') }));
      });

      it('should leave invalid JSON as strings', () => {
        const spec = Oas.init({
          paths: {
            '/requestBody': {
              post: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        required: ['a'],
                        properties: {
                          a: {
                            type: 'string',
                            format: 'json',
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

        const har = oasToHar(spec, spec.operation('/requestBody', 'post'), { body: { a: '{ "b": invalid json' } });
        expect(har.log.entries[0].request.postData.text).toBe(JSON.stringify({ a: '{ "b": invalid json' }));
      });

      it('should parse valid arbitrary JSON request bodies', () => {
        const spec = Oas.init({
          paths: {
            '/requestBody': {
              post: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'string',
                        format: 'json',
                      },
                    },
                  },
                },
              },
            },
          },
        });

        const har = oasToHar(spec, spec.operation('/requestBody', 'post'), { body: '{ "a": { "b": "valid json" } }' });
        expect(har.log.entries[0].request.postData.text).toBe('{"a":{"b":"valid json"}}');
      });

      it('should parse invalid arbitrary JSON request bodies as strings', () => {
        const spec = Oas.init({
          paths: {
            '/requestBody': {
              post: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'string',
                        format: 'json',
                      },
                    },
                  },
                },
              },
            },
          },
        });

        const har = oasToHar(spec, spec.operation('/requestBody', 'post'), { body: '{ "a": { "b": "valid json } }' });
        expect(har.log.entries[0].request.postData.text).toBe(JSON.stringify('{ "a": { "b": "valid json } }'));
      });

      it('should parse valid JSON as an object', () => {
        const spec = Oas.init({
          paths: {
            '/requestBody': {
              post: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        required: ['a'],
                        properties: {
                          a: {
                            type: 'string',
                            format: 'json',
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

        const har = oasToHar(spec, spec.operation('/requestBody', 'post'), { body: { a: '{ "b": "valid json" }' } });
        expect(har.log.entries[0].request.postData.text).toBe(
          JSON.stringify({ a: JSON.parse('{ "b": "valid json" }') }),
        );
      });

      it('should parse one valid JSON format even if another is invalid', () => {
        const spec = Oas.init({
          paths: {
            '/requestBody': {
              post: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        required: ['a'],
                        properties: {
                          a: {
                            type: 'string',
                            format: 'json',
                          },
                          b: {
                            type: 'string',
                            format: 'json',
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

        const har = oasToHar(spec, spec.operation('/requestBody', 'post'), {
          body: { a: '{ "z": "valid json" }', b: 'invalid json' },
        });

        expect(har.log.entries[0].request.postData.text).toBe(
          JSON.stringify({ a: { z: 'valid json' }, b: 'invalid json' }),
        );
      });

      it('should parse one valid JSON format even if another is left empty', () => {
        const spec = Oas.init({
          paths: {
            '/requestBody': {
              post: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        required: ['a'],
                        properties: {
                          a: {
                            type: 'string',
                            format: 'json',
                          },
                          b: {
                            type: 'string',
                            format: 'json',
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

        const har = oasToHar(spec, spec.operation('/requestBody', 'post'), {
          body: { a: '{ "z": "valid json" }', b: undefined },
        });

        expect(har.log.entries[0].request.postData.text).toBe(JSON.stringify({ a: { z: 'valid json' }, b: undefined }));
      });

      it('should leave user specified empty object JSON alone', () => {
        const spec = Oas.init({
          paths: {
            '/requestBody': {
              post: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        required: ['a'],
                        properties: {
                          a: {
                            type: 'string',
                            format: 'json',
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

        const har = oasToHar(spec, spec.operation('/requestBody', 'post'), { body: { a: '{}' } });
        expect(har.log.entries[0].request.postData.text).toBe(JSON.stringify({ a: {} }));
      });
    });
  });

  describe('`formData` data handling', () => {
    it('should not add on empty unrequired values', () => {
      const spec = Oas.init({
        paths: {
          '/requestBody': {
            post: {
              requestBody: {
                content: {
                  'application/x-www-form-urlencoded': {
                    schema: {
                      type: 'object',
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

      expect(oasToHar(spec, spec.operation('/requestBody', 'post')).log.entries[0].request.postData).toBeUndefined();
    });

    it('should not add undefined formData into postData', () => {
      const spec = Oas.init({
        paths: {
          '/requestBody': {
            post: {
              requestBody: {
                content: {
                  'application/x-www-form-urlencoded': {
                    schema: {
                      type: 'object',
                      properties: {
                        foo: {
                          type: 'string',
                        },
                        bar: {
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

      const har = oasToHar(spec, spec.operation('/requestBody', 'post'), {
        formData: { foo: undefined, bar: undefined },
      });

      expect(har.log.entries[0].request.postData).toBeUndefined();
    });

    it('should pass in value if one is set and prioritize provided values', () => {
      const spec = Oas.init({
        paths: {
          '/requestBody': {
            post: {
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

      const har = oasToHar(spec, spec.operation('/requestBody', 'post'), { formData: { a: 'test', b: [1, 2, 3] } });
      expect(har.log.entries[0].request.postData.params).toStrictEqual([
        { name: 'a', value: 'test' },
        { name: 'b', value: '1,2,3' },
      ]);
    });

    it('should support nested objects', async () => {
      const spec = await import('./__datasets__/formData-nested-object.json').then(r => r.default).then(Oas.init);
      const operation = spec.operation('/anything', 'post');
      const formData = {
        id: 12345,
        Request: {
          MerchantId: 'buster',
        },
      };

      const har = oasToHar(spec, operation, { formData });
      expect(har.log.entries[0].request.postData.params).toStrictEqual([
        { name: 'id', value: 12345 },
        { name: 'Request', value: '{"MerchantId":"buster"}' },
      ]);
    });
  });

  describe('`content-type` and `accept` header', () => {
    const spec = Oas.init({
      paths: {
        '/requestBody': {
          post: {
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
                  example: { a: 'value' },
                },
              },
            },
          },
        },
      },
    });

    it('should be sent through if there are no body values but there is a requestBody', async () => {
      let har = oasToHar(spec, spec.operation('/requestBody', 'post'), {});
      await expect(har).toBeAValidHAR();

      expect(har.log.entries[0].request.headers).toStrictEqual([{ name: 'content-type', value: 'application/json' }]);

      har = oasToHar(spec, spec.operation('/requestBody', 'post'), { query: { a: 1 } });
      await expect(har).toBeAValidHAR();

      expect(har.log.entries[0].request.headers).toStrictEqual([{ name: 'content-type', value: 'application/json' }]);
    });

    it('should be sent through if there are any body values', async () => {
      const har = oasToHar(spec, spec.operation('/requestBody', 'post'), { body: { a: 'test' } });
      await expect(har).toBeAValidHAR();

      expect(har.log.entries[0].request.headers).toStrictEqual([{ name: 'content-type', value: 'application/json' }]);
    });

    it('should be sent through if there are any formData values', async () => {
      const har = oasToHar(spec, spec.operation('/requestBody', 'post'), { formData: { a: 'test' } });
      await expect(har).toBeAValidHAR();

      expect(har.log.entries[0].request.headers).toStrictEqual([{ name: 'content-type', value: 'application/json' }]);
    });

    it('should fetch the type from the first `requestBody.content` and first `responseBody.content` object', async () => {
      const contentSpec = Oas.init({
        paths: {
          '/requestBody': {
            post: {
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
            },
          },
        },
      });

      const har = oasToHar(contentSpec, contentSpec.operation('/requestBody', 'post'), { body: { a: 'test' } });
      await expect(har).toBeAValidHAR();

      expect(har.log.entries[0].request.headers).toStrictEqual([{ name: 'content-type', value: 'text/xml' }]);
      expect(har.log.entries[0].request.postData.mimeType).toBe('text/xml');
    });

    // Whether this is right or wrong, i'm not sure but this is what readme currently does
    it('should prioritize json if it exists', async () => {
      const contentSpec = Oas.init({
        paths: {
          '/requestBody': {
            post: {
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
            },
          },
        },
      });

      const har = oasToHar(contentSpec, contentSpec.operation('/requestBody', 'post'), { body: { a: 'test' } });
      await expect(har).toBeAValidHAR();

      expect(har.log.entries[0].request.headers).toStrictEqual([{ name: 'content-type', value: 'application/json' }]);
    });

    it("should only add a `content-type` if one isn't already present", async () => {
      const contentSpec = Oas.init({
        paths: {
          '/requestBody': {
            post: {
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
                    example: { a: 'value' },
                  },
                },
              },
            },
          },
        },
        'x-readme': {
          [HEADERS]: [{ key: 'content-type', value: 'multipart/form-data' }],
        },
      });

      const har = oasToHar(contentSpec, contentSpec.operation('/requestBody', 'post'), { body: { a: 'test' } });
      await expect(har).toBeAValidHAR();

      // `content-type: application/json` would normally appear here if there were no
      // `x-readme.headers`, but since there is we should default to that so as to we don't double
      // up on `content-type` headers.
      expect(har.log.entries[0].request.headers).toStrictEqual([
        { name: 'content-type', value: 'multipart/form-data' },
      ]);

      expect(har.log.entries[0].request.postData.mimeType).toBe('multipart/form-data');
    });
  });
});
