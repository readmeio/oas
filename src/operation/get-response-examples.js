const getMediaTypeExamples = require('../lib/get-mediatype-examples');

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
      (response.content ? Object.keys(response.content) : []).forEach(mediaType => {
        if (!mediaType) return;

        const mediaTypeObject = response.content[mediaType];
        mediaTypes[mediaType] = getMediaTypeExamples(mediaType, mediaTypeObject, {
          includeReadOnly: true,
          includeWriteOnly: false,
        });
      });

      if (!Object.keys(mediaTypes).length) {
        return false;
      }

      return {
        status,
        mediaTypes,
      };
    })
    .filter(Boolean);
};
