import type { OASDocument } from '../../../src/types.js';

import { describe, beforeAll, expect, it } from 'vitest';

import * as QUERIES from '../../../src/analyzer/queries/readme.js';

function loadSpec(r: any) {
  return r.default as unknown as OASDocument;
}

describe('analyzer queries (ReadMe)', () => {
  let extensions: OASDocument;
  let petstore: OASDocument;
  let readme: OASDocument;
  let schemaTypes: OASDocument;

  beforeAll(async () => {
    petstore = await import('@readme/oas-examples/3.0/json/petstore.json').then(loadSpec);
    readme = await import('@readme/oas-examples/3.0/json/readme.json').then(loadSpec);

    extensions = await import('@readme/oas-examples/3.1/json/readme-extensions.json').then(loadSpec);
    schemaTypes = await import('@readme/oas-examples/3.1/json/schema-types.json').then(loadSpec);
  });

  describe('`RAW_BODY`', () => {
    it('should deterine if a definition is utilizing `RAW_BODY`', () => {
      expect(QUERIES.rawBody(schemaTypes)).toStrictEqual([
        '#/paths/~1anything~1raw_body~1top-level-payloads/patch/requestBody/content/application~1json/schema',
        '#/paths/~1anything~1raw_body~1top-level-payloads/post/requestBody/content/application~1json/schema',
      ]);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.rawBody(readme)).toHaveLength(0);
    });
  });

  describe('`x-readme.samples-languages` extension', () => {
    it('should detect usage of `x-samples-languages` for setting code sample languages', () => {
      expect(QUERIES.codeSampleLanguages(extensions)).toStrictEqual(['swift']);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.codeSampleLanguages(petstore)).toHaveLength(0);
    });
  });

  describe('`x-readme.samples-enabled` extension', () => {
    it('should detect usage of `x-samples-enabled` for hiding code snippets', () => {
      expect(
        QUERIES.codeSamplesDisabled({
          'x-readme': { 'samples-enabled': false },
          paths: {
            '/anything': {
              get: {
                'x-readme': { 'samples-enabled': false },
              },
            },
          },
        } as any),
      ).toStrictEqual(['#/paths/~1anything/get', '#/x-readme/samples-enabled']);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.codeSamplesDisabled(petstore)).toHaveLength(0);
    });
  });

  describe('`x-readme.proxy-enabled` extension', () => {
    it('should detect usage of `x-proxy-enabled` for disabling our CORS proxy', () => {
      expect(QUERIES.corsProxyDisabled(extensions)).toStrictEqual([
        '#/paths/~1x-proxy-enabled/patch',
        '#/paths/~1x-proxy-enabled/post',
      ]);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.corsProxyDisabled(petstore)).toHaveLength(0);
    });
  });

  describe('`x-readme.code-samples` extension', () => {
    it('should detect usage of `x-code-samples` for defining custom code samples', () => {
      expect(QUERIES.customCodeSamples(extensions)).toStrictEqual([
        '#/paths/~1x-code-samples/get/x-code-samples',
        '#/paths/~1x-code-samples/post/x-readme/code-samples',
      ]);
    });

    // @todo this would be a good linter rule
    it('should not detect empty `x-code-samples` arrays', () => {
      expect(
        QUERIES.customCodeSamples({
          'x-readme': {
            'code-samples': [],
          },
          paths: {
            '/anything': {
              get: {
                'x-readme': {
                  'code-samples': [],
                },
              },
            },
          },
        } as any),
      ).toHaveLength(0);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.customCodeSamples(petstore)).toHaveLength(0);
    });
  });

  describe('`x-readme.explorer-enabled` extension', () => {
    it('should detect usage of `x-explorer-enabled` for disabling the API explorer "try it now" functionality', () => {
      expect(QUERIES.explorerDisabled(extensions)).toStrictEqual([
        '#/paths/~1x-explorer-enabled/patch',
        '#/paths/~1x-explorer-enabled/post',
      ]);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.explorerDisabled(petstore)).toHaveLength(0);
    });
  });

  describe('`x-readme.headers`', () => {
    it('should detect usage of `x-headers` for adding static headers to API requests', () => {
      const definition: any = {
        'x-headers': [
          {
            key: 'X-Static-Header2',
            value: 'owlbert2',
          },
        ],
        'x-readme': {
          headers: [
            {
              key: 'X-Static-Header',
              value: 'owlbert',
            },
          ],
        },
      };

      expect(QUERIES.staticHeaders(definition)).toStrictEqual(['#/x-headers', '#/x-readme/headers']);
    });

    it('should not detect empty `x-headers` arrays', () => {
      expect(
        QUERIES.staticHeaders({
          'x-readme': {
            headers: [],
          },
        } as any),
      ).toHaveLength(0);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.staticHeaders(petstore)).toHaveLength(0);
    });
  });

  describe('`x-default` extension', () => {
    it('should detect usage of `x-default` for setting auth defaults', () => {
      const definition: any = {
        components: {
          securitySchemes: {
            oauth: {
              type: 'oauth2',
              'x-default': 'abcdefg12345',
              flows: {
                authorizationCode: {
                  authorizationUrl: 'https://example.com/oauth/authorize',
                  tokenUrl: 'https://example.com/oauth/token',
                  scopes: {},
                },
              },
            },
          },
        },
      };

      expect(QUERIES.authDefaults(definition)).toStrictEqual(['#/components/securitySchemes/oauth']);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.authDefaults(petstore)).toHaveLength(0);
    });
  });
});
