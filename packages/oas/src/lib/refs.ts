import type { ParserOptions } from '@readme/openapi-parser';
import type { OASDocument, SchemaObject } from '../types.js';

import jsonpointer from 'jsonpointer';

import { isRef } from '../types.js';
import { isPrimitive } from './helpers.js';

/**
 * Decorate component schemas within the API definition with a `x-readme-ref-name` property so we
 * can retin their original schema names during dereferencing or `$ref` resolution operations.
 *
 */
export function decorateComponentSchemasWithRefName(api: OASDocument): void {
  if (!api?.components?.schemas || typeof api.components.schemas !== 'object') {
    return;
  }

  Object.keys(api.components.schemas).forEach(schemaName => {
    // As of OpenAPI 3.1 component schemas can be primitives or arrays. If this happens then we
    // shouldn't try to add `x-readme-ref-name` properties because we can't. We'll have some data
    // loss on these schemas but as they aren't objects they likely won't be used in ways that
    // would require needing a `title` or `x-readme-ref-name` anyways.
    if (
      isPrimitive(api.components?.schemas?.[schemaName]) ||
      Array.isArray(api.components?.schemas?.[schemaName]) ||
      api.components?.schemas?.[schemaName] === null
    ) {
      return;
    }

    (api.components?.schemas?.[schemaName] as SchemaObject)['x-readme-ref-name'] = schemaName;
  });
}

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
export function dereferenceRef<T>(
  value: T,
  definition?: OASDocument | SchemaObject,
  seenRefs: Set<string> = new Set<string>(),
): T {
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
    if (seenRefs.has(ref)) {
      return value as T;
    }

    // Track this `$ref` as having been seen so we can avoid infinitely processing circular
    // references.
    seenRefs.add(ref);

    try {
      const dereferenced = findRef(ref, definition);

      // If the dereferenced value is itself a `$ref` then recursively dereference it (but with
      // `seenRefs` tracking).
      if (isRef(dereferenced)) {
        return dereferenceRef(dereferenced, definition, seenRefs) as T;
      }

      return {
        ...dereferenced,
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

/**
 * Recursively collect all `$ref` pointers in a schema.
 *
 */
export function collectRefsInSchema(schema: unknown): Set<string> {
  const refs = new Set<string>();
  if (!schema || typeof schema !== 'object') return refs;
  const obj = schema as Record<string, unknown>;
  if (isRef(obj)) {
    refs.add(obj.$ref);
  }

  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        for (const r of collectRefsInSchema(item)) refs.add(r);
      }
    } else if (value && typeof value === 'object') {
      for (const r of collectRefsInSchema(value)) refs.add(r);
    }
  }

  return refs;
}

/**
 * Given a set of `$ref` pointers and a full set of schema objects, mapped to their reference
 * locations, return only the schemas that are transitively referenced from those schemas.
 *
 */
export function filterRequiredRefsToReferenced(
  requiredRefs: Set<string>,
  usedSchemas: Map<string, SchemaObject>,
): Map<string, SchemaObject> {
  const referenced = new Set(requiredRefs);

  let prevSize = 0;
  while (referenced.size > prevSize) {
    prevSize = referenced.size;
    for (const ref of referenced) {
      const schema = usedSchemas.get(ref);
      if (schema) {
        for (const r of collectRefsInSchema(schema)) {
          referenced.add(r);
        }
      }
    }
  }

  const filtered = new Map<string, SchemaObject>();
  for (const ref of referenced) {
    const s = usedSchemas.get(ref);
    if (s !== undefined) {
      filtered.set(ref, s);
    }
  }

  return filtered;
}

/**
 * Parse a `$ref` pointers (e.g. `#/x-definitions/MySchema` or `#/components/schemas/Foo`) into
 * path segments. Returns `null` if the first segment is reserved (we should not embed at root
 * under that key).
 *
 */
function getRefPathSegments(ref: string): string[] | null {
  if (!ref.startsWith('#/')) return null;
  const path = ref
    .slice(2)
    .split('/')
    .map(seg => {
      // We need to decode these segments twice because the first decode is to decode encoded JSON
      // pointer segments, and the second is to decode any URI-encoded segments.
      return decodeURIComponent(decodePointer(seg));
    });

  if (path.length < 2) {
    // We need at least two pieces of a `$ref` for it to be valid. e.g. `#/x-definitions/MySchema`
    // or `#/components/schemas/Foo`.
    return null;
  }

  return path;
}

/**
 * Merge referenced schemas into the root schema at the paths defined by their reference location.
 *
 * @example `#/components/schemas/MySchema` -> `root.components.schemas.MySchema`
 */
export function mergeReferencedSchemasIntoRoot(root: SchemaObject, refToSchema: Map<string, unknown>): void {
  for (const [ref, schema] of refToSchema) {
    const segments = getRefPathSegments(ref);
    if (!segments || segments.length === 0) {
      continue;
    }

    let current: SchemaObject = root;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      let next = current[seg as keyof SchemaObject];
      if (!next || typeof next !== 'object' || Array.isArray(next)) {
        next = {};
        current[seg as keyof SchemaObject] = next;
      }

      current = next as Record<string, unknown>;
    }

    current[segments[segments.length - 1] as keyof SchemaObject] = schema;
  }
}
