const { getMediaTypeExample, getMediaTypeExamples } = require('../lib/get-mediatype-examples');
const cleanStringify = require('../lib/json-stringify-clean');

/**
 * @param {object} response
 */
function getMediaTypes(response) {
  return response.content ? Object.keys(response.content) : [];
}

/**
 * Construct an object for a media type and any examples that its Media Type Object might hold.
 *
 * This code is identical to `get-requestbody-examples` except that this returns the media type as `language` instead of
 * `mediaType`. It is doing this for legacy reasons.
 *
 * @link https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#mediaTypeObject
 * @param {string} mediaType
 * @param {object} mediaTypeObject
 * @param {(object|false)} example
 * @returns {(object|false)}
 */
function constructMediaType(mediaType, mediaTypeObject, example) {
  const multipleExamples = getMediaTypeExamples(mediaTypeObject);
  if (!example && !multipleExamples) {
    return false;
  }

  return {
    language: mediaType,
    code: example !== null && typeof example === 'object' ? cleanStringify(example) : example,
    multipleExamples: !example ? multipleExamples : false,
  };
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

      const mediaTypes = [];

      getMediaTypes(response).forEach(mediaType => {
        if (!mediaType) return false;

        const mediaTypeObject = response.content[mediaType];
        const example = mediaTypeObject.code || getMediaTypeExample(mediaType, mediaTypeObject);
        const cmt = constructMediaType(mediaType, mediaTypeObject, example);
        if (cmt) {
          mediaTypes.push(cmt);
        }

        return true;
      });

      return {
        status,

        // This should return a `mediaTypes` array instead of `languages`, but since `response.language` is integrated
        // into our legacy manual editor, we'll leave this alone for now.
        // @todo
        languages: mediaTypes,
      };
    })
    .filter(Boolean);
};
