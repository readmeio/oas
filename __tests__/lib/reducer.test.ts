import swagger from '@readme/oas-examples/2.0/json/petstore.json';
import petstore from '@readme/oas-examples/3.0/json/petstore.json';
import uspto from '@readme/oas-examples/3.0/json/uspto.json';

import reducer from '../../src/lib/reducer';
import complexNesting from '../__datasets__/complex-nesting.json';
import parametersCommon from '../__datasets__/parameters-common.json';
import tagQuirks from '../__datasets__/tag-quirks.json';

test('it should not do anything if no reducers are supplied', () => {
  expect(reducer(petstore as any)).toStrictEqual(petstore as any);
});

test('should fail if given a Swagger 2.0 definition', () => {
  expect(() => {
    reducer(swagger as any);
  }).toThrow('Sorry, only OpenAPI 3.x definitions are supported.');
});

describe('tag reduction', () => {
  it('should reduce by tags', () => {
    const reduced = reducer(petstore as any, { tags: ['store'] });

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
        '/store/order/{orderId}': ['get'],
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
        '/store/order/{orderId}': '*',
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

test('should support retaining deeply nested used $ref pointers', () => {
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

test("it should not leave any components if there aren't any in use", () => {
  const reduced = reducer(uspto as any, { paths: { '/{dataset}/{version}/records': '*' } });

  expect(reduced.components).toBeUndefined();
});

test('should throw an error if we end up with a definition that has no paths', () => {
  expect(() => {
    reducer(petstore as any, { tags: ['unknownTag'] });
  }).toThrow('All paths in the API definition were removed. Did you supply the right path name to reduce by?');

  expect(() => {
    reducer(petstore as any, { paths: { '/unknownPath': '*' } });
  }).toThrow('All paths in the API definition were removed. Did you supply the right path name to reduce by?');
});
