import type { OperationObject, RequestBodyObject } from '../../types.js';
import type { MediaTypeExample } from './get-mediatype-examples.js';

import { getMediaTypeExamples } from './get-mediatype-examples.js';

export type RequestBodyExamples = {
  examples: MediaTypeExample[];
  mediaType: string;
}[];

/**
 * Retrieve a collection of request body examples, keyed by their media type.
 *
 * @param operation Operation to retrieve requestBody examples for.
 */
export function getRequestBodyExamples(operation: OperationObject): RequestBodyExamples {
  // `requestBody` will never have `$ref` pointers here so we need to work around the type that we
  // have from `OperationObject`.
  const requestBody = operation.requestBody as RequestBodyObject;
  if (!requestBody || !requestBody.content) {
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
    .filter(x => x !== false);
}
