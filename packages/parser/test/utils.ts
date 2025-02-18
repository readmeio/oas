import nodePath from 'node:path';

/**
 * A general purpose "this API definition is definitely valid" type that will allow you to bypass
 * any type quirks on _real_ OpenAPI v2 and v3 types where sometimes objects can be a
 * `ReferenceObject` and you know the data you have doesn't have that.
 *
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValidAPIDefinition = any;

/**
 * Returns the relative path of a file in the `test/` directory.
 *
 */
export function relativePath(file: string): string {
  return nodePath.normalize(file);
}
