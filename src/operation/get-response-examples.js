const { getMediaTypeExample, getMediaTypeExamples } = require('../lib/get-mediatype-examples');

/**
 * @param {object} response
 */
function getMediaTypes(response) {
  return response.content ? Object.keys(response.content) : [];
}

/**
 * Construct an object for a media type and any examples that its Media Type Object might hold.
 *
 * @link https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#mediaTypeObject
 * @param {string} mediaType
 * @param {object} mediaTypeObject
 * @returns {(object|false)}
 */
function constructExamples(mediaType, mediaTypeObject) {
  let examples = [];

  const example = getMediaTypeExample(mediaType, mediaTypeObject, {
    includeReadOnly: true,
    includeWriteOnly: false,
  });

  if (example) {
    examples.push({
      value: example,
    });
  } else {
    examples = getMediaTypeExamples(mediaTypeObject);
    if (!examples) {
      return false;
    }
  }

  return examples;
}

/**
 * @param {object} operation
 */
module.exports = operation => {
  return Object.keys(operation.responses || {})
    .map(status => {
      const response = operation.responses[status];

      // If we have a $ref here that means that this was a circular ref so we should ignore it.
      if (response.$ref) {
        return false;
      }

      const mediaTypes = {};

      getMediaTypes(response).forEach(mediaType => {
        if (!mediaType) return;

        const mediaTypeObject = response.content[mediaType];
        const examples = constructExamples(mediaType, mediaTypeObject);
        if (examples) {
          mediaTypes[mediaType] = examples;
        }
      });

      return {
        status,
        mediaTypes,
      };
    })
    .filter(Boolean);
};
