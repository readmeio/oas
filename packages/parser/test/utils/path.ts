import nodePath from 'node:path';

const __dirname = import.meta.dirname;

// Run all tests from the "test" directory
// eslint-disable-next-line vitest/require-hook
process.chdir(nodePath.join(__dirname, '..'));

/**
 * Returns the relative path of a file in the `test/` directory.
 *
 */
export function rel(file: string) {
  return nodePath.normalize(file);
}

/**
 * Returns the absolute path of a file in the `test/` directory.
 *
 */
export function abs(file: string) {
  const testsDir = nodePath.resolve(__dirname, '..');
  return nodePath.join(testsDir, file || nodePath.sep);
}

/**
 * Returns the absolute path of the current working directory.
 *
 */
export function cwd() {
  return nodePath.join(process.cwd(), nodePath.sep);
}
