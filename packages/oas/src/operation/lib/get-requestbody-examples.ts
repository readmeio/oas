import type { OperationObject } from '../../types.js';
import type { MediaTypeExample } from './get-mediatype-examples.js';

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
export function getRequestBodyExamples(operation: OperationObject): RequestBodyExample[] {
  const requestBody = operation.requestBody;
  if (!requestBody || isRef(requestBody) || !requestBody.content) {
    /** @todo add support for `ReferenceObject` */
    return [];
  }

  return Object.keys(requestBody.content || {})
    .map(mediaType => {
      const mediaTypeObject = requestBody.content[mediaType];
      const examples = getMediaTypeExamples(mediaType, mediaTypeObject, {
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
