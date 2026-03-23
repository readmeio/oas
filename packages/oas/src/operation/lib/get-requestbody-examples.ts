import type { OASDocument, OperationObject } from '../../types.js';
import type { MediaTypeExample } from './get-mediatype-examples.js';

import { dereferenceRef } from '../../lib/refs.js';
import { isRef } from '../../types.js';
import { getMediaTypeExamples } from './get-mediatype-examples.js';

export interface RequestBodyExample {
  examples: MediaTypeExample[];
  mediaType: string;
}

/**
 * Retrieve a collection of request body examples, keyed by their media type.
 *
 * @param operation Operation to retrieve requestBody examples for.
 */
export function getRequestBodyExamples(operation: OperationObject, definition: OASDocument): RequestBodyExample[] {
  let requestBody = operation.requestBody;
  if (!requestBody) {
    return [];
  } else if (isRef(requestBody)) {
    requestBody = dereferenceRef(requestBody, definition);
  }

  // If this request body still can't be resolved then we shouldn't return anything because it's
  // either an invalid schema or a circular reference.
  if (!requestBody || isRef(requestBody) || !requestBody.content) {
    return [];
  }

  return Object.keys(requestBody.content || {})
    .map(mediaType => {
      const mediaTypeObject = requestBody.content[mediaType];
      const examples = getMediaTypeExamples(mediaType, mediaTypeObject, definition, {
        includeReadOnly: false,
        includeWriteOnly: true,
      });

      if (!examples.length) {
        return false;
      }

      return {
        mediaType,
        examples,
      };
    })
    .filter((item): item is RequestBodyExample => item !== false);
}
