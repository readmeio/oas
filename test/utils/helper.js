const OpenAPIParser = require('../..');
const { host } = require('@jsdevtools/host-environment');
const { expect } = require('chai');
const path = require('./path');

const helper = {
  /**
   * Throws an error if called.
   */
  shouldNotGetCalled() {
    throw new Error('This function should not have gotten called.');
  },

  /**
   * Tests the {@link OpenAPIParser.resolve} method,
   * and asserts that the given file paths resolve to the given values.
   *
   * @param {string} filePath - The file path that should be resolved
   * @param {*} resolvedValue - The resolved value of the file
   * @param {...*} [params] - Additional file paths and resolved values
   * @returns {Function}
   */
  // eslint-disable-next-line no-unused-vars
  testResolve(filePath, resolvedValue, params) {
    const schemaFile = path.rel(arguments[0]);
    const parsedAPI = arguments[1];
    const expectedFiles = [];
    const expectedValues = [];
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
      if (host.node) {
        expect($refs.paths(['file'])).to.have.same.members(expectedFiles);
        expect($refs.paths('http')).to.be.an('array').with.lengthOf(0);
      } else {
        expect($refs.paths(['http', 'https'])).to.have.same.members(expectedFiles);
        expect($refs.paths('fs')).to.be.an('array').with.lengthOf(0);
      }

      // Resolved values
      const values = $refs.values();
      expect(values).to.have.keys(expectedFiles);
      for (const [i, file] of expectedFiles.entries()) {
        const actual = helper.convertNodeBuffersToPOJOs(values[file]);
        const expected = expectedValues[i];
        expect(actual).to.deep.equal(expected, file);
      }
    };
  },

  /**
   * Converts Buffer objects to POJOs, so they can be compared using Chai
   */
  convertNodeBuffersToPOJOs(value) {
    if (value && (value._isBuffer || (value.constructor && value.constructor.name === 'Buffer'))) {
      // Convert Buffers to POJOs for comparison
      // eslint-disable-next-line no-param-reassign
      value = value.toJSON();

      if (host.node && host.node.version < 4) {
        // Node v0.10 serializes buffers differently
        // eslint-disable-next-line no-param-reassign
        value = { type: 'Buffer', data: value };
      }
    }

    return value;
  },

  /**
   * Creates a deep clone of the given value.
   */
  cloneDeep(value) {
    let clone = value;
    if (value && typeof value === 'object') {
      clone = Array.isArray(value) ? [] : {};
      const keys = Object.keys(value);
      for (let i = 0; i < keys.length; i++) {
        clone[keys[i]] = helper.cloneDeep(value[keys[i]]);
      }
    }

    return clone;
  },
};

module.exports = helper;
