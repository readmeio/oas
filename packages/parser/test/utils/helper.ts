import type { IJsonSchema, OpenAPI } from 'openapi-types';

import { expect } from 'vitest';

import { SwaggerParser } from '../../src/index.js';

import * as path from './path.js';

/**
 * A general purpose "this API definition is definitely valid" type that will allow you to bypass
 * any type quirks on _real_ OpenAPI v2 and v3 types where sometimes objects can be a
 * `ReferenceObject` and you know the data you have doesn't have that.
 *
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValidAPIDefinition = any;

/**
 * Converts Buffer objects to POJOs, so they can be compared using Chai.
 *
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function convertNodeBuffersToPOJOs(value: any) {
  if (value && (value._isBuffer || (value.constructor && value.constructor.name === 'Buffer'))) {
    // Convert Buffers to POJOs for comparison
    // eslint-disable-next-line no-param-reassign
    value = value.toJSON();
  }

  return value;
}

/**
 * Tests the `OpenAPIParser.resolve` method, and asserts that the given file paths resolve to the
 * given values.
 *
 * @param {string} filePath - The file path that should be resolved
 * @param {*} resolvedValue - The resolved value of the file
 * @param {...*} [params] - Additional file paths and resolved values
 * @returns {Function}
 */
export function testResolve(
  filePath: string,
  resolvedValue: OpenAPI.Document,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ...params: (IJsonSchema | string)[]
) {
  const schemaFile = path.rel(filePath);
  const parsedAPI = resolvedValue;
  const expectedFiles: string[] = [];
  const expectedValues: string[] = [];
  for (let i = 0; i < arguments.length; i++) {
    expectedFiles.push(path.abs(arguments[i]));
    expectedValues.push(arguments[++i]);
  }

  return async () => {
    const parser = new SwaggerParser();
    const $refs = await parser.resolve(schemaFile);

    expect(parser.schema).to.deep.equal(parsedAPI);
    expect(parser.$refs).to.equal($refs);

    // Resolved file paths
    expect($refs.paths()).toStrictEqual(expectedFiles);
    expect($refs.paths(['file'])).toStrictEqual(expectedFiles);
    expect($refs.paths('http')).to.be.an('array').with.lengthOf(0);

    // Resolved values
    const values = $refs.values();
    expect(values).to.have.keys(expectedFiles);
    for (const [i, file] of expectedFiles.entries()) {
      const actual = convertNodeBuffersToPOJOs(values[file]);
      const expected = expectedValues[i];
      expect(actual).to.deep.equal(expected, file);
    }
  };
}
