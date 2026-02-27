import type { ParserOptions } from '@readme/openapi-parser';
import type { OASDocument, SchemaObject } from '../types.js';

import jsonpointer from 'jsonpointer';

import { isRef } from '../types.js';

/**
 * Encode a string to be used as a JSON pointer.
 *
 * @see {@link https://tools.ietf.org/html/rfc6901}
 * @param str String to encode into string that can be used as a JSON pointer.
 */
export function encodePointer(str: string): string {
  return str.replaceAll('~', '~0').replaceAll('/', '~1');
}

/**
 * Decode a JSON pointer string.
 *
 * Per RFC 6901, `~0` is unescaped to `~` and `~1` to `/`. A single-pass replacement is required:
 * the sequence `~01` must decode to `~1` (tilde then one), not `~/`. Replacing `~1` before `~0`
 * would incorrectly turn `~01` into `~/`.
 *
 * @see {@link https://tools.ietf.org/html/rfc6901}
 * @param str String to decode a JSON pointer from
 */
export function decodePointer(str: string): string {
  return str.replace(/~([01])/g, (_, digit) => (digit === '0' ? '~' : '/'));
}

/**
 * Lookup a reference pointer within an a JSON object and return the schema that it resolves to.
 *
 * @param $ref Reference to look up a schema for.
 * @param definition OpenAPI definition to look for the `$ref` pointer in.
 */
function findRef($ref: string, definition: OASDocument | SchemaObject): any {
  let currRef = $ref.trim();
  if (currRef === '') {
    // If this ref is empty, don't bother trying to look for it.
    return false;
  }

  if (currRef.startsWith('#')) {
    // Decode URI fragment representation.
    currRef = decodeURIComponent(currRef.substring(1));
  } else {
    throw new Error(`Could not find a definition for ${$ref}.`);
  }

  const current = jsonpointer.get(definition, currRef);
  if (current === undefined) {
    throw new Error(`Could not find a definition for ${$ref}.`);
  }

  return current;
}

/**
 * Dereference a `$ref` pointer if present, otherwise return the value as-is.
 *
 * This function handles `$ref` pointers on-the-fly without requiring full dereferencing and
 * prevents infinite loops by tracking seen `$ref` pointers and not re-processing circular
 * references.
 *
 * @param value The value that may contain a `$ref` pointer.
 * @param definition OpenAPI definition to look for the `$ref` pointer in.
 * @param seenRefs Optional Set to track `$ref` pointers that have already been processed to prevent circular references.
 * @returns The dereferenced value if it was a `$ref`, otherwise the original value. Returns the original `$ref` if it's circular.
 */
export function dereferenceRef<T>(value: T, definition?: OASDocument | SchemaObject, seenRefs?: Set<string>): T {
  if (value === undefined) {
    return undefined as T;
  }

  if (isRef(value)) {
    if (!definition) {
      return value as T;
    }

    const ref = value.$ref;

    // If we've seen this `$ref` before then it's circular and we should return the original `$ref`
    // to prevent infinite loops
    if (seenRefs?.has(ref)) {
      return value as T;
    }

    // Track this $ref as seen
    const localSeenRefs = seenRefs || new Set<string>();
    localSeenRefs.add(ref);

    try {
      const dereferenced = findRef(ref, definition);

      // If the dereferenced value is itself a `$ref` then recursively dereference it (but with
      // `seenRefs` tracking).
      if (isRef(dereferenced)) {
        return dereferenceRef(dereferenced, definition, localSeenRefs) as T;
      }

      const refName = ref.split('/').pop();
      return {
        ...dereferenced,

        // Because dereferencing will eliminate any lineage back to the original `$ref`,
        // information that we might need at some point, we should preserve the original schema
        // name through a custom extension.
        'x-readme-ref-name': refName,
      } as T;
    } catch {
      // If dereferencing fails return the original `$ref`.
      return value as T;
    }
  }

  return value;
}

/**
 * Retrive our dereferencing configuration for `@readme/openapi-parser`.
 *
 */
export function getDereferencingOptions(circularRefs: Set<string>): Pick<ParserOptions, 'resolve' | 'dereference'> {
  return {
    resolve: {
      // We shouldn't be resolving external pointers at this point so just ignore them.
      external: false,
    },
    dereference: {
      // If circular `$refs` are ignored they'll remain in the schema as `$ref: String`, otherwise
      // `$ref` just won't exist. This, in tandem with `onCircular`, allows us to do easy and
      // accumulate a list of circular references.
      circular: 'ignore',

      onCircular: (path: string) => {
        // The circular references that are coming out of `json-schema-ref-parser` are prefixed
        // with the schema path (file path, URL, whatever) that the schema exists in. Because we
        // don't care about this information for this reporting mechanism, and only the `$ref`
        // pointer, we're removing it.
        circularRefs.add(`#${path.split('#')[1]}`);
      },
    },
  };
}
