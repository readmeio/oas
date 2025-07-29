import type { OASDocument } from '../../../src/types.js';

import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import readme from '@readme/oas-examples/3.0/json/readme.json' with { type: 'json' };
import extensions from '@readme/oas-examples/3.1/json/readme-extensions.json' with { type: 'json' };
import schemaTypes from '@readme/oas-examples/3.1/json/schema-types.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';

import * as QUERIES from '../../../src/analyzer/queries/readme.js';
import Oas from '../../../src/index.js';

describe('analyzer queries (ReadMe)', () => {
  describe('`RAW_BODY`', () => {
    it('should deterine if a definition is utilizing `RAW_BODY`', () => {
      expect(QUERIES.rawBody(schemaTypes as unknown as OASDocument)).toStrictEqual([
        '#/paths/~1anything~1raw_body~1top-level-payloads/patch/requestBody/content/application~1json/schema',
        '#/paths/~1anything~1raw_body~1top-level-payloads/post/requestBody/content/application~1json/schema',
      ]);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.rawBody(readme as OASDocument)).toHaveLength(0);
    });
  });

  describe('`x-readme.samples-languages` extension', () => {
    it('should detect usage of `x-samples-languages` for setting code sample languages', () => {
      expect(QUERIES.codeSampleLanguages(extensions as unknown as OASDocument)).toStrictEqual(['swift']);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.codeSampleLanguages(petstore as OASDocument)).toHaveLength(0);
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
      expect(QUERIES.codeSamplesDisabled(petstore as OASDocument)).toHaveLength(0);
    });
  });

  describe('`x-readme.proxy-enabled` extension', () => {
    it('should detect usage of `x-proxy-enabled` for disabling our CORS proxy', () => {
      expect(QUERIES.corsProxyDisabled(extensions as unknown as OASDocument)).toStrictEqual([
        '#/paths/~1x-proxy-enabled/patch',
        '#/paths/~1x-proxy-enabled/post',
      ]);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.corsProxyDisabled(petstore as OASDocument)).toHaveLength(0);
    });
  });

  describe('`x-readme.code-samples` extension', () => {
    it('should detect usage of `x-code-samples` for defining custom code samples', () => {
      expect(QUERIES.customCodeSamples(extensions as unknown as OASDocument)).toStrictEqual([
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
      expect(QUERIES.customCodeSamples(petstore as OASDocument)).toHaveLength(0);
    });
  });

  describe('`x-readme.explorer-enabled` extension', () => {
    it('should detect usage of `x-explorer-enabled` for disabling the API explorer "try it now" functionality', () => {
      expect(QUERIES.explorerDisabled(extensions as unknown as OASDocument)).toStrictEqual([
        '#/paths/~1x-explorer-enabled/patch',
        '#/paths/~1x-explorer-enabled/post',
      ]);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.explorerDisabled(petstore as OASDocument)).toHaveLength(0);
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
      expect(QUERIES.staticHeaders(petstore as OASDocument)).toHaveLength(0);
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
      expect(QUERIES.authDefaults(petstore as OASDocument)).toHaveLength(0);
    });
  });

  describe('`x-readme-ref-name` extension', () => {
    it('should detect usage of `x-readme-ref-name` for defining reference names', () => {
      const oas = Oas.init(petstore);
      // Need to dereference it for this extension to be added
      oas.dereference();

      expect(QUERIES.refNames(oas.api)).toStrictEqual([
        '#/components/schemas/ApiResponse/x-readme-ref-name',
        '#/components/schemas/Category/x-readme-ref-name',
        '#/components/schemas/Order/x-readme-ref-name',
        '#/components/schemas/Pet/x-readme-ref-name',
        '#/components/schemas/Tag/x-readme-ref-name',
        '#/components/schemas/User/x-readme-ref-name',
      ]);
    });
  });
});
