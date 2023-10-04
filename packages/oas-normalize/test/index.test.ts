import type { OpenAPIV3 } from 'openapi-types';

import fs from 'node:fs';
import path from 'node:path';

import fetchMock from 'fetch-mock';
import { describe, afterEach, beforeAll, beforeEach, it, expect } from 'vitest';

import OASNormalize, { getAPIDefinitionType, isAPIDefinition } from '../src';
import { isOpenAPI, isPostman, isSwagger } from '../src/lib/utils';

function cloneObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}

describe('#load', () => {
  describe.each([
    ['Swagger 2.0', '2.0'],
    ['OpenAPI 3.0', '3.0'],
    ['OpenAPI 3.1', '3.1'],
  ])('%s support', (_, version) => {
    let json;
    let yaml;

    beforeEach(async () => {
      json = await import(`@readme/oas-examples/${version}/json/petstore.json`).then(r => r.default);
      yaml = require.resolve(`@readme/oas-examples/${version}/yaml/petstore.yaml`);
    });

    it('should reject if unrecognized file supplied', async () => {
      await expect(new OASNormalize(cloneObject).load()).rejects.toThrow('Could not load this file.');
    });

    it('should support JSON objects', async () => {
      const o = new OASNormalize(cloneObject(json));
      await expect(o.load()).resolves.toStrictEqual(json);
    });

    it('should support stringified JSON objects', async () => {
      const def = JSON.stringify(cloneObject(json));
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
      afterEach(() => {
        fetchMock.restore();
      });

      it('should support URLs', async () => {
        fetchMock.get(`http://example.com/api-${version}.json`, json);
        const o = new OASNormalize(`http://example.com/api-${version}.json`);

        await expect(o.load()).resolves.toStrictEqual(json);
      });

      it('should support HTTPS URLs', async () => {
        fetchMock.get(`https://example.com/api-${version}.json`, json);
        const o = new OASNormalize(`https://example.com/api-${version}.json`);

        await expect(o.load()).resolves.toStrictEqual(json);
      });

      it('should convert GitHub repo URLs to raw URLs', async () => {
        fetchMock.get('https://raw.githubusercontent.com/readmeio/oas-examples/main/3.0/json/petstore.json', json);
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
    });
  });

  describe('Postman support', () => {
    it('should be able to load a Postman collection', async () => {
      const postman = await import('./__fixtures__/postman/petstore.collection.json').then(r => r.default);
      const o = new OASNormalize(postman);
      await expect(o.load()).resolves.toStrictEqual(
        expect.objectContaining({
          info: expect.objectContaining({
            // eslint-disable-next-line camelcase
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

      const s = await o.load();
      expect(typeof s.info.version).toBe('string');
    });
  });
});

describe('#bundle', () => {
  it('should bundle an external schema in', async () => {
    const petSchema = await import('./__fixtures__/bundle/pet.json').then(r => r.default);
    const contents = require.resolve('./__fixtures__/bundle/definition.json');
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
          schema: petSchema,
        },
      },
    });
  });

  describe('Postman support', () => {
    it('should convert a Postman collection if supplied', async () => {
      const postman = await import('./__fixtures__/postman/petstore.collection.json').then(r => r.default);
      const o = new OASNormalize(postman);
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

describe('#deref', () => {
  it('should dereference a definition', async () => {
    const openapi = await import('@readme/oas-examples/3.0/json/petstore.json').then(r => r.default);
    expect(openapi.paths['/pet'].post.requestBody).toStrictEqual({
      $ref: '#/components/requestBodies/Pet',
    });

    const o = new OASNormalize(cloneObject(openapi));
    const deref = (await o.deref()) as OpenAPIV3.Document;

    expect(deref?.paths?.['/pet']?.post?.requestBody).toStrictEqual({
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
      const postman = await import('./__fixtures__/postman/petstore.collection.json').then(r => r.default);

      const o = new OASNormalize(postman);
      const deref = (await o.deref()) as OpenAPIV3.Document;

      expect(deref?.paths?.['/v2/pet']?.post?.requestBody).toStrictEqual({
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
});

describe('#validate', () => {
  it("should not convert a Swagger definition to OpenAPI if we don't want to", async () => {
    const swagger = await import('@readme/oas-examples/2.0/json/petstore.json').then(r => r.default);
    const o = new OASNormalize(cloneObject(swagger));

    await expect(o.validate()).resolves.toStrictEqual(swagger);
  });

  it('should error out on a definition a missing component', async () => {
    const contents = path.join(__dirname, '__fixtures__', 'invalid', 'swagger.json');
    const o = new OASNormalize(contents, { enablePaths: true });

    await expect(o.validate()).rejects.toThrow('Token "Category" does not exist.');
  });

  it('should error if a schema is missing', async () => {
    const contents = path.join(__dirname, '__fixtures__', 'invalid', 'openapi.json');
    const o = new OASNormalize(contents, { enablePaths: true });

    await expect(o.validate()).rejects.toThrow('Token "Error" does not exist.');
  });

  it("should error out when a definition doesn't match the spec", async () => {
    // This definition is missing `paths`, which should incur a failed validation check.
    const contents = {
      openapi: '3.0.3',
      info: {
        title: 'Example OpenAPI base file for `oas`.',
        version: '1.0',
      },
    };

    const o = new OASNormalize(contents);
    await expect(o.validate()).rejects.toThrow('Supplied schema is not a valid OpenAPI definition.');
  });

  it("should error out when a definition doesn't match the schema", async () => {
    const o = new OASNormalize(require.resolve('./__fixtures__/invalid/openapi-3.1.json'), { enablePaths: true });

    await expect(o.validate()).rejects.toStrictEqual(
      expect.objectContaining({
        message: expect.stringContaining("REQUIRED must have required property 'name'"),
        details: expect.any(Array),
      }),
    );
  });

  it('should error out, and show all errors, when a definition has lots of problems', async () => {
    const o = new OASNormalize(require.resolve('./__fixtures__/invalid/openapi-very-invalid.json'), {
      enablePaths: true,
    });

    await expect(o.validate()).rejects.toMatchSnapshot();
  });

  it('should error out for empty file', async () => {
    const o = new OASNormalize(require.resolve('./__fixtures__/invalid/empty.json'), {
      enablePaths: true,
    });

    await expect(o.validate()).rejects.toStrictEqual(new Error('No file contents found.'));
  });

  // Skipping because the `chalk` dependency of `better-ajv-errors` within `openapi-parser` has
  // issues in CI. Test works fine locally though!
  // eslint-disable-next-line vitest/no-disabled-tests
  it.skip('should colorize errors when `opts.colorizeErrors` is present', async () => {
    const o = new OASNormalize(require.resolve('./__fixtures__/invalid/openapi-3.1.json'), {
      colorizeErrors: true,
      enablePaths: true,
    });

    await expect(o.validate()).rejects.toMatchSnapshot();
  });

  describe.each([
    ['Swagger 2.0', '2.0'],
    ['OpenAPI 3.0', '3.0'],
    ['OpenAPI 3.1', '3.1'],
  ])('%s support', (_, version) => {
    afterEach(() => {
      fetchMock.restore();
    });

    it('should validate a URL hosting JSON as expected', async () => {
      const json = await import(`@readme/oas-examples/${version}/json/petstore.json`).then(r => r.default);

      fetchMock.get(`http://example.com/api-${version}.json`, cloneObject(json));
      const o = new OASNormalize(`http://example.com/api-${version}.json`);

      await expect(o.validate({ convertToLatest: true })).resolves.toMatchSnapshot();
    });

    it('should validate a JSON path as expected', async () => {
      const o = new OASNormalize(require.resolve(`@readme/oas-examples/${version}/json/petstore.json`), {
        enablePaths: true,
      });

      await expect(o.validate({ convertToLatest: true })).resolves.toMatchSnapshot();
    });

    it('should validate a URL hosting YAML as expected', async () => {
      const yaml = fs.readFileSync(require.resolve(`@readme/oas-examples/${version}/yaml/petstore.yaml`), 'utf8');
      fetchMock.get(`http://example.com/api-${version}.yaml`, yaml);
      const o = new OASNormalize(`http://example.com/api-${version}.yaml`);

      await expect(o.validate({ convertToLatest: true })).resolves.toMatchSnapshot();
    });

    it('should validate a YAML path as expected', async () => {
      const o = new OASNormalize(require.resolve(`@readme/oas-examples/${version}/yaml/petstore.yaml`), {
        enablePaths: true,
      });

      await expect(o.validate({ convertToLatest: true })).resolves.toMatchSnapshot();
    });
  });

  describe('Postman support', () => {
    it('should support converting a Postman collection to OpenAPI (validating it in the process)', async () => {
      const o = new OASNormalize(require.resolve('./__fixtures__/postman/petstore.collection.json'), {
        enablePaths: true,
      });

      await expect(o.validate({ convertToLatest: true })).resolves.toMatchSnapshot();
    });
  });
});

describe('#version', () => {
  it('should detect an OpenAPI definition', async () => {
    await expect(
      new OASNormalize(require.resolve('@readme/oas-examples/3.0/json/petstore.json'), { enablePaths: true }).version(),
    ).resolves.toStrictEqual({
      specification: 'openapi',
      version: '3.0.0',
    });

    await expect(
      new OASNormalize(require.resolve('@readme/oas-examples/3.1/json/petstore.json'), { enablePaths: true }).version(),
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
      new OASNormalize(require.resolve('@readme/oas-examples/2.0/json/petstore.json'), { enablePaths: true }).version(),
    ).resolves.toStrictEqual({
      specification: 'swagger',
      version: '2.0',
    });
  });
});

describe('#utils', () => {
  let openapi;
  let postman;
  let swagger;

  beforeAll(async () => {
    openapi = await import('@readme/oas-examples/3.0/json/petstore.json').then(r => r.default);
    postman = await import('./__fixtures__/postman/petstore.collection.json').then(r => r.default);
    swagger = await import('@readme/oas-examples/2.0/json/petstore.json').then(r => r.default);
  });

  describe('#isAPIDefinition / #getAPIDefinitionType', () => {
    it('should identify an OpenAPI definition', () => {
      expect(isAPIDefinition(openapi)).toBe(true);
      expect(getAPIDefinitionType(openapi)).toBe('openapi');
    });

    it('should identify a Postman definition', () => {
      expect(isAPIDefinition(postman)).toBe(true);
      expect(getAPIDefinitionType(postman)).toBe('postman');
    });

    it('should identify a Swagger definition', () => {
      expect(isAPIDefinition(swagger)).toBe(true);
      expect(getAPIDefinitionType(swagger)).toBe('swagger');
    });

    it('should not identify a non-API definition as one', async () => {
      const pkg = await import('../package.json').then(r => r.default);

      expect(isAPIDefinition(pkg)).toBe(false);
      expect(getAPIDefinitionType(pkg)).toBe('unknown');
    });
  });

  describe('#isOpenAPI', () => {
    it('should identify an OpenAPI definition', () => {
      expect(isOpenAPI(openapi)).toBe(true);
    });

    it('should not misidentify a Swagger definition', () => {
      expect(isOpenAPI(swagger)).toBe(false);
    });

    it('should not misidentify a Postman collection', () => {
      expect(isOpenAPI(postman)).toBe(false);
    });
  });

  describe('#isPostman', () => {
    it('should identify a Postman collection', () => {
      expect(isPostman(postman)).toBe(true);
    });

    it('should not misidentify a Swagger definition', () => {
      expect(isPostman(swagger)).toBe(false);
    });

    it('should not misidentify an OpenAPI', () => {
      expect(isPostman(openapi)).toBe(false);
    });
  });

  describe('#isSwagger', () => {
    it('should identify a Swagger definition', () => {
      expect(isSwagger(swagger)).toBe(true);
    });

    it('should not misidentify an OpenAPI definition', () => {
      expect(isSwagger(openapi)).toBe(false);
    });

    it('should not misidentify a Postman collection', () => {
      expect(isSwagger(postman)).toBe(false);
    });
  });
});
