// oxlint-disable vitest/expect-expect
import type { DataForHAR } from '../../../src/lib/types.js';
import type { PostDataParams } from 'har-format';
import type { OperationObject } from 'oas/types';

import toBeAValidHAR from 'jest-expect-har';
import { describe, expect, it, vi } from 'vitest';

import oasToHar from '../../../src/index.js';
import { createOas as oasFixture } from '../../__fixtures__/create-oas.js';
import {
  arrayInput,
  arrayInputEncoded,
  emptyInput,
  objectInput,
  objectInputEncoded,
  objectNestedObject,
  objectNestedObjectOfARidiculiousShape,
  stringInput,
  stringInputEncoded,
} from '../../__fixtures__/style-data.js';

// oxlint-disable-next-line vitest/require-hook
expect.extend({ toBeAValidHAR });

const createOas = oasFixture('post');

function buildBody(style, explode) {
  return {
    requestBody: {
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              primitive: {
                type: 'string',
              },
              array: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              object: {
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
          encoding: {
            primitive: {
              style,
              explode,
            },
            array: {
              style,
              explode,
            },
            object: {
              style,
              explode,
            },
          },
        },
      },
    },
  } as unknown as OperationObject;
}

// oxlint-disable vitest/no-standalone-expect -- these run when a test calls the helper
const assertFormStyle = vi.defineHelper(async (operation, formData: DataForHAR, expected: PostDataParams['params']) => {
  const oas = createOas('/body', operation);
  const har = oasToHar(oas, oas.operation('/body', 'post'), formData);

  await expect(har).toBeAValidHAR();

  expect(har.log.entries[0].request.postData?.params).toStrictEqual(expected);
});

const assertSpaceDelimitedStyle = vi.defineHelper(
  async (operation, formData: DataForHAR, expected: PostDataParams['params']) => {
    const oas = createOas('/body', operation);
    const har = oasToHar(oas, oas.operation('/body', 'post'), formData);

    await expect(har).toBeAValidHAR();

    expect(har.log.entries[0].request.postData?.params).toStrictEqual(expected);
  },
);

const assertPipeDelimitedStyle = vi.defineHelper(
  async (operation, formData: DataForHAR, expected: PostDataParams['params']) => {
    const oas = createOas('/body', operation);
    const har = oasToHar(oas, oas.operation('/body', 'post'), formData);

    await expect(har).toBeAValidHAR();

    expect(har.log.entries[0].request.postData?.params).toStrictEqual(expected);
  },
);

const assertDeepObjectStyle = vi.defineHelper(
  async (operation, formData: DataForHAR, expected: PostDataParams['params']) => {
    const oas = createOas('/body', operation);
    const har = oasToHar(oas, oas.operation('/body', 'post'), formData);

    await expect(har).toBeAValidHAR();

    expect(har.log.entries[0].request.postData?.params).toStrictEqual(expected);
  },
);
// oxlint-enable vitest/no-standalone-expect

describe('multipart/form-data parameters', () => {
  it('should return an empty array when provided a privitive request body', async () => {
    const oas = createOas('/body', buildBody('form', false));
    const har = oasToHar(oas, oas.operation('/body', 'post'), { body: 'hello, primitive string body' });

    await expect(har).toBeAValidHAR();

    expect(har.log.entries[0].request.postData?.params).toHaveLength(0);
  });

  describe('form style', () => {
    const bodyNoExplode = buildBody('form', false);
    const bodyExplode = buildBody('form', true);

    it('should support form delimited multipart/form-data styles for non exploded empty input', async () => {
      await assertFormStyle(bodyNoExplode, { body: { primitive: emptyInput } }, [{ name: 'primitive', value: '' }]);
    });

    it('should support form delimited multipart/form-data styles for exploded empty input', async () => {
      await assertFormStyle(bodyExplode, { body: { primitive: emptyInput } }, [{ name: 'primitive', value: '' }]);
    });

    it('should support form delimited multipart/form-data styles for non exploded string input', async () => {
      await assertFormStyle(bodyNoExplode, { body: { primitive: stringInput } }, [
        { name: 'primitive', value: 'blue' },
      ]);
    });

    it('should support form delimited multipart/form-data styles for non exploded string input and NOT encode already encoded values', async () => {
      await assertFormStyle(bodyNoExplode, { body: { primitive: stringInputEncoded } }, [
        { name: 'primitive', value: 'something%26nothing%3Dtrue' },
      ]);
    });

    it('should support form delimited multipart/form-data styles for exploded string input', async () => {
      await assertFormStyle(bodyExplode, { body: { primitive: stringInput } }, [{ name: 'primitive', value: 'blue' }]);
    });

    it('should support form delimited multipart/form-data styles for exploded string input and NOT encode already encoded values', async () => {
      await assertFormStyle(bodyExplode, { body: { primitive: stringInputEncoded } }, [
        { name: 'primitive', value: 'something%26nothing%3Dtrue' },
      ]);
    });

    it('should support form delimited multipart/form-data styles for non exploded array input', async () => {
      await assertFormStyle(bodyNoExplode, { body: { array: arrayInput } }, [
        { name: 'array', value: 'blue,black,brown' },
      ]);
    });

    it('should support form delimited multipart/form-data styles for non exploded array input and NOT encode already encoded values', async () => {
      await assertFormStyle(bodyNoExplode, { body: { array: arrayInputEncoded } }, [
        { name: 'array', value: 'something%26nothing%3Dtrue,hash%23data' },
      ]);
    });

    it('should support form delimited multipart/form-data styles for exploded array input', async () => {
      await assertFormStyle(bodyExplode, { body: { array: arrayInput } }, [
        { name: 'array', value: 'blue' },
        { name: 'array', value: 'black' },
        { name: 'array', value: 'brown' },
      ]);
    });

    it('should support form delimited multipart/form-data styles for exploded array inpu and NOT encode already encoded values', async () => {
      await assertFormStyle(bodyExplode, { body: { array: arrayInputEncoded } }, [
        { name: 'array', value: 'something%26nothing%3Dtrue' },
        { name: 'array', value: 'hash%23data' },
      ]);
    });

    it('should support form delimited multipart/form-data styles for non exploded object input', async () => {
      await assertFormStyle(bodyNoExplode, { body: { object: objectInput } }, [
        { name: 'object', value: 'R,100,G,200,B,150' },
      ]);
    });

    it('should support form delimited multipart/form-data styles for non exploded object input and NOT encode already encoded values', async () => {
      await assertFormStyle(bodyNoExplode, { body: { object: objectInputEncoded } }, [
        { name: 'object', value: 'pound,something%26nothing%3Dtrue,hash,hash%23data' },
      ]);
    });

    it('should support form delimited multipart/form-data styles for exploded object input', async () => {
      await assertFormStyle(bodyExplode, { body: { object: objectInput } }, [
        { name: 'R', value: '100' },
        { name: 'G', value: '200' },
        { name: 'B', value: '150' },
      ]);
    });

    it('should support form delimited multipart/form-data styles for exploded object input and NOT encode already encoded values', async () => {
      await assertFormStyle(bodyExplode, { body: { object: objectInputEncoded } }, [
        { name: 'pound', value: 'something%26nothing%3Dtrue' },
        { name: 'hash', value: 'hash%23data' },
      ]);
    });
  });

  describe('spaceDelimited style', () => {
    const bodyNoExplode = buildBody('spaceDelimited', false);
    const bodyExplode = buildBody('spaceDelimited', true);

    it('should NOT support space delimited multipart/form-data styles for non exploded empty input', async () => {
      await assertSpaceDelimitedStyle(bodyNoExplode, { body: { primitive: emptyInput } }, []);
    });

    it('should NOT support space delimited multipart/form-data styles for exploded empty input', async () => {
      await assertSpaceDelimitedStyle(bodyExplode, { body: { primitive: emptyInput } }, []);
    });

    it('should NOT support space delimited multipart/form-data styles for non exploded string input', async () => {
      await assertSpaceDelimitedStyle(bodyNoExplode, { body: { primitive: stringInput } }, []);
    });

    it('should NOT support space delimited multipart/form-data styles for exploded string input', async () => {
      await assertSpaceDelimitedStyle(bodyExplode, { body: { primitive: stringInput } }, []);
    });

    it('should support space delimited multipart/form-data styles for non exploded array input', async () => {
      await assertSpaceDelimitedStyle(bodyNoExplode, { body: { array: arrayInput } }, [
        { name: 'array', value: 'blue black brown' },
      ]);
    });

    it('should support space delimited multipart/form-data styles for non exploded array input and NOT encode already encoded values', async () => {
      await assertSpaceDelimitedStyle(bodyNoExplode, { body: { array: arrayInputEncoded } }, [
        { name: 'array', value: 'something%26nothing%3Dtrue hash%23data' },
      ]);
    });

    it('should NOT support space delimited multipart/form-data styles for exploded array input', async () => {
      await assertSpaceDelimitedStyle(bodyExplode, { body: { array: arrayInput } }, []);
    });

    // This is supposed to be supported, but the style-serializer library we use does not have
    // support. Holding off for now.
    // oxlint-disable-next-line vitest/no-disabled-tests
    it.skip('should support space delimited multipart/form-data styles for non exploded object input', async () => {
      await assertSpaceDelimitedStyle(
        bodyNoExplode,
        { body: { object: objectInput } },
        // Note: this is space here, but %20 in the example above, because encoding happens far down the line
        // @ts-ignore -- fix this when the test gets fixed
        { object: 'R 100 G 200 B 150' },
      );
    });

    // This is supposed to be supported, but the style-serializer library we use does not have
    // support. Holding off for now.
    // oxlint-disable-next-line jest/no-disabled-tests
    it.skip('should NOT support space delimited multipart/form-data styles for exploded object input', async () => {
      await assertSpaceDelimitedStyle(bodyExplode, { body: { object: objectInput } }, []);
    });
  });

  describe('pipeDelimited style', () => {
    const bodyNoExplode = buildBody('pipeDelimited', false);
    const bodyExplode = buildBody('pipeDelimited', true);

    it('should NOT support pipe delimited multipart/form-data styles for non exploded empty input', async () => {
      await assertPipeDelimitedStyle(bodyNoExplode, { body: { primitive: emptyInput } }, []);
    });

    it('should NOT support pipe delimited multipart/form-data styles for exploded empty input', async () => {
      await assertPipeDelimitedStyle(bodyExplode, { body: { primitive: emptyInput } }, []);
    });

    it('should NOT support pipe delimited multipart/form-data styles for non exploded string input', async () => {
      await assertPipeDelimitedStyle(bodyNoExplode, { body: { primitive: stringInput } }, []);
    });

    it('should NOT support pipe delimited multipart/form-data styles for exploded string input', async () => {
      await assertPipeDelimitedStyle(bodyExplode, { body: { primitive: stringInput } }, []);
    });

    it('should support pipe delimited multipart/form-data styles for non exploded array input', async () => {
      await assertPipeDelimitedStyle(bodyNoExplode, { body: { array: arrayInput } }, [
        { name: 'array', value: 'blue|black|brown' },
      ]);
    });

    it('should support pipe delimited multipart/form-data styles for non exploded array input and NOT encode already encoded values', async () => {
      await assertPipeDelimitedStyle(bodyNoExplode, { body: { array: arrayInputEncoded } }, [
        { name: 'array', value: 'something%26nothing%3Dtrue|hash%23data' },
      ]);
    });

    it('should NOT support pipe delimited multipart/form-data styles for exploded array input', async () => {
      await assertPipeDelimitedStyle(bodyExplode, { body: { array: arrayInput } }, []);
    });

    // This is supposed to be supported, but the style-seralizer library we use does not have
    // support. Holding off for now.
    it.todo(
      'should support pipe delimited multipart/form-data styles for non exploded object input',
      // assertPipeDelimitedStyle(bodyNoExplode, { body: { color: objectInput } }, { color: 'R|100|G|200|B|150' })
    );

    // This is supposed to be supported, but the style-seralizer library we use does not have
    // support. Holding off for now.
    // oxlint-disable-next-line jest/no-disabled-tests
    it.skip('should NOT support pipe delimited multipart/form-data styles for exploded object input', async () => {
      await assertPipeDelimitedStyle(bodyExplode, { body: { color: objectInput } }, []);
    });
  });

  describe('deepObject style', () => {
    const bodyNoExplode = buildBody('deepObject', false);
    const bodyExplode = buildBody('deepObject', true);

    it('should NOT support deepObject delimited multipart/form-data styles for non exploded empty input', async () => {
      await assertDeepObjectStyle(bodyNoExplode, { body: { primitive: emptyInput } }, []);
    });

    it('should NOT support deepObject delimited multipart/form-data styles for exploded empty input', async () => {
      await assertDeepObjectStyle(bodyExplode, { body: { primitive: emptyInput } }, []);
    });

    it('should NOT support deepObject delimited multipart/form-data styles for non exploded string input', async () => {
      await assertDeepObjectStyle(bodyNoExplode, { body: { primitive: stringInput } }, []);
    });

    it('should NOT support deepObject delimited multipart/form-data styles for exploded string input', async () => {
      await assertDeepObjectStyle(bodyExplode, { body: { primitive: stringInput } }, []);
    });

    it('should NOT support deepObject delimited multipart/form-data styles for non exploded array input', async () => {
      await assertDeepObjectStyle(bodyNoExplode, { body: { array: arrayInput } }, []);
    });

    // This breaks from the spec, but we have had requests to support arrays as if they are numerically keyed objects, and this is the easiest way
    it('should support deepObject delimited multipart/form-data styles for exploded array input', async () => {
      await assertDeepObjectStyle(bodyExplode, { body: { array: arrayInput } }, [
        {
          name: 'array[0]',
          value: 'blue',
        },
        {
          name: 'array[1]',
          value: 'black',
        },
        {
          name: 'array[2]',
          value: 'brown',
        },
      ]);
    });

    it('should NOT support deepObject delimited multipart/form-data styles for non exploded object input', async () => {
      await assertDeepObjectStyle(bodyNoExplode, { body: { object: objectInput } }, []);
    });

    it('should support deepObject delimited multipart/form-data styles for exploded object input', async () => {
      await assertDeepObjectStyle(bodyExplode, { body: { object: objectInput } }, [
        { name: 'object[R]', value: '100' },
        { name: 'object[G]', value: '200' },
        { name: 'object[B]', value: '150' },
      ]);
    });

    it('should support deepObject delimited multipart/form-data styles for exploded object input and NOT encode already encoded values', async () => {
      await assertDeepObjectStyle(bodyExplode, { body: { object: objectInputEncoded } }, [
        { name: 'object[pound]', value: 'something%26nothing%3Dtrue' },
        { name: 'object[hash]', value: 'hash%23data' },
      ]);
    });

    it('should support deepObject styles for nested objects past 1 level depth', async () => {
      await assertDeepObjectStyle(bodyExplode, { body: { object: objectNestedObject } }, [
        { name: 'object[id]', value: 'someID' },
        { name: 'object[child][name]', value: 'childName' },
        { name: 'object[child][age]', value: 'null' },
        { name: 'object[child][metadata][name]', value: 'meta' },
      ]);
    });

    it('should support deepObject styles for nested objects past 1 level depth (and with a ridiculious shape)', async () => {
      await assertDeepObjectStyle(bodyExplode, { body: { object: objectNestedObjectOfARidiculiousShape } }, [
        { name: 'object[id]', value: 'someID' },
        { name: 'object[petLicense]', value: 'null' },
        { name: 'object[dog][name]', value: 'buster' },
        { name: 'object[dog][age]', value: '18' },
        { name: 'object[dog][treats][0]', value: 'peanut%20butter' },
        { name: 'object[dog][treats][1]', value: 'apple' },
        { name: 'object[pets][0][name]', value: 'buster' },
        { name: 'object[pets][0][age]', value: 'null' },
        { name: 'object[pets][0][metadata][isOld]', value: 'true' },
      ]);
    });
  });
});
