const getMediaTypeExamples = require('../lib/get-mediatype-examples');

/**
 * @param operation Operation to retrieve requestBody examples for.
 * @returns Array<{mediaType: MediaTypeObject, examples: Array<unknown>}>
 */
module.exports = operation => {
  if (!operation.requestBody || !operation.requestBody.content) {
    return [];
  }

  return Object.keys(operation.requestBody.content || {})
    .map(mediaType => {
      const mediaTypeObject = operation.requestBody.content[mediaType];
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
    .filter(Boolean);
};
