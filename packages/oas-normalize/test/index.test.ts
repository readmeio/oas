import type { ParserOptions } from '@readme/openapi-parser';
import type { OpenAPIV3 } from 'openapi-types';

import fs from 'node:fs';
import path from 'node:path';

import petstoreSwagger from '@readme/oas-examples/2.0/json/petstore.json' with { type: 'json' };
import circular from '@readme/oas-examples/3.0/json/circular.json' with { type: 'json' };
import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import webhooks from '@readme/oas-examples/3.1/json/webhooks.json' with { type: 'json' };
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import OASNormalize from '../src/index.js';
import postman from './__fixtures__/postman/petstore.collection.json' with { type: 'json' };

type ValidateOptions = Required<Parameters<OASNormalize['validate']>[0]>;

const __dirname = import.meta.dirname;

describe('OASNormalize', () => {
  describe('.load()', () => {
    describe.each([
      ['Swagger 2.0', '2.0'],
      ['OpenAPI 3.0', '3.0'],
      ['OpenAPI 3.1', '3.1'],
    ])('%s support', (_, version) => {
      let json: Record<string, unknown>;
      let yaml: string;

      beforeEach(async () => {
        json = JSON.parse(
          fs.readFileSync(require.resolve(`@readme/oas-examples/${version}/json/petstore.json`), 'utf8'),
        );
        yaml = require.resolve(`@readme/oas-examples/${version}/yaml/petstore.yaml`);
      });

      it('should reject if unrecognized file supplied', async () => {
        await expect(new OASNormalize(undefined).load()).rejects.toThrow('Could not load this file.');
      });

      it('should support JSON objects', async () => {
        const o = new OASNormalize(structuredClone(json));

        await expect(o.load()).resolves.toStrictEqual(json);
      });

      it('should support stringified JSON objects', async () => {
        const def = JSON.stringify(structuredClone(json));
        const o = new OASNormalize(def);

        await expect(o.load()).resolves.toStrictEqual(json);
      });

      it('should support YAML', async () => {
        const o = new OASNormalize(fs.readFileSync(yaml, 'utf8'));

        await expect(o.load()).resolves.toStrictEqual(json);
      });

      it('should support buffers', async () => {
        const o = new OASNormalize(fs.readFileSync(yaml));

        await expect(o.load()).resolves.toStrictEqual(json);
      });

      describe('urls', () => {
        it('should support URLs', async () => {
          nock('http://example.com').get(`/api-${version}.json`).reply(200, json);

          const o = new OASNormalize(`http://example.com/api-${version}.json`);

          await expect(o.load()).resolves.toStrictEqual(json);
        });

        it('should support HTTPS URLs', async () => {
          nock('https://example.com').get(`/api-${version}.json`).reply(200, json);

          const o = new OASNormalize(`https://example.com/api-${version}.json`);

          await expect(o.load()).resolves.toStrictEqual(json);
        });

        it('should support URLs with basic auth', async () => {
          nock('https://@example.com', {
            reqheaders: {
              Authorization: `Basic ${btoa('username:password')}`,
            },
          })
            .get(`/api-${version}.json`)
            .reply(200, json);

          const o = new OASNormalize(`https://username:password@example.com/api-${version}.json`);

          await expect(o.load()).resolves.toStrictEqual(json);
        });

        it('should convert GitHub repo URLs to raw URLs', async () => {
          nock('https://raw.githubusercontent.com')
            .get('/readmeio/oas-examples/main/3.0/json/petstore.json')
            .reply(200, json);

          const o = new OASNormalize('https://github.com/readmeio/oas-examples/blob/main/3.0/json/petstore.json');

          await expect(o.load()).resolves.toStrictEqual(json);
        });
      });

      describe('paths', () => {
        it('should support paths', async () => {
          const o = new OASNormalize(yaml, { enablePaths: true });

          await expect(o.load()).resolves.toStrictEqual(json);
        });

        it('should reject if `enablePaths` is not set', async () => {
          const o = new OASNormalize(yaml);

          await expect(o.load()).rejects.toThrow('Use `opts.enablePaths` to enable accessing local files.');
        });

        it('should not allow you to `$ref` files from the filesystem if `enablePaths` is disabled', async () => {
          const spec = {
            openapi: '3.1.0',
            info: {
              version: '1.0.0',
              title: 'Swagger Petstore',
            },
            paths: {
              '/': {
                post: {
                  parameters: [
                    {
                      in: 'query',
                      name: 'filter',
                      schema: {
                        $ref: '/etc/passwd',
                      },
                    },
                  ],
                },
              },
            },
          };

          const o = new OASNormalize(spec, { enablePaths: false });
          await expect(o.validate()).rejects.toThrow('Unable to resolve $ref pointer "/etc/passwd"');
        });
      });
    });

    describe('Postman support', () => {
      it('should be able to load a Postman collection', async () => {
        const o = new OASNormalize(structuredClone(postman));

        await expect(o.load()).resolves.toStrictEqual(
          expect.objectContaining({
            info: expect.objectContaining({
              _postman_id: '0b2e8577-2899-4229-bb1c-4cb031108c2f',
            }),
          }),
        );
      });
    });

    describe('quirks', () => {
      it('should not convert date strings in YAML files into Date objects', async () => {
        const yaml = require.resolve('./__fixtures__/quirks/yaml-date.yaml');
        const o = new OASNormalize(fs.readFileSync(yaml, 'utf8'));

        const s = (await o.load()) as unknown as OpenAPIV3.Document;

        expect(typeof s.info.version).toBe('string');
      });
    });
  });

  describe('.bundle()', () => {
    /**
     * @note only tests that require `process.chdir()` should be in this block.
     */
    describe('external schema', () => {
      let originalCwd: string;

      beforeEach(() => {
        originalCwd = process.cwd();
      });

      afterEach(() => {
        process.chdir(originalCwd);
      });

      it('should bundle an external schema in', async () => {
        const contents = require.resolve('./__fixtures__/bundle/definition.json');
        process.chdir(path.dirname(contents));
        const o = new OASNormalize(contents, { enablePaths: true });
        const bundled = (await o.bundle()) as OpenAPIV3.Document;

        expect(bundled.components?.requestBodies?.Pet).toStrictEqual({
          description: 'Pet object that needs to be added to the store',
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/requestBodies/Pet/content/application~1xml/schema',
              },
            },
            'application/xml': {
              schema: expect.objectContaining({
                type: 'object',
                required: ['name', 'photoUrls'],
                properties: expect.objectContaining({
                  id: {
                    type: 'integer',
                    format: 'int64',
                    readOnly: true,
                  },
                }),
              }),
            },
          },
        });
      });
    });

    describe('Postman support', () => {
      it('should convert a Postman collection if supplied', async () => {
        const o = new OASNormalize(structuredClone(postman));
        const bundled = (await o.bundle()) as OpenAPIV3.Document;

        // There's nothing to bundle in a Postman collection so we're really just testing here if it
        // was properly converted to an OpenAPI definition.
        expect(bundled.components).toStrictEqual({
          securitySchemes: {
            apikeyAuth: { type: 'http', scheme: 'apikey' },
            oauth2Auth: { type: 'http', scheme: 'oauth2' },
          },
        });
      });
    });
  });

  describe('.convert()', () => {
    describe.each([
      ['Swagger 2.0', '2.0'],
      ['OpenAPI 3.0', '3.0'],
      ['OpenAPI 3.1', '3.1'],
    ])('%s support', (_, version) => {
      it.runIf(version === '3.1')(
        'should not attempt to upconvert an OpenAPI definition if we dont need to',
        async () => {
          const o = new OASNormalize(structuredClone(webhooks));

          await expect(o.convert()).resolves.toStrictEqual(webhooks);
        },
      );

      it('should validate a URL hosting JSON as expected', async () => {
        const json = JSON.parse(
          fs.readFileSync(require.resolve(`@readme/oas-examples/${version}/json/petstore.json`), 'utf8'),
        );

        nock('http://example.com').get(`/api-${version}.json`).reply(200, structuredClone(json));
        const o = new OASNormalize(`http://example.com/api-${version}.json`);

        await expect(o.convert()).resolves.toMatchSnapshot();
      });

      it('should validate a JSON path as expected', async () => {
        const o = new OASNormalize(require.resolve(`@readme/oas-examples/${version}/json/petstore.json`), {
          enablePaths: true,
        });

        await expect(o.convert()).resolves.toMatchSnapshot();
      });

      it('should validate a URL hosting YAML as expected', async () => {
        const yaml = fs.readFileSync(require.resolve(`@readme/oas-examples/${version}/yaml/petstore.yaml`), 'utf8');
        nock('http://example.com').get(`/api-${version}.yaml`).reply(200, yaml);
        const o = new OASNormalize(`http://example.com/api-${version}.yaml`);

        await expect(o.convert()).resolves.toMatchSnapshot();
      });

      it('should validate a YAML path as expected', async () => {
        const o = new OASNormalize(require.resolve(`@readme/oas-examples/${version}/yaml/petstore.yaml`), {
          enablePaths: true,
        });

        await expect(o.convert()).resolves.toMatchSnapshot();
      });
    });

    describe('Postman support', () => {
      it('should support converting a Postman collection to OpenAPI (validating it in the process)', async () => {
        const o = new OASNormalize(require.resolve('./__fixtures__/postman/petstore.collection.json'), {
          enablePaths: true,
        });

        await expect(o.convert()).resolves.toMatchSnapshot();
      });
    });
  });

  describe('.dereference()', () => {
    it('should dereference a definition', async () => {
      expect(petstore.paths['/pet'].post.requestBody).toStrictEqual({
        $ref: '#/components/requestBodies/Pet',
      });

      const o = new OASNormalize(structuredClone(petstore));
      const dereferenced = (await o.dereference()) as OpenAPIV3.Document;

      expect(dereferenced?.paths?.['/pet']?.post?.requestBody).toStrictEqual({
        description: 'Pet object that needs to be added to the store',
        required: true,
        content: {
          'application/json': expect.any(Object),
          'application/xml': expect.any(Object),
        },
      });
    });

    describe('Postman support', () => {
      it('should convert a Postman collection if supplied', async () => {
        const o = new OASNormalize(structuredClone(postman));
        const dereferenced = (await o.dereference()) as OpenAPIV3.Document;

        expect(dereferenced?.paths?.['/v2/pet']?.post?.requestBody).toStrictEqual({
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: expect.objectContaining({
                  name: 'doggie',
                }),
              },
            },
          },
        });
      });
    });

    describe('parser options', () => {
      describe('given a circular API definition', () => {
        describe('and we want to ignore circular refs', () => {
          it('should support supplying options down to the parser', async () => {
            expect(circular?.components?.schemas?.ErrorMessage).toMatchObject({
              properties: expect.objectContaining({
                inner: { $ref: '#/components/schemas/ErrorMessage' },
              }),
            });

            const o = new OASNormalize(structuredClone(circular), {
              parser: {
                dereference: {
                  circular: 'ignore',
                },
              },
            });

            const dereferenced = (await o.dereference()) as OpenAPIV3.Document;

            expect(dereferenced?.components?.schemas?.ErrorMessage).toMatchObject({
              properties: expect.objectContaining({
                inner: { $ref: '#/components/schemas/ErrorMessage' },
              }),
            });
          });
        });

        describe('and we want to prevent circular refs', () => {
          it('should support supplying options down to the parser', async () => {
            const o = new OASNormalize(structuredClone(circular), {
              parser: {
                dereference: {
                  circular: false,
                },
              },
            });

            await expect(o.dereference()).rejects.toThrow(
              /Circular \$ref pointer found at \/(.*)\/components\/schemas\/ErrorMessage\/properties\/inner/,
            );
          });
        });
      });
    });

    describe('#deref alias', () => {
      it('should dereference a definition', async () => {
        expect(petstore.paths['/pet'].post.requestBody).toStrictEqual({
          $ref: '#/components/requestBodies/Pet',
        });

        const o = new OASNormalize(structuredClone(petstore));
        const dereferenced = (await o.deref()) as OpenAPIV3.Document;

        expect(dereferenced?.paths?.['/pet']?.post?.requestBody).toStrictEqual({
          description: 'Pet object that needs to be added to the store',
          required: true,
          content: {
            'application/json': expect.any(Object),
            'application/xml': expect.any(Object),
          },
        });
      });
    });
  });

  describe('.validate()', () => {
    it("should not convert a Swagger definition to OpenAPI if we don't want to", async () => {
      const o = new OASNormalize(structuredClone(petstoreSwagger));

      await expect(o.validate()).resolves.toStrictEqual({
        specification: 'Swagger',
        valid: true,
        warnings: [],
      });
    });

    it('should not attempt to upconvert an OpenAPI definition if we dont need to', async () => {
      const o = new OASNormalize(structuredClone(webhooks));

      await expect(o.validate()).resolves.toStrictEqual({
        specification: 'OpenAPI',
        valid: true,
        warnings: [],
      });
    });

    describe('and we have an invalid definition', () => {
      describe('and there is a missing component', () => {
        it.each([
          ['throw an error by default'],
          ['return a result object if `shouldThrowIfInvalid` is false', { shouldThrowIfInvalid: false }],
        ] as [string, ValidateOptions][])('should %s', async (_, opts) => {
          const contents = path.join(__dirname, '__fixtures__', 'invalid', 'swagger.json');
          const o = new OASNormalize(contents, { enablePaths: true });

          if (opts && 'shouldThrowIfInvalid' in opts) {
            await expect(o.validate(opts)).resolves.toMatchSnapshot();
          } else {
            await expect(o.validate(opts)).rejects.toMatchSnapshot();
          }
        });
      });

      describe('and there is a missing schema', () => {
        it.each([
          ['throw an error by default'],
          ['return a result object if `shouldThrowIfInvalid` is false', { shouldThrowIfInvalid: false }],
        ] as [string, ValidateOptions][])('should %s', async (_, opts) => {
          const contents = path.join(__dirname, '__fixtures__', 'invalid', 'openapi.json');
          const o = new OASNormalize(contents, { enablePaths: true });

          if (opts && 'shouldThrowIfInvalid' in opts) {
            await expect(o.validate(opts)).resolves.toMatchSnapshot();
          } else {
            await expect(o.validate(opts)).rejects.toMatchSnapshot();
          }
        });
      });

      describe("and it doesn't match the spec", () => {
        it.each([
          ['throw an error by default'],
          ['return a result object if `shouldThrowIfInvalid` is false', { shouldThrowIfInvalid: false }],
        ] as [string, ValidateOptions][])('should %s', async (_, opts) => {
          // This definition is missing `paths` which should incur a failed validation check.
          const o = new OASNormalize({
            openapi: '3.0.3',
            info: {
              title: 'Example OpenAPI base file for `oas`.',
              version: '1.0',
            },
          });

          if (opts && 'shouldThrowIfInvalid' in opts) {
            await expect(o.validate(opts)).resolves.toMatchSnapshot();
          } else {
            await expect(o.validate(opts)).rejects.toMatchSnapshot();
          }
        });
      });

      describe("and it doesn't match the schema", () => {
        it.each([
          ['throw an error by default'],
          ['return a result object if `shouldThrowIfInvalid` is false', { shouldThrowIfInvalid: false }],
        ] as [string, ValidateOptions][])('should %s', async (_, opts) => {
          const o = new OASNormalize(require.resolve('./__fixtures__/invalid/openapi-3.1.json'), { enablePaths: true });

          if (opts && 'shouldThrowIfInvalid' in opts) {
            await expect(o.validate(opts)).resolves.toMatchSnapshot();
          } else {
            await expect(o.validate(opts)).rejects.toMatchSnapshot();
          }
        });
      });

      describe('and it contains lots of problems', () => {
        it.each([
          ['throw an error by default with all errors'],
          [
            'return a result object with all errors if `shouldThrowIfInvalid` is false',
            { shouldThrowIfInvalid: false },
          ],
        ] as [string, ValidateOptions][])('should %s', async (_, opts) => {
          const o = new OASNormalize(require.resolve('./__fixtures__/invalid/openapi-very-invalid.json'), {
            enablePaths: true,
          });

          if (opts && 'shouldThrowIfInvalid' in opts) {
            await expect(o.validate(opts)).resolves.toMatchSnapshot();
          } else {
            await expect(o.validate(opts)).rejects.toMatchSnapshot();
          }
        });
      });

      describe('and it also contains errors that can be classified as warnings', () => {
        it.each([
          ['throw an error by default'],
          ['return a result object if `shouldThrowIfInvalid` is false', { shouldThrowIfInvalid: false }],
        ] as [string, ValidateOptions][])('should %s', async (_, opts) => {
          const yaml = require.resolve('./__fixtures__/quirks/duplicate-operation-params.yaml');
          const o = new OASNormalize(fs.readFileSync(yaml, 'utf8'));

          const parserOptions: ParserOptions = {
            validate: {
              rules: {
                openapi: {
                  'duplicate-non-request-body-parameters': 'warning',
                },
              },
            },
          };

          if (opts && 'shouldThrowIfInvalid' in opts) {
            await expect(o.validate({ ...opts, parser: parserOptions })).resolves.toMatchSnapshot();
          } else {
            await expect(o.validate({ ...(opts || {}), parser: parserOptions })).rejects.toMatchSnapshot();
          }
        });
      });

      it('should error out for empty file', async () => {
        const o = new OASNormalize(require.resolve('./__fixtures__/invalid/empty.json'), {
          enablePaths: true,
        });

        await expect(o.validate()).rejects.toStrictEqual(new Error('No file contents found.'));
        // This should still throw an exception because we couldn't load the file to validate.
        await expect(o.validate({ shouldThrowIfInvalid: false })).rejects.toStrictEqual(
          new Error('No file contents found.'),
        );
      });

      describe('and `opts.colorizeErrors` is present', () => {
        it('should colorize errors', async () => {
          const o = new OASNormalize(require.resolve('./__fixtures__/invalid/openapi-3.1.json'), {
            colorizeErrors: true,
            enablePaths: true,
          });

          await expect(o.validate()).rejects.toMatchSnapshot();
        });
      });
    });

    describe('and we have a definition with errors that can be classified as warnings', () => {
      it('should return a result object always with the warnings', async () => {
        const yaml = require.resolve('./__fixtures__/quirks/duplicate-header-params.yaml');
        const o = new OASNormalize(fs.readFileSync(yaml, 'utf8'));

        await expect(
          o.validate({
            parser: {
              validate: {
                rules: {
                  openapi: {
                    'duplicate-non-request-body-parameters': 'warning',
                  },
                },
              },
            },
          }),
        ).resolves.toMatchSnapshot();
      });
    });

    describe.each([
      ['Swagger 2.0', 'Swagger', '2.0'],
      ['OpenAPI 3.0', 'OpenAPI', '3.0'],
      ['OpenAPI 3.1', 'OpenAPI', '3.1'],
    ])('%s support', (_, specification, version) => {
      it('should validate a URL hosting JSON as expected', async () => {
        const json = JSON.parse(
          fs.readFileSync(require.resolve(`@readme/oas-examples/${version}/json/petstore.json`), 'utf8'),
        );

        nock('http://example.com').get(`/api-${version}.json`).reply(200, structuredClone(json));
        const o = new OASNormalize(`http://example.com/api-${version}.json`);

        await expect(o.validate()).resolves.toStrictEqual({ valid: true, warnings: [], specification });
      });

      it('should validate a JSON path as expected', async () => {
        const o = new OASNormalize(require.resolve(`@readme/oas-examples/${version}/json/petstore.json`), {
          enablePaths: true,
        });

        await expect(o.validate()).resolves.toStrictEqual({ valid: true, warnings: [], specification });
      });

      it('should validate a URL hosting YAML as expected', async () => {
        const yaml = fs.readFileSync(require.resolve(`@readme/oas-examples/${version}/yaml/petstore.yaml`), 'utf8');
        nock('http://example.com').get(`/api-${version}.yaml`).reply(200, yaml);
        const o = new OASNormalize(`http://example.com/api-${version}.yaml`);

        await expect(o.validate()).resolves.toStrictEqual({ valid: true, warnings: [], specification });
      });

      it('should validate a YAML path as expected', async () => {
        const o = new OASNormalize(require.resolve(`@readme/oas-examples/${version}/yaml/petstore.yaml`), {
          enablePaths: true,
        });

        await expect(o.validate()).resolves.toStrictEqual({ valid: true, warnings: [], specification });
      });
    });

    describe('Postman support', () => {
      it('should support converting a Postman collection to OpenAPI (validating it in the process)', async () => {
        const o = new OASNormalize(require.resolve('./__fixtures__/postman/petstore.collection.json'), {
          enablePaths: true,
        });

        await expect(o.validate()).resolves.toStrictEqual({
          valid: true,
          warnings: [],
          specification: 'OpenAPI',
        });
      });
    });
  });

  describe('.version()', () => {
    it('should detect an OpenAPI definition', async () => {
      await expect(
        new OASNormalize(require.resolve('@readme/oas-examples/3.0/json/petstore.json'), {
          enablePaths: true,
        }).version(),
      ).resolves.toStrictEqual({
        specification: 'openapi',
        version: '3.0.0',
      });

      await expect(
        new OASNormalize(require.resolve('@readme/oas-examples/3.1/json/petstore.json'), {
          enablePaths: true,
        }).version(),
      ).resolves.toStrictEqual({
        specification: 'openapi',
        version: '3.1.0',
      });
    });

    it('should detect a Postman collection', async () => {
      await expect(
        new OASNormalize(require.resolve('./__fixtures__/postman/petstore.collection.json'), {
          enablePaths: true,
        }).version(),
      ).resolves.toStrictEqual({
        specification: 'postman',
        version: '2.1.0',
      });
    });

    it('should detect a Swagger definition', async () => {
      await expect(
        new OASNormalize(require.resolve('@readme/oas-examples/2.0/json/petstore.json'), {
          enablePaths: true,
        }).version(),
      ).resolves.toStrictEqual({
        specification: 'swagger',
        version: '2.0',
      });
    });
  });
});
