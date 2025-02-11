import nodePath from 'node:path';
import nodeUrl from 'node:url';

const __dirname = import.meta.dirname;

const testsDir = nodePath.resolve(__dirname, '..');
const isWindows = /^win/.test(process.platform);

// Run all tests from the "test" directory
// eslint-disable-next-line vitest/require-hook
process.chdir(nodePath.join(__dirname, '..'));

/**
 * Returns the relative path of a file in the "test" directory
 */
export function rel(file: string) {
  return nodePath.normalize(file);
}

/**
 * Returns the absolute path of a file in the "test" directory
 */
export function abs(file: string) {
  return nodePath.join(testsDir, file || nodePath.sep);
}

/**
 * Returns the path of a file in the "test" directory as a URL.
 * (e.g. "file://path/to/json-schema-ref-parser/test/files...")
 */
export function url(file: string) {
  let pathname = abs(file);

  if (isWindows) {
    pathname = pathname.replace(/\\/g, '/'); // Convert Windows separators to URL separators
  }

  return nodeUrl.format({
    protocol: 'file:',
    slashes: true,
    pathname,
  });
}

/**
 * Returns the absolute path of the current working directory.
 */
export function cwd() {
  return nodePath.join(process.cwd(), nodePath.sep);
}
