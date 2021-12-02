import type * as RMOAS from '../rmoas.types';
import type { MediaTypeExample } from '../lib/get-mediatype-examples';

import { isRef } from '../rmoas.types';
import getMediaTypeExamples from '../lib/get-mediatype-examples';

export type ResponseExamples = Array<{
  status: string;
  mediaTypes: Record<string, RMOAS.MediaTypeObject>;
}>;

/**
 * @param operation Operation to retrieve response examples for.
 * @returns An object of response examples keyed by their media type.
 */
export default function getResponseExamples(operation: RMOAS.OperationObject) {
  return Object.keys(operation.responses || {})
    .map(status => {
      const response = operation.responses[status];

      // If we have a $ref here that means that this was a circular ref so we should ignore it.
      if (isRef(response)) {
        return false;
      }

      const mediaTypes: Record<string, Array<MediaTypeExample>> = {};
      (response.content ? Object.keys(response.content) : []).forEach(mediaType => {
        if (!mediaType) return;

        const mediaTypeObject = response.content[mediaType];
        const examples = getMediaTypeExamples(mediaType, mediaTypeObject, {
          includeReadOnly: true,
          includeWriteOnly: false,
        });

        if (examples) {
          mediaTypes[mediaType] = examples;
        }
      });

      if (!Object.keys(mediaTypes).length) {
        return false;
      }

      return {
        status,
        mediaTypes,
      };
    })
    .filter(Boolean) as ResponseExamples;
}
