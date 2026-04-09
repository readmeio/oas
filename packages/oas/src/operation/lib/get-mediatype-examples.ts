import type { MediaTypeObject, OASDocument } from '../../types.js';

import matchesMimeType from '../../lib/matches-mimetype.js';
import { collectRefsInSchema, dereferenceRef, dereferenceRefDeep } from '../../lib/refs.js';
import sampleFromSchema from '../../samples/index.js';
import { isRef } from '../../types.js';

export interface MediaTypeExample {
  description?: string;
  summary?: string;
  title?: string;
  value: unknown;
}

/**
 * Extracts a collection of examples from an OpenAPI Media Type Object. The example will either
 * come from the `example` property, the first item in an `examples` array, or if none of those are
 * present it will generate an example based off its schema.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#media-type-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#media-type-object}
 * @param mediaType The media type that we're looking for examples for.
 * @param mediaTypeObject The media type object that we're looking for examples for.
 */
export function getMediaTypeExamples(
  mediaType: string,
  mediaTypeObject: MediaTypeObject,
  definition: OASDocument,
  opts: {
    /**
     * If you wish to include data that's flagged as `readOnly`.
     */
    includeReadOnly?: boolean;

    /**
     * If you wish to include data that's flatted as `writeOnly`.
     */
    includeWriteOnly?: boolean;
  } = {},
): MediaTypeExample[] {
  if (mediaTypeObject.example) {
    mediaTypeObject.example = dereferenceRefDeep(mediaTypeObject.example, definition);

    // If there is no example or if it contains any `$ref` pointers that we couldn't resolve then
    // we shouldn't return anything because to the user it'll look like we generated an invalid
    // example.
    if (mediaTypeObject.example === undefined || collectRefsInSchema(mediaTypeObject.example).size > 0) {
      return [];
    }

    return [
      {
        value: mediaTypeObject.example,
      },
    ];
  } else if (mediaTypeObject.examples) {
    const { examples } = mediaTypeObject;
    const multipleExamples = Object.keys(examples)
      .map(key => {
        let summary: string | undefined = key;
        let description: string | undefined;

        let example = examples[key];
        if (example !== null && typeof example === 'object') {
          if (isRef(example)) {
            example = dereferenceRef(example, definition);
            if (!example || isRef(example)) {
              return false;
            }
          }

          if ('summary' in example) {
            summary = example.summary;
          }

          if ('description' in example) {
            description = example.description;
          }

          if ('value' in example) {
            example.value = dereferenceRefDeep(example.value, definition);

            // If there is no example value or if it contains any `$ref` pointers that we couldn't
            // resolve then we shouldn't return anything because to the user it'll look like we
            // generated an invalid example.
            if (example.value === undefined || collectRefsInSchema(example.value).size > 0) {
              return false;
            }

            example = example.value;
          }
        }

        const ret: MediaTypeExample = { summary, title: key, value: example };
        if (description) {
          ret.description = description;
        }

        return ret;
      })
      .filter((item): item is MediaTypeExample => item !== false);

    // If we were able to grab examples from the `examples` property return them (`examples` can
    // sometimes be an empty object), otherwise we should try to generate some instead.
    if (multipleExamples.length) {
      return multipleExamples;
    }
  }

  if (mediaTypeObject.schema) {
    // We do not fully support XML so we shouldn't generate XML samples for XML schemas.
    if (!matchesMimeType.xml(mediaType)) {
      return [
        {
          value: sampleFromSchema(structuredClone(mediaTypeObject.schema), {
            ...opts,
            definition,
          }),
        },
      ];
    }
  }

  return [];
}
