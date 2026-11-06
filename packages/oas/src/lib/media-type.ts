import type { MediaTypeObject, OASDocument } from '../types.js';

import { isRef } from '../types.js';

import { dereferenceRef } from './refs.js';

/**
 * Resolve a `content` map entry to a Media Type Object. OpenAPI 3.2 allows each entry to be a
 * Media Type Object or a `$ref`, including refs into `components.mediaTypes`. Entries that are
 * not objects, or `$ref`s that do not resolve, are dropped.
 *
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#media-type-object}
 */
export function resolveMediaType(entry: unknown, definition: OASDocument): MediaTypeObject | undefined {
  if (!entry || typeof entry !== 'object') {
    return undefined;
  }

  const resolved = isRef(entry) ? dereferenceRef(entry, definition) : entry;
  if (!resolved || typeof resolved !== 'object' || isRef(resolved)) {
    return undefined;
  }

  return resolved as MediaTypeObject;
}
