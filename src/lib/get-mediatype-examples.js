const { sampleFromSchema } = require('../samples');
const matchesMimeType = require('./matches-mimetype');

/**
 * Extracts an array of examples from an OpenAPI Media Type Object. The example will either come from the `example`
 * property, the first item in an `examples` array, or if none of those are present it will generate an example based
 * off its schema.
 *
 * @link https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#mediaTypeObject
 * @param {string} mediaType
 * @param {object} mediaTypeObject
 * @param {object} opts Configuration for controlling `includeReadOnly` and `includeWriteOnly`.
 * @returns {array}
 */
module.exports = function getMediaTypeExamples(mediaType, mediaTypeObject, opts = {}) {
  if (mediaTypeObject.example) {
    return [
      {
        value: mediaTypeObject.example,
      },
    ];
  } else if (mediaTypeObject.examples) {
    const { examples } = mediaTypeObject;
    const multipleExamples = Object.keys(examples)
      .map(key => {
        let summary = key;
        let description;

        let example = examples[key];
        if (example !== null && typeof example === 'object') {
          if ('summary' in example) {
            summary = example.summary;
          }

          if ('description' in example) {
            description = example.description;
          }

          if ('value' in example) {
            // If we have a $ref here then it's a circular reference and we should ignore it.
            if (example.value !== null && typeof example.value === 'object' && '$ref' in example.value) {
              return false;
            }

            example = example.value;
          }
        }

        const ret = { summary, title: key, value: example };
        if (description) {
          ret.description = description;
        }

        return ret;
      })
      .filter(Boolean);

    // If we were able to grab examples from the `examples` property return them (`examples` can sometimes be an empty
    // object), otherwise we should try to generate some instead.
    if (multipleExamples.length) {
      return multipleExamples;
    }
  }

  if (mediaTypeObject.schema) {
    // We do not fully support XML so we shouldn't generate XML samples for XML schemas.
    if (!matchesMimeType.xml(mediaType)) {
      return [
        {
          value: sampleFromSchema(JSON.parse(JSON.stringify(mediaTypeObject.schema)), opts),
        },
      ];
    }
  }

  return [];
};
