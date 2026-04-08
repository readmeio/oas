import type { OASDocument } from '../../src/types.js';

import swagger from '@readme/oas-examples/2.0/json/petstore.json' with { type: 'json' };
import parametersCommon from '@readme/oas-examples/3.0/json/parameters-common.json' with { type: 'json' };
import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import uspto from '@readme/oas-examples/3.0/json/uspto.json' with { type: 'json' };
import trainTravel from '@readme/oas-examples/3.1/json/train-travel.json' with { type: 'json' };
import webhooks from '@readme/oas-examples/3.1/json/webhooks.json' with { type: 'json' };
import toBeAValidOpenAPIDefinition from 'jest-expect-openapi';
import { assert, describe, expect, it } from 'vitest';

import { OpenAPIReducer } from '../../src/reducer/index.js';
import { isOpenAPI31 } from '../../src/types.js';
import circular from '../__datasets__/circular.json' with { type: 'json' };
import circularPathSchema from '../__datasets__/circular-path.json' with { type: 'json' };
import complexNesting from '../__datasets__/complex-nesting.json' with { type: 'json' };
import petstoreRefQuirks from '../__datasets__/petstore-ref-quirks.json' with { type: 'json' };
import reduceQuirks from '../__datasets__/reduce-quirks.json' with { type: 'json' };
import securityRootLevel from '../__datasets__/security-root-level.json' with { type: 'json' };
import tagQuirks from '../__datasets__/tag-quirks.json' with { type: 'json' };

expect.extend({ toBeAValidOpenAPIDefinition });

describe('OpenAPIReducer', () => {
  it('should not do anything if no reducers are supplied', () => {
    const reduced = OpenAPIReducer.init(petstore as OASDocument).reduce();

    expect(reduced).toStrictEqual(petstore);
  });

  it('should fail if given a Swagger 2.0 definition', () => {
    expect(() => {
      // @ts-expect-error -- Testing supplying a Swagger definition.
      OpenAPIReducer.init(swagger).reduce();
    }).toThrow('Sorry, only OpenAPI definitions are supported.');
  });

  describe('.byTag()', () => {
    it('should reduce by the supplied tags', async () => {
      const reduced = OpenAPIReducer.init(petstore as OASDocument)
        .byTag('Store')
        .reduce();

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
      const reduced = OpenAPIReducer.init(petstoreRefQuirks as OASDocument)
        .byTag('store')
        .reduce();
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
      const reduced = OpenAPIReducer.init(tagQuirks as OASDocument)
        .byTag('commerce')
        .reduce();
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
          OpenAPIReducer.init(petstore as OASDocument)
            .byTag('unknownTag')
            .reduce();
        }).toThrow('All paths in the API definition were removed. Did you supply the right path name to reduce by?');
      });
    });
  });

  describe('.byOperation()', () => {
    it('should reduce by the supplied operation', async () => {
      const reduced = OpenAPIReducer.init(petstore as OASDocument)
        .byOperation('/store/order/{orderId}', 'Get')
        .reduce();

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

    it('should handle path case insensitivity', async () => {
      const reduced = OpenAPIReducer.init(petstore as OASDocument)
        .byOperation(
          '/store/ORDER/{orderId}', // The path URI is actually `/store/order/{orderId}`.
          'Get',
        )
        .reduce();

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

    it('should support reducing common parameters', async () => {
      const reduced = OpenAPIReducer.init(parametersCommon as OASDocument)
        .byOperation('/anything/{id}', 'get')
        .reduce();
      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.paths).toStrictEqual({
        '/anything/{id}': {
          summary: '[common] Summary',
          description: '[common] Description',
          parameters: expect.any(Array),
          get: expect.any(Object),
        },
      });
    });

    it('should retain components referenced by $ref in path-level common parameters', async () => {
      const spec: OASDocument = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/anything/{id}': {
            parameters: [{ $ref: '#/components/parameters/idParam' }],
            get: { operationId: 'getById', responses: { 200: { description: 'OK' } } },
            post: { operationId: 'createById', responses: { 200: { description: 'OK' } } },
          },
        },
        components: {
          parameters: {
            idParam: { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          },
        },
      };

      const reduced = OpenAPIReducer.init(spec).byOperation('/anything/{id}', 'get').reduce();
      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.paths?.['/anything/{id}']).toHaveProperty('parameters');
      expect(reduced.components?.parameters).toStrictEqual({ idParam: spec.components?.parameters?.idParam });
    });

    describe('and we have circular references', () => {
      it('should preserve required data in a circular definition', async () => {
        const reduced = OpenAPIReducer.init(circularPathSchema as OASDocument)
          .byOperation('/anything', 'get')
          .reduce();

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
        const reduced = OpenAPIReducer.init(circular as OASDocument)
          .byOperation('/', 'get')
          .reduce();

        await expect(reduced).toBeAValidOpenAPIDefinition();

        expect(reduced.paths?.['/']).toHaveProperty('get');
        expect(reduced.components?.schemas).toStrictEqual({
          offset: expect.any(Object),
          offsetTransition: expect.any(Object),
          rules: expect.any(Object),
        });
      });
    });

    describe('error handling', () => {
      it('should throw an error if we end up with a definition that has no paths', () => {
        expect(() => {
          OpenAPIReducer.init(petstore as OASDocument)
            .byOperation('/unknownPath', 'get')
            .reduce();
        }).toThrow('All paths in the API definition were removed. Did you supply the right path name to reduce by?');
      });
    });
  });

  describe('.byPath()', () => {
    it('should support reducing an entire path', async () => {
      const reduced = OpenAPIReducer.init(petstore as OASDocument)
        .byPath('/STORE/order/{orderId}')
        .reduce();

      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.paths).toStrictEqual({
        '/store/order/{orderId}': {
          get: expect.any(Object),
          delete: expect.any(Object),
        },
      });
    });

    it('should retain path-level metadata (summary, description, servers) when reducing by path or operation', async () => {
      const definition = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0' },
        paths: {
          '/resource': {
            summary: 'Path-level summary',
            description: 'Path-level description',
            servers: [{ url: 'https://api.example.com/path' }],
            parameters: [{ name: 'pathParam', in: 'query', schema: { type: 'string' } }],
            get: { operationId: 'getResource', responses: { 200: { description: 'OK' } } },
            post: { operationId: 'createResource', responses: { 201: { description: 'Created' } } },
          },
        },
      } as OASDocument;

      const reduced = OpenAPIReducer.init(definition).byOperation('/resource', 'get').reduce();

      await expect(reduced).toBeAValidOpenAPIDefinition();
      expect(reduced.paths?.['/resource']).toMatchObject({
        summary: 'Path-level summary',
        description: 'Path-level description',
        servers: [{ url: 'https://api.example.com/path' }],
        parameters: [{ name: 'pathParam', in: 'query', schema: { type: 'string' } }],
        get: expect.any(Object),
      });
      expect(reduced.paths?.['/resource']).not.toHaveProperty('post');
    });

    it('should support retaining deeply nested used `$ref` pointers', async () => {
      const reduced = OpenAPIReducer.init(complexNesting as OASDocument)
        .byPath('/multischema/of-everything')
        .reduce();
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
      const reduced = OpenAPIReducer.init(securityRootLevel as OASDocument)
        .byPath('/anything/apiKey')
        .reduce();
      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.components).toStrictEqual({
        securitySchemes: {
          apiKey_cookie: expect.any(Object),
          apiKey_query: expect.any(Object),
        },
      });
    });

    it("should not leave any components if there aren't any in use", async () => {
      const reduced = OpenAPIReducer.init(uspto as OASDocument)
        .byPath('/{dataset}/{version}/records')
        .reduce();
      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.components).toBeUndefined();
    });

    describe('error handling', () => {
      it('should throw an error if we end up with a definition that has no paths', () => {
        expect(() => {
          OpenAPIReducer.init(petstore as OASDocument)
            .byPath('/unknownPath')
            .reduce();
        }).toThrow('All paths in the API definition were removed. Did you supply the right path name to reduce by?');
      });
    });
  });

  describe('.byWebhook()', () => {
    it('should support reducing by an entire webhook path', async () => {
      const reduced = OpenAPIReducer.init(trainTravel as unknown as OASDocument)
        .byWebhook('newBooking')
        .reduce();

      await expect(reduced).toBeAValidOpenAPIDefinition();
      if (!isOpenAPI31(reduced)) {
        assert.fail('Resulting schema is not an OpenAPI 3.1 definition.');
      }

      // We didn't reduce by any paths or operations, and no paths are cross-referenced, so `paths`
      // shouldn't exist anymore.
      expect(reduced.paths).toBeUndefined();

      expect(reduced.webhooks).toBeDefined();
      expect(Object.keys(reduced.webhooks || {})).toStrictEqual(['newBooking']);
      expect(reduced.webhooks?.newBooking).toHaveProperty('post');
      expect(reduced.webhooks?.newBooking).toHaveProperty(
        'post',
        expect.objectContaining({
          operationId: 'new-booking',
          summary: 'New Booking',
        }),
      );

      expect(reduced.components?.schemas).toBeDefined();
      expect(Object.keys(reduced.components?.schemas || {})).toStrictEqual([
        'Links-Self',
        'Links-Pagination',
        'Booking',
      ]);
    });

    it('should support reducing by both a webhook, path, and operation similtaneously', async () => {
      // Just to ensure that our Train Travel definition has a `Station` schema that we aren't
      // going to be retaining.
      expect(trainTravel.components?.schemas?.Station).toBeDefined();

      const reduced = OpenAPIReducer.init(trainTravel as unknown as OASDocument)
        .byOperation('/bookings', 'get')
        .byWebhook('newBooking')
        .reduce();

      await expect(reduced).toBeAValidOpenAPIDefinition();
      if (!isOpenAPI31(reduced)) {
        assert.fail('Resulting schema is not an OpenAPI 3.1 definition.');
      }

      expect(Object.keys(reduced.paths || {})).toStrictEqual(['/bookings']);
      expect(reduced.paths?.['/bookings']).not.toHaveProperty('post');
      expect(reduced.paths?.['/bookings']).toHaveProperty(
        'get',
        expect.objectContaining({
          operationId: 'get-bookings',
        }),
      );

      expect(reduced.webhooks).toHaveProperty('newBooking');
      expect(reduced.webhooks?.newBooking).toHaveProperty(
        'post',
        expect.objectContaining({
          operationId: 'new-booking',
        }),
      );

      expect(reduced.components).toStrictEqual({
        securitySchemes: {
          OAuth2: expect.any(Object),
        },
        schemas: {
          'Links-Self': expect.any(Object),
          'Links-Pagination': expect.any(Object),
          Booking: expect.any(Object),
          'Wrapper-Collection': expect.any(Object),
          Problem: expect.any(Object),
        },
        headers: {
          RateLimit: expect.any(Object),
          'Retry-After': expect.any(Object),
        },
        responses: {
          BadRequest: expect.any(Object),
          Forbidden: expect.any(Object),
          InternalServerError: expect.any(Object),
          TooManyRequests: expect.any(Object),
          Unauthorized: expect.any(Object),
        },
      });
    });

    it('should retain components referenced by $ref in webhook-level common parameters', async () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'Test', version: '1.0.0' },
        webhooks: {
          newOrder: {
            parameters: [{ $ref: '#/components/parameters/traceId' }],
            post: { operationId: 'newOrder', responses: { 200: { description: 'OK' } } },
            get: { operationId: 'getOrder', responses: { 200: { description: 'OK' } } },
          },
        },
        components: {
          parameters: {
            traceId: { name: 'X-Trace-Id', in: 'header', schema: { type: 'string' } },
          },
        },
      } as OASDocument;

      const reduced = OpenAPIReducer.init(spec).byWebhook('newOrder', 'post').reduce();
      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.webhooks?.newOrder).toHaveProperty('parameters');
      expect(reduced.components?.parameters).toStrictEqual({ traceId: spec.components?.parameters?.traceId });
    });

    it('should support reducing by webhook name (case insensitive)', async () => {
      const reduced = OpenAPIReducer.init(trainTravel as unknown as OASDocument)
        .byWebhook('NEWBOOKING')
        .reduce();

      await expect(reduced).toBeAValidOpenAPIDefinition();
      if (!isOpenAPI31(reduced)) {
        assert.fail('Resulting schema is not an OpenAPI 3.1 definition.');
      }

      expect(reduced.webhooks).toHaveProperty('newBooking');
    });

    describe('error handling', () => {
      it('should throw when all webhooks are removed and there are no paths', () => {
        expect(() => {
          OpenAPIReducer.init(webhooks as OASDocument)
            .byWebhook('nonexistent')
            .reduce();
        }).toThrow(
          'All paths and webhooks in the API definition were removed. Did you supply the right path, operation, or webhook to reduce by?',
        );
      });
    });
  });

  describe('quirks', () => {
    it('should preserved deeply nested `example` refs', async () => {
      const reduced = OpenAPIReducer.init(reduceQuirks as OASDocument)
        .byOperation('/events', 'get')
        .reduce();

      await expect(reduced).toBeAValidOpenAPIDefinition();

      expect(reduced.components?.examples).toHaveProperty('event-search');
      expect(reduced.components?.examples).toHaveProperty('event-min');
      expect(reduced.components?.examples).toHaveProperty('event-all');
    });
  });
});
