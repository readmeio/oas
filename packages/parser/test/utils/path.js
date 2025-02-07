const nodePath = require('path');
const nodeUrl = require('url');

const testsDir = nodePath.resolve(__dirname, '..');
const isWindows = /^win/.test(process.platform);

// Run all tests from the "test" directory
// eslint-disable-next-line vitest/require-hook
process.chdir(nodePath.join(__dirname, '..'));

/**
 * Helper functions for getting local filesystem paths in various formats
 */
const path = {
  /**
   * Returns the relative path of a file in the "test" directory
   */
  rel(file) {
    return nodePath.normalize(file);
  },

  /**
   * Returns the absolute path of a file in the "test" directory
   */
  abs(file) {
    return nodePath.join(testsDir, file || nodePath.sep);
  },

  /**
   * Returns the path of a file in the "test" directory as a URL.
   * (e.g. "file://path/to/json-schema-ref-parser/test/files...")
   */
  url(file) {
    let pathname = path.abs(file);

    if (isWindows) {
      pathname = pathname.replace(/\\/g, '/'); // Convert Windows separators to URL separators
    }

    return nodeUrl.format({
      protocol: 'file:',
      slashes: true,
      pathname,
    });
  },

  /**
   * Returns the absolute path of the current working directory.
   */
  cwd() {
    return nodePath.join(process.cwd(), nodePath.sep);
  },
};

module.exports = path;
