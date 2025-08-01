import type { OperationObject } from '../../types.js';
import type { MediaTypeExample } from './get-mediatype-examples.js';

import { isRef } from '../../types.js';
import { getMediaTypeExamples } from './get-mediatype-examples.js';

export type ResponseExamples = {
  mediaTypes: Record<string, MediaTypeExample[]>;
  onlyHeaders?: boolean;
  status: string;
}[];

/**
 * Retrieve a collection of response examples keyed, by their media type.
 *
 * @param operation Operation to retrieve response examples for.
 */
export function getResponseExamples(operation: OperationObject) {
  return Object.keys(operation.responses || {})
    .map(status => {
      const response = operation.responses[status];
      let onlyHeaders = false;

      // If we have a $ref here that means that this was a circular ref so we should ignore it.
      if (isRef(response)) {
        return false;
      }

      const mediaTypes: Record<string, MediaTypeExample[]> = {};
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

      // If the response has no content, but has headers, hardcode an empty example so the headers
      // modal will still display
      if (response.headers && Object.keys(response.headers).length && !Object.keys(mediaTypes).length) {
        mediaTypes['*/*'] = [];
        onlyHeaders = true;
      }

      if (!Object.keys(mediaTypes).length) {
        return false;
      }

      return {
        status,
        mediaTypes,
        ...(onlyHeaders ? { onlyHeaders } : {}),
      };
    })
    .filter(Boolean) as ResponseExamples;
}
