const { getMediaTypeExample, getMediaTypeExamples } = require('../lib/get-mediatype-examples');
const cleanStringify = require('../lib/json-stringify-clean');

/**
 * Construct an object for a media type and any examples that its Media Type Object might hold.
 *
 * This code is identical to `get-response-examples` except that this returns the media type as `mediaType` instead of
 * `language`.
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
    mediaType,
    code: example !== null && typeof example === 'object' ? cleanStringify(example) : example,
    multipleExamples: !example ? multipleExamples : false,
  };
}

/**
 * @param {object} operation
 */
module.exports = operation => {
  if (!operation.requestBody || !operation.requestBody.content) {
    return [];
  }

  return Object.keys(operation.requestBody.content || {})
    .map(mediaType => {
      const mediaTypeObject = operation.requestBody.content[mediaType];
      const example = getMediaTypeExample(mediaType, mediaTypeObject);

      return constructMediaType(mediaType, mediaTypeObject, example);
    })
    .filter(Boolean);
};
