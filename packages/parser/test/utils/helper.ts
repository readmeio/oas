/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'vitest';

import OpenAPIParser from '../..';

import path from './path';

/**
 * Converts Buffer objects to POJOs, so they can be compared using Chai
 */
export function convertNodeBuffersToPOJOs(value) {
  if (value && (value._isBuffer || (value.constructor && value.constructor.name === 'Buffer'))) {
    // Convert Buffers to POJOs for comparison
    // eslint-disable-next-line no-param-reassign
    value = value.toJSON();
  }

  return value;
}

/**
 * Tests the {@link OpenAPIParser.resolve} method,
 * and asserts that the given file paths resolve to the given values.
 *
 * @param {string} filePath - The file path that should be resolved
 * @param {*} resolvedValue - The resolved value of the file
 * @param {...*} [params] - Additional file paths and resolved values
 * @returns {Function}
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function testResolve(filePath: string, resolvedValue: any, ...params: any | string) {
  const schemaFile = path.rel(arguments[0]);
  const parsedAPI = arguments[1];
  const expectedFiles: string[] = [];
  const expectedValues: string[] = [];
  for (let i = 0; i < arguments.length; i++) {
    expectedFiles.push(path.abs(arguments[i]));
    expectedValues.push(arguments[++i]);
  }

  return async () => {
    const parser = new OpenAPIParser();
    const $refs = await parser.resolve(schemaFile);

    expect(parser.api).to.deep.equal(parsedAPI);
    expect(parser.$refs).to.equal($refs);

    // Resolved file paths
    expect($refs.paths()).to.have.same.members(expectedFiles);
    expect($refs.paths(['file'])).to.have.same.members(expectedFiles);
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
