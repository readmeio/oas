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
 * Within an `examples` entry the OpenAPI 3.2 `dataValue` and `serializedValue` fields are
 * supported alongside `value`, with `value` taking precedence over `dataValue`, which in turn
 * takes precedence over `serializedValue`. `serializedValue` is returned as the string that it
 * was defined as.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#media-type-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#media-type-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.2.0.md#media-type-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.2.0.md#example-object}
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
        let value: unknown = example;
        if (example !== null && typeof example === 'object') {
          if (isRef(example)) {
            example = dereferenceRef(example, definition);
            if (!example || isRef(example)) {
              return false;
            }

            value = example;
          }

          if ('summary' in example) {
            summary = example.summary;
          }

          if ('description' in example) {
            description = example.description;
          }

          if ('value' in example || 'dataValue' in example) {
            const exampleValues = example as { dataValue?: unknown; value?: unknown };
            const valueKey = 'value' in exampleValues ? 'value' : 'dataValue';
            exampleValues[valueKey] = dereferenceRefDeep(exampleValues[valueKey], definition);
            value = exampleValues[valueKey];

            // If there is no example value or if it contains any `$ref` pointers that we couldn't
            // resolve then we shouldn't return anything because to the user it'll look like we
            // generated an invalid example.
            if (value === undefined || collectRefsInSchema(value).size > 0) {
              return false;
            }
          } else if ('serializedValue' in example) {
            value = example.serializedValue;
          }
        }

        const ret: MediaTypeExample = { summary, title: key, value };
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

  // OpenAPI 3.2 sequential media types (eg. JSON Lines or Server-Sent Events) describe each item
  // in their stream with `itemSchema` instead of `schema`, so when there's no `schema` we generate
  // an example of a single item.
  const schema = mediaTypeObject.schema || ('itemSchema' in mediaTypeObject ? mediaTypeObject.itemSchema : undefined);
  if (schema) {
    // We do not fully support XML so we shouldn't generate XML samples for XML schemas.
    if (!matchesMimeType.xml(mediaType)) {
      return [
        {
          value: sampleFromSchema(structuredClone(schema), {
            ...opts,
            definition,
          }),
        },
      ];
    }
  }

  return [];
}
