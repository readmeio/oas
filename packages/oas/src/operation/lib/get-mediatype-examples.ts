import type { MediaTypeObject } from '../../types.js';

import matchesMimeType from '../../lib/matches-mimetype.js';
import sampleFromSchema from '../../samples/index.js';

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
    return [
      {
        value: mediaTypeObject.example,
      },
    ];
  } else if (mediaTypeObject.examples) {
    const { examples } = mediaTypeObject;
    const multipleExamples = Object.keys(examples)
      .map(key => {
        let summary = key;
        let description: string;

        let example = examples[key];
        if (example !== null && typeof example === 'object') {
          if ('summary' in example) {
            summary = example.summary;
          }

          if ('description' in example) {
            description = example.description;
          }

          if ('value' in example) {
            // If we have a $ref here then it's a circular reference and we should ignore it.
            if (example.value !== null && typeof example.value === 'object' && '$ref' in example.value) {
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
      .filter(Boolean) as MediaTypeExample[];

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
          value: sampleFromSchema(JSON.parse(JSON.stringify(mediaTypeObject.schema)), opts),
        },
      ];
    }
  }

  return [];
}
