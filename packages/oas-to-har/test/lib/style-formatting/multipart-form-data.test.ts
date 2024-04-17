import type { DataForHAR } from '../../../src/lib/types.js';
import type { PostDataParams } from 'har-format';

import toBeAValidHAR from 'jest-expect-har';
import { describe, it, expect } from 'vitest';

import oasToHar from '../../../src/index.js';
import oasFixture from '../../__fixtures__/create-oas.js';
import {
  emptyInput,
  stringInput,
  stringInputEncoded,
  arrayInput,
  arrayInputEncoded,
  objectInput,
  objectNestedObject,
  objectNestedObjectOfARidiculiousShape,
  objectInputEncoded,
} from '../../__fixtures__/style-data.js';

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
  };
}

describe('multipart/form-data parameters', () => {
  it('should return an empty array when provided a privitive request body', async () => {
    const oas = createOas('/body', buildBody('form', false));
    const har = oasToHar(oas, oas.operation('/body', 'post'), { body: 'hello, primitive string body' });
    await expect(har).toBeAValidHAR();

    expect(har.log.entries[0].request.postData.params).toHaveLength(0);
  });

  describe('form style', () => {
    const bodyNoExplode = buildBody('form', false);
    const bodyExplode = buildBody('form', true);

    function assertFormStyle(operation, formData: DataForHAR, expected: PostDataParams['params']) {
      return async () => {
        const oas = createOas('/body', operation);
        const har = oasToHar(oas, oas.operation('/body', 'post'), formData);
        await expect(har).toBeAValidHAR();

        expect(har.log.entries[0].request.postData.params).toStrictEqual(expected);
      };
    }

    it(
      'should support form delimited multipart/form-data styles for non exploded empty input',
      assertFormStyle(bodyNoExplode, { body: { primitive: emptyInput } }, [{ name: 'primitive', value: '' }]),
    );

    it(
      'should support form delimited multipart/form-data styles for exploded empty input',
      assertFormStyle(bodyExplode, { body: { primitive: emptyInput } }, [{ name: 'primitive', value: '' }]),
    );

    it(
      'should support form delimited multipart/form-data styles for non exploded string input',
      assertFormStyle(bodyNoExplode, { body: { primitive: stringInput } }, [{ name: 'primitive', value: 'blue' }]),
    );

    it(
      'should support form delimited multipart/form-data styles for non exploded string input and NOT encode already encoded values',
      assertFormStyle(bodyNoExplode, { body: { primitive: stringInputEncoded } }, [
        { name: 'primitive', value: 'something%26nothing%3Dtrue' },
      ]),
    );

    it(
      'should support form delimited multipart/form-data styles for exploded string input',
      assertFormStyle(bodyExplode, { body: { primitive: stringInput } }, [{ name: 'primitive', value: 'blue' }]),
    );

    it(
      'should support form delimited multipart/form-data styles for exploded string input and NOT encode already encoded values',
      assertFormStyle(bodyExplode, { body: { primitive: stringInputEncoded } }, [
        { name: 'primitive', value: 'something%26nothing%3Dtrue' },
      ]),
    );

    it(
      'should support form delimited multipart/form-data styles for non exploded array input',
      assertFormStyle(bodyNoExplode, { body: { array: arrayInput } }, [{ name: 'array', value: 'blue,black,brown' }]),
    );

    it(
      'should support form delimited multipart/form-data styles for non exploded array input and NOT encode already encoded values',
      assertFormStyle(bodyNoExplode, { body: { array: arrayInputEncoded } }, [
        { name: 'array', value: 'something%26nothing%3Dtrue,hash%23data' },
      ]),
    );

    it(
      'should support form delimited multipart/form-data styles for exploded array input',
      assertFormStyle(bodyExplode, { body: { array: arrayInput } }, [
        { name: 'array', value: 'blue' },
        { name: 'array', value: 'black' },
        { name: 'array', value: 'brown' },
      ]),
    );

    it(
      'should support form delimited multipart/form-data styles for exploded array inpu and NOT encode already encoded values',
      assertFormStyle(bodyExplode, { body: { array: arrayInputEncoded } }, [
        { name: 'array', value: 'something%26nothing%3Dtrue' },
        { name: 'array', value: 'hash%23data' },
      ]),
    );

    it(
      'should support form delimited multipart/form-data styles for non exploded object input',
      assertFormStyle(bodyNoExplode, { body: { object: objectInput } }, [
        { name: 'object', value: 'R,100,G,200,B,150' },
      ]),
    );

    it(
      'should support form delimited multipart/form-data styles for non exploded object input and NOT encode already encoded values',
      assertFormStyle(bodyNoExplode, { body: { object: objectInputEncoded } }, [
        { name: 'object', value: 'pound,something%26nothing%3Dtrue,hash,hash%23data' },
      ]),
    );

    it(
      'should support form delimited multipart/form-data styles for exploded object input',
      assertFormStyle(bodyExplode, { body: { object: objectInput } }, [
        { name: 'R', value: '100' },
        { name: 'G', value: '200' },
        { name: 'B', value: '150' },
      ]),
    );

    it(
      'should support form delimited multipart/form-data styles for exploded object input and NOT encode already encoded values',
      assertFormStyle(bodyExplode, { body: { object: objectInputEncoded } }, [
        { name: 'pound', value: 'something%26nothing%3Dtrue' },
        { name: 'hash', value: 'hash%23data' },
      ]),
    );
  });

  describe('spaceDelimited style', () => {
    const bodyNoExplode = buildBody('spaceDelimited', false);
    const bodyExplode = buildBody('spaceDelimited', true);

    function assertSpaceDelimitedStyle(operation, formData: DataForHAR, expected: PostDataParams['params']) {
      return async () => {
        const oas = createOas('/body', operation);
        const har = oasToHar(oas, oas.operation('/body', 'post'), formData);
        await expect(har).toBeAValidHAR();

        expect(har.log.entries[0].request.postData.params).toStrictEqual(expected);
      };
    }

    it(
      'should NOT support space delimited multipart/form-data styles for non exploded empty input',
      assertSpaceDelimitedStyle(bodyNoExplode, { body: { primitive: emptyInput } }, []),
    );

    it(
      'should NOT support space delimited multipart/form-data styles for exploded empty input',
      assertSpaceDelimitedStyle(bodyExplode, { body: { primitive: emptyInput } }, []),
    );

    it(
      'should NOT support space delimited multipart/form-data styles for non exploded string input',
      assertSpaceDelimitedStyle(bodyNoExplode, { body: { primitive: stringInput } }, []),
    );

    it(
      'should NOT support space delimited multipart/form-data styles for exploded string input',
      assertSpaceDelimitedStyle(bodyExplode, { body: { primitive: stringInput } }, []),
    );

    it(
      'should support space delimited multipart/form-data styles for non exploded array input',
      assertSpaceDelimitedStyle(bodyNoExplode, { body: { array: arrayInput } }, [
        { name: 'array', value: 'blue black brown' },
      ]),
    );

    it(
      'should support space delimited multipart/form-data styles for non exploded array input and NOT encode already encoded values',
      assertSpaceDelimitedStyle(bodyNoExplode, { body: { array: arrayInputEncoded } }, [
        { name: 'array', value: 'something%26nothing%3Dtrue hash%23data' },
      ]),
    );

    it(
      'should NOT support space delimited multipart/form-data styles for exploded array input',
      assertSpaceDelimitedStyle(bodyExplode, { body: { array: arrayInput } }, []),
    );

    // This is supposed to be supported, but the style-serializer library we use does not have
    // support. Holding off for now.
    it.todo(
      'should support space delimited multipart/form-data styles for non exploded object input',
      /* assertSpaceDelimitedStyle(
        bodyNoExplode,
        { body: { object: objectInput } },
        // Note: this is space here, but %20 in the example above, because encoding happens far down the line
        { object: 'R 100 G 200 B 150' }
      ) */
    );

    // This is supposed to be supported, but the style-serializer library we use does not have
    // support. Holding off for now.
    // eslint-disable-next-line vitest/no-disabled-tests
    it.skip(
      'should NOT support space delimited multipart/form-data styles for exploded object input',
      assertSpaceDelimitedStyle(bodyExplode, { body: { object: objectInput } }, []),
    );
  });

  describe('pipeDelimited style', () => {
    const bodyNoExplode = buildBody('pipeDelimited', false);
    const bodyExplode = buildBody('pipeDelimited', true);

    function assertPipeDelimitedStyle(operation, formData: DataForHAR, expected: PostDataParams['params']) {
      return async () => {
        const oas = createOas('/body', operation);
        const har = oasToHar(oas, oas.operation('/body', 'post'), formData);
        await expect(har).toBeAValidHAR();

        expect(har.log.entries[0].request.postData.params).toStrictEqual(expected);
      };
    }

    it(
      'should NOT support pipe delimited multipart/form-data styles for non exploded empty input',
      assertPipeDelimitedStyle(bodyNoExplode, { body: { primitive: emptyInput } }, []),
    );

    it(
      'should NOT support pipe delimited multipart/form-data styles for exploded empty input',
      assertPipeDelimitedStyle(bodyExplode, { body: { primitive: emptyInput } }, []),
    );

    it(
      'should NOT support pipe delimited multipart/form-data styles for non exploded string input',
      assertPipeDelimitedStyle(bodyNoExplode, { body: { primitive: stringInput } }, []),
    );

    it(
      'should NOT support pipe delimited multipart/form-data styles for exploded string input',
      assertPipeDelimitedStyle(bodyExplode, { body: { primitive: stringInput } }, []),
    );

    it(
      'should support pipe delimited multipart/form-data styles for non exploded array input',
      assertPipeDelimitedStyle(bodyNoExplode, { body: { array: arrayInput } }, [
        { name: 'array', value: 'blue|black|brown' },
      ]),
    );

    it(
      'should support pipe delimited multipart/form-data styles for non exploded array input and NOT encode already encoded values',
      assertPipeDelimitedStyle(bodyNoExplode, { body: { array: arrayInputEncoded } }, [
        { name: 'array', value: 'something%26nothing%3Dtrue|hash%23data' },
      ]),
    );

    it(
      'should NOT support pipe delimited multipart/form-data styles for exploded array input',
      assertPipeDelimitedStyle(bodyExplode, { body: { array: arrayInput } }, []),
    );

    // This is supposed to be supported, but the style-seralizer library we use does not have
    // support. Holding off for now.
    it.todo(
      'should support pipe delimited multipart/form-data styles for non exploded object input',
      // assertPipeDelimitedStyle(bodyNoExplode, { body: { color: objectInput } }, { color: 'R|100|G|200|B|150' })
    );

    // This is supposed to be supported, but the style-seralizer library we use does not have
    // support. Holding off for now.
    // eslint-disable-next-line vitest/no-disabled-tests
    it.skip(
      'should NOT support pipe delimited multipart/form-data styles for exploded object input',
      assertPipeDelimitedStyle(bodyExplode, { body: { color: objectInput } }, []),
    );
  });

  describe('deepObject style', () => {
    const bodyNoExplode = buildBody('deepObject', false);
    const bodyExplode = buildBody('deepObject', true);

    function assertDeepObjectStyle(operation, formData: DataForHAR, expected: PostDataParams['params']) {
      return async () => {
        const oas = createOas('/body', operation);
        const har = oasToHar(oas, oas.operation('/body', 'post'), formData);
        await expect(har).toBeAValidHAR();

        expect(har.log.entries[0].request.postData.params).toStrictEqual(expected);
      };
    }

    it(
      'should NOT support deepObject delimited multipart/form-data styles for non exploded empty input',
      assertDeepObjectStyle(bodyNoExplode, { body: { primitive: emptyInput } }, []),
    );

    it(
      'should NOT support deepObject delimited multipart/form-data styles for exploded empty input',
      assertDeepObjectStyle(bodyExplode, { body: { primitive: emptyInput } }, []),
    );

    it(
      'should NOT support deepObject delimited multipart/form-data styles for non exploded string input',
      assertDeepObjectStyle(bodyNoExplode, { body: { primitive: stringInput } }, []),
    );

    it(
      'should NOT support deepObject delimited multipart/form-data styles for exploded string input',
      assertDeepObjectStyle(bodyExplode, { body: { primitive: stringInput } }, []),
    );

    it(
      'should NOT support deepObject delimited multipart/form-data styles for non exploded array input',
      assertDeepObjectStyle(bodyNoExplode, { body: { array: arrayInput } }, []),
    );

    // This breaks from the spec, but we have had requests to support arrays as if they are numerically keyed objects, and this is the easiest way
    it(
      'should support deepObject delimited multipart/form-data styles for exploded array input',
      assertDeepObjectStyle(bodyExplode, { body: { array: arrayInput } }, [
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
      ]),
    );

    it(
      'should NOT support deepObject delimited multipart/form-data styles for non exploded object input',
      assertDeepObjectStyle(bodyNoExplode, { body: { object: objectInput } }, []),
    );

    it(
      'should support deepObject delimited multipart/form-data styles for exploded object input',
      assertDeepObjectStyle(bodyExplode, { body: { object: objectInput } }, [
        { name: 'object[R]', value: '100' },
        { name: 'object[G]', value: '200' },
        { name: 'object[B]', value: '150' },
      ]),
    );

    it(
      'should support deepObject delimited multipart/form-data styles for exploded object input and NOT encode already encoded values',
      assertDeepObjectStyle(bodyExplode, { body: { object: objectInputEncoded } }, [
        { name: 'object[pound]', value: 'something%26nothing%3Dtrue' },
        { name: 'object[hash]', value: 'hash%23data' },
      ]),
    );

    it(
      'should support deepObject styles for nested objects past 1 level depth',
      assertDeepObjectStyle(bodyExplode, { body: { object: objectNestedObject } }, [
        { name: 'object[id]', value: 'someID' },
        { name: 'object[child][name]', value: 'childName' },
        { name: 'object[child][age]', value: 'null' },
        { name: 'object[child][metadata][name]', value: 'meta' },
      ]),
    );

    it(
      'should support deepObject styles for nested objects past 1 level depth (and with a ridiculious shape)',
      assertDeepObjectStyle(bodyExplode, { body: { object: objectNestedObjectOfARidiculiousShape } }, [
        { name: 'object[id]', value: 'someID' },
        { name: 'object[petLicense]', value: 'null' },
        { name: 'object[dog][name]', value: 'buster' },
        { name: 'object[dog][age]', value: '18' },
        { name: 'object[dog][treats][0]', value: 'peanut%20butter' },
        { name: 'object[dog][treats][1]', value: 'apple' },
        { name: 'object[pets][0][name]', value: 'buster' },
        { name: 'object[pets][0][age]', value: 'null' },
        { name: 'object[pets][0][metadata][isOld]', value: 'true' },
      ]),
    );
  });
});
