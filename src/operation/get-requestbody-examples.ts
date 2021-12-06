import type * as RMOAS from '../rmoas.types';
import getMediaTypeExamples from '../lib/get-mediatype-examples';

export type RequestBodyExamples = Array<{
  mediaType: string;
  examples: any;
}>;

/**
 * @param operation Operation to retrieve requestBody examples for.
 * @returns An object of response examples keyed by their media type.
 */
export default function getRequestBodyExamples(operation: RMOAS.OperationObject) {
  // `requestBody` will never have `$ref` pointers here so we need to work around the type that we have from
  // `RMOAS.OperationObject`.
  const requestBody = operation.requestBody as RMOAS.RequestBodyObject;
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
    .filter(Boolean) as RequestBodyExamples;
}
