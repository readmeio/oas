const { sampleFromSchema } = require('../samples');
const cleanStringify = require('./json-stringify-clean');

module.exports = {
  /**
   * Extracts an example from an OAS Media Type Object. The example will either come from the `example` property, the
   * first item in an `examples` array, or if none of those are present it will generate an example based off its schema.
   *
   * @link https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#mediaTypeObject
   * @param {object} mediaType
   * @returns {(object|false)}
   */
  getMediaTypeExample: mediaType => {
    if (mediaType.example) {
      return mediaType.example;
    } else if (mediaType.examples) {
      const examples = Object.keys(mediaType.examples);
      if (examples.length) {
        if (examples.length > 1) {
          // Since we're trying to return a single example with this method, but have multiple present,
          // return `false` so `getMultipleExamples` will pick up this response instead later.
          return false;
        }

        let example = examples[0];
        example = mediaType.examples[example];
        if (example !== null && typeof example === 'object') {
          if ('value' in example) {
            // If we have a $ref here then it's a circular schema and we should ignore it.
            if (typeof example.value === 'object' && '$ref' in example.value) {
              return false;
            }

            return example.value;
          }
        }

        return example;
      }
    }

    if (mediaType.schema) {
      return sampleFromSchema(mediaType.schema);
    }

    return false;
  },

  /**
   * Extracts an array of examples from the `examples` property on an OAS Media Type Object.
   *
   * @link https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#mediaTypeObject
   * @param {object} mediaType
   * @returns {(object|false)}
   */
  getMediaTypeExamples: mediaType => {
    if (!mediaType.examples || mediaType.example) return false;

    const { examples } = mediaType;
    const multipleExamples = Object.keys(examples).map(key => {
      let example = examples[key];
      if (example !== null && typeof example === 'object') {
        if ('value' in example) {
          // If we have a $ref here then it's a circular reference and we should ignore it.
          if (typeof example.value === 'object' && '$ref' in example.value) {
            example = undefined;
          } else {
            example = example.value;
          }
        }

        example = cleanStringify(example);
      }

      return {
        label: key,
        code: example,
      };
    });

    return multipleExamples.length > 0 ? multipleExamples : false;
  },
};
