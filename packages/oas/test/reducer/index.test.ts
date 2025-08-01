import type { OASDocument } from '../../src/types.js';

import swagger from '@readme/oas-examples/2.0/json/petstore.json' with { type: 'json' };
import parametersCommon from '@readme/oas-examples/3.0/json/parameters-common.json' with { type: 'json' };
import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import uspto from '@readme/oas-examples/3.0/json/uspto.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';

import Oas from '../../src/index.js';
import reducer from '../../src/reducer/index.js';
import circularPathSchema from '../__datasets__/circular-path.json' with { type: 'json' };
import complexNesting from '../__datasets__/complex-nesting.json' with { type: 'json' };
import petstoreRefQuirks from '../__datasets__/petstore-ref-quirks.json' with { type: 'json' };
import reduceQuirks from '../__datasets__/reduce-quirks.json' with { type: 'json' };
import securityRootLevel from '../__datasets__/security-root-level.json' with { type: 'json' };
import tagQuirks from '../__datasets__/tag-quirks.json' with { type: 'json' };

describe('reducer', () => {
  it('should not do anything if no reducers are supplied', () => {
    expect(reducer(petstore as any)).toStrictEqual(petstore as any);
  });

  it('should fail if given a Swagger 2.0 definition', () => {
    expect(() => {
      reducer(swagger as any);
    }).toThrow('Sorry, only OpenAPI definitions are supported.');
  });

  describe('tag reduction', () => {
    it('should reduce by tags', () => {
      const reduced = reducer(petstore as any, { tags: ['Store'] });

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

    it('should reduce by tags even with properties called $ref', () => {
      const reduced = reducer(petstoreRefQuirks as any, { tags: ['store'] });

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

    it('should support reducing by tags that are only stored at the operation level', () => {
      const reduced = reducer(tagQuirks as any, { tags: ['commerce'] });

      expect(reduced.tags).toStrictEqual([{ name: 'store', description: 'Access to Petstore orders' }]);

      expect(reduced.paths).toStrictEqual({
        '/store/inventory': {
          get: expect.any(Object),
        },
      });
    });
  });

  describe('path reduction', () => {
    it('should reduce by paths', () => {
      const reduced = reducer(petstore as any, {
        paths: {
          '/store/ORDER/{orderId}': ['Get'],
        },
      });

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

    it('should support method wildcards', () => {
      const reduced = reducer(petstore as any, {
        paths: {
          '/STORE/order/{orderId}': '*',
        },
      });

      expect(reduced.paths).toStrictEqual({
        '/store/order/{orderId}': {
          get: expect.any(Object),
          delete: expect.any(Object),
        },
      });
    });

    it('should support reducing common parameters', () => {
      const reduced = reducer(parametersCommon as any, {
        paths: {
          '/anything/{id}': ['get'],
        },
      });

      expect(reduced.paths).toStrictEqual({
        '/anything/{id}': {
          parameters: expect.any(Array),
          get: expect.any(Object),
        },
      });
    });
  });

  it('should support retaining deeply nested used $ref pointers', () => {
    const reduced = reducer(complexNesting as any, { paths: { '/multischema/of-everything': '*' } });

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

  it('should retain securitySchemes for root-level security definitions', () => {
    const reduced = reducer(securityRootLevel as any, { paths: { '/anything/apiKey': '*' } });

    expect(reduced.components).toStrictEqual({
      securitySchemes: {
        apiKey_cookie: expect.any(Object),
        apiKey_query: expect.any(Object),
      },
    });
  });

  it("should not leave any components if there aren't any in use", () => {
    const reduced = reducer(uspto as any, { paths: { '/{dataset}/{version}/records': '*' } });

    expect(reduced.components).toBeUndefined();
  });

  describe('quirks', () => {
    /**
     * @see {@link https://github.com/readmeio/oas/issues/924}
     */
    it.skip('should preserve required data in a circular definition', async () => {
      const circular = new Oas(circularPathSchema as OASDocument);
      await circular.dereference();

      const reduced = reducer(circular.api as any, { paths: { '/anything': ['get'] } });

      expect(Object.keys(reduced.paths['/anything'])).toStrictEqual(['get', 'post']);
    });

    it('should preserved deeply nested `example` refs', () => {
      const reduced = reducer(reduceQuirks as any, {
        paths: {
          '/events': ['get'],
        },
      });

      expect(reduced.components?.examples).toHaveProperty('event-search');
      expect(reduced.components?.examples).toHaveProperty('event-min');
      expect(reduced.components?.examples).toHaveProperty('event-all');
    });
  });

  it('should throw an error if we end up with a definition that has no paths', () => {
    expect(() => {
      reducer(petstore as any, { tags: ['unknownTag'] });
    }).toThrow('All paths in the API definition were removed. Did you supply the right path name to reduce by?');

    expect(() => {
      reducer(petstore as any, { paths: { '/unknownPath': '*' } });
    }).toThrow('All paths in the API definition were removed. Did you supply the right path name to reduce by?');
  });
});
