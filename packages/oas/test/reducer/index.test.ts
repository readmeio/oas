import type { OASDocument } from '../../src/types.js';

import swagger from '@readme/oas-examples/2.0/json/petstore.json' with { type: 'json' };
import parametersCommon from '@readme/oas-examples/3.0/json/parameters-common.json' with { type: 'json' };
import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import uspto from '@readme/oas-examples/3.0/json/uspto.json' with { type: 'json' };
import trainTravel from '@readme/oas-examples/3.1/json/train-travel.json' with { type: 'json' };
import webhooks from '@readme/oas-examples/3.1/json/webhooks.json' with { type: 'json' };
import toBeAValidOpenAPIDefinition from 'jest-expect-openapi';
import { describe, expect, it } from 'vitest';

import reducer from '../../src/reducer/index.js';
import circular from '../__datasets__/circular.json' with { type: 'json' };
import circularPathSchema from '../__datasets__/circular-path.json' with { type: 'json' };
import complexNesting from '../__datasets__/complex-nesting.json' with { type: 'json' };
import petstoreRefQuirks from '../__datasets__/petstore-ref-quirks.json' with { type: 'json' };
import reduceQuirks from '../__datasets__/reduce-quirks.json' with { type: 'json' };
import securityRootLevel from '../__datasets__/security-root-level.json' with { type: 'json' };
import tagQuirks from '../__datasets__/tag-quirks.json' with { type: 'json' };

expect.extend({ toBeAValidOpenAPIDefinition });

describe('reducer', () => {
  it('should not do anything if no reducers are supplied', () => {
    expect(reducer(petstore as OASDocument)).toStrictEqual(petstore);
  });

  it('should fail if given a Swagger 2.0 definition', () => {
    expect(() => {
      // @ts-expect-error -- Testing supplying a Swagger definition.
      reducer(swagger);
    }).toThrow('Sorry, only OpenAPI definitions are supported.');
  });

  describe('and we are reducing by tags', () => {
    it('should reduce by the supplied tags', async () => {
      const reduced = reducer(petstore as OASDocument, { tags: ['Store'] });
      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.tags).toStrictEqual([{ name: 'store', description: 'Access to Petstore orders' }]);
      expect(reduced.paths).toStrictEqual({
        '/store/inventory': {
          get: expect.any(Object),
        },
        '/store/order': {
          post: expect.any(Object),
        },
        '/store/order/{orderId}': {
          get: expect.any(Object),
          delete: expect.any(Object),
        },
      });

      expect(reduced.components).toStrictEqual({
        schemas: {
          Order: expect.any(Object),
        },
        securitySchemes: {
          api_key: expect.any(Object),
        },
      });
    });

    it('should reduce by tags even with properties called `$ref` (that are not `$ref` pointers)', async () => {
      const reduced = reducer(petstoreRefQuirks as OASDocument, { tags: ['store'] });
      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.tags).toStrictEqual([{ name: 'store', description: 'Access to Petstore orders' }]);
      expect(reduced.paths).toStrictEqual({
        '/store/inventory': {
          get: expect.any(Object),
        },
        '/store/order': {
          post: expect.any(Object),
        },
        '/store/order/{orderId}': {
          get: expect.any(Object),
          delete: expect.any(Object),
        },
      });

      expect(reduced.components).toStrictEqual({
        schemas: {
          Order: {
            type: 'object',
            properties: expect.objectContaining({
              $ref: {
                type: 'string',
                description: 'A property called $ref to see what happens',
              },
            }),
            xml: {
              name: 'Order',
            },
          },
        },
        securitySchemes: {
          api_key: expect.any(Object),
        },
      });
    });

    it('should support reducing by tags that are only stored at the operation level', async () => {
      const reduced = reducer(tagQuirks as OASDocument, { tags: ['commerce'] });
      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.tags).toStrictEqual([{ name: 'store', description: 'Access to Petstore orders' }]);
      expect(reduced.paths).toStrictEqual({
        '/store/inventory': {
          get: expect.any(Object),
        },
      });
    });

    describe('error handling', () => {
      it('should throw an error if we end up with a definition that has no paths', () => {
        expect(() => {
          reducer(petstore as OASDocument, { tags: ['unknownTag'] });
        }).toThrow('All paths in the API definition were removed. Did you supply the right path name to reduce by?');
      });
    });
  });

  describe('and we are reducing by paths', () => {
    it('should reduce by the supplied paths', async () => {
      const reduced = reducer(petstore as OASDocument, {
        paths: {
          '/store/order/{orderId}': ['Get'],
        },
      });

      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.tags).toStrictEqual([{ name: 'store', description: 'Access to Petstore orders' }]);
      expect(reduced.paths).toStrictEqual({
        '/store/order/{orderId}': {
          get: expect.any(Object),
        },
      });

      expect(reduced.components).toStrictEqual({
        schemas: {
          Order: expect.any(Object),
        },
      });
    });

    it('should handle path case insensivitity', async () => {
      const reduced = reducer(petstore as OASDocument, {
        paths: {
          // The endpoint is actually `/store/order/{orderId}`.
          '/store/ORDER/{orderId}': ['Get'],
        },
      });

      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.tags).toStrictEqual([{ name: 'store', description: 'Access to Petstore orders' }]);
      expect(reduced.paths).toStrictEqual({
        '/store/order/{orderId}': {
          get: expect.any(Object),
        },
      });

      expect(reduced.components).toStrictEqual({
        schemas: {
          Order: expect.any(Object),
        },
      });
    });

    it('should support method wildcards', async () => {
      const reduced = reducer(petstore as OASDocument, {
        paths: {
          '/STORE/order/{orderId}': '*',
        },
      });

      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.paths).toStrictEqual({
        '/store/order/{orderId}': {
          get: expect.any(Object),
          delete: expect.any(Object),
        },
      });
    });

    it('should support reducing common parameters', async () => {
      const reduced = reducer(parametersCommon as OASDocument, {
        paths: {
          '/anything/{id}': ['get'],
        },
      });

      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.paths).toStrictEqual({
        '/anything/{id}': {
          parameters: expect.any(Array),
          get: expect.any(Object),
        },
      });
    });

    it('should support retaining deeply nested used `$ref` pointers', async () => {
      const reduced = reducer(complexNesting as OASDocument, { paths: { '/multischema/of-everything': '*' } });
      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.components).toStrictEqual({
        schemas: {
          MultischemaOfEverything: expect.any(Object),
          ArrayOfObjectsOfObjectsAndArrays: expect.any(Object),
          ObjectOfEverything: expect.any(Object),
          ArrayOfPrimitives: expect.any(Object),
          ArrayOfFlatObjects: expect.any(Object),
          ObjectOfObjectsAndArrays: expect.any(Object),
          FlatObject: expect.any(Object),
        },
      });
    });

    it('should retain `securitySchemes` for root-level security definitions', async () => {
      const reduced = reducer(securityRootLevel as OASDocument, { paths: { '/anything/apiKey': '*' } });
      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.components).toStrictEqual({
        securitySchemes: {
          apiKey_cookie: expect.any(Object),
          apiKey_query: expect.any(Object),
        },
      });
    });

    it("should not leave any components if there aren't any in use", async () => {
      const reduced = reducer(uspto as OASDocument, { paths: { '/{dataset}/{version}/records': '*' } });
      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.components).toBeUndefined();
    });

    describe('error handling', () => {
      it('should throw an error if we end up with a definition that has no paths', () => {
        expect(() => {
          reducer(petstore as OASDocument, { paths: { '/unknownPath': '*' } });
        }).toThrow('All paths in the API definition were removed. Did you supply the right path name to reduce by?');
      });
    });
  });

  describe('and we supplied an OpenAPI 3.1 definition', () => {
    describe('and the definition contains paths and webhooks', () => {
      it('should not reduce by anything and return the original definition', async () => {
        const reduced = reducer(trainTravel as unknown as OASDocument);
        await expect(reduced).toBeAValidOpenAPIDefinition();

        expect(reduced).toStrictEqual(trainTravel);
      });
    });

    describe('and the definition contains only webhooks', () => {
      it('should not reduce by anything and return the original definition', async () => {
        const reduced = reducer(webhooks as OASDocument);
        await expect(reduced).toBeAValidOpenAPIDefinition();

        expect(reduced).toStrictEqual(webhooks);
      });
    });
  });

  describe('and we have circular references', () => {
    it('should preserve required data in a circular definition', async () => {
      const reduced = reducer(circularPathSchema as OASDocument, { paths: { '/anything': ['get'] } });
      await expect(reduced).toBeAValidOpenAPIDefinition();

      // `GET /anything` has a `$ref` to the `requestBody` schema of `POST /anything`, the reducer
      // must have retained this.
      expect(reduced.paths?.['/anything']).toHaveProperty('get');
      expect(reduced.paths?.['/anything']).toHaveProperty('post');
      expect(reduced.paths?.['/anything']).not.toHaveProperty('put');

      expect(reduced.components?.schemas).toStrictEqual({
        offset: expect.any(Object),
        offsetTransition: expect.any(Object),
        rules: expect.any(Object),
      });
    });

    it('should preserved circular refs that are in use', async () => {
      const reduced = reducer(circular as OASDocument, { paths: { '/': ['get'] } });
      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.paths?.['/']).toHaveProperty('get');
      expect(reduced.components?.schemas).toStrictEqual({
        offset: expect.any(Object),
        offsetTransition: expect.any(Object),
        rules: expect.any(Object),
      });
    });
  });

  describe('quirks', () => {
    it('should preserved deeply nested `example` refs', async () => {
      const reduced = reducer(reduceQuirks as OASDocument, {
        paths: {
          '/events': ['get'],
        },
      });

      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.components?.examples).toHaveProperty('event-search');
      expect(reduced.components?.examples).toHaveProperty('event-min');
      expect(reduced.components?.examples).toHaveProperty('event-all');
    });
  });
});
