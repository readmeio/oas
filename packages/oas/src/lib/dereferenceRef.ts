import type { OASDocument } from '../types.js';

import jsonpointer from 'jsonpointer';

import { isRef } from '../types.js';

/**
 * Lookup a reference pointer within an a JSON object and return the schema that it resolves to.
 *
 * @param $ref Reference to look up a schema for.
 * @param definition OpenAPI definition to look for the `$ref` pointer in.
 */
function findRef($ref: string, definition: Record<string, unknown> = {}): any {
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
export function dereferenceRef<T>(value: T, definition?: OASDocument, seenRefs?: Set<string>): T {
  if (value === undefined) {
    return undefined as T;
  }

  if (isRef(value)) {
    if (!definition) {
      return value as T;
    }

    const ref = value.$ref;

    // If we've seen this $ref before, it's circular - return the original $ref to prevent infinite loops
    if (seenRefs?.has(ref)) {
      return value as T;
    }

    // Track this $ref as seen
    const localSeenRefs = seenRefs || new Set<string>();
    localSeenRefs.add(ref);

    try {
      const dereferenced = findRef(ref, definition);

      // If the dereferenced value is itself a $ref, recursively dereference it (but with seenRefs tracking)
      if (isRef(dereferenced)) {
        return dereferenceRef(dereferenced, definition, localSeenRefs) as T;
      }

      return dereferenced as T;
    } catch {
      // If dereferencing fails, return the original $ref
      return value as T;
    }
  }

  return value;
}
