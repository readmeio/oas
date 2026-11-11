import type { MediaTypeObject, OASDocument } from '../types.js';
import type * as OAS30 from '@scalar/openapi-types/3.0';
import type * as OAS31 from '@scalar/openapi-types/3.1';
import type * as OAS32 from '@scalar/openapi-types/3.2';

import { isRef } from '../types.js';

import { dereferenceRef } from './refs.js';

type MediaTypeSchema =
  | NonNullable<OAS30.MediaTypeObject['schema']>
  | NonNullable<OAS31.MediaTypeObject['schema']>
  | NonNullable<OAS32.MediaTypeObject['schema']>
  | NonNullable<OAS32.MediaTypeObject['itemSchema']>;

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

/**
 * Schema that describes a Media Type Object.
 *
 * `schema` describes the whole payload. OpenAPI 3.2 sequential media types (JSON Lines,
 * Server-Sent Events) describe each item with `itemSchema` when `schema` is absent. A present
 * `schema` wins, including a boolean schema, so `false` is not treated as missing.
 *
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#media-type-object}
 */
export function mediaTypeSchema(mediaType: MediaTypeObject): MediaTypeSchema | undefined {
  if ('schema' in mediaType && mediaType.schema !== undefined) {
    return mediaType.schema;
  }

  if ('itemSchema' in mediaType && mediaType.itemSchema !== undefined) {
    return mediaType.itemSchema;
  }

  return undefined;
}
