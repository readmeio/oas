const $RefParser = require('@apidevtools/json-schema-ref-parser');
const { sampleFromSchema } = require('../samples');

/**
 * @param {object} response
 */
function getMediaTypes(response) {
  return response.content ? Object.keys(response.content) : [];
}

/**
 * @param {object} response
 * @param {string} mediaType
 */
function getExample(response, mediaType) {
  if (response.content[mediaType].example) {
    // According to the OAS spec, the singular `example` keyword does **not** support `$ref` pointers.
    // https://swagger.io/docs/specification/adding-examples/

    return response.content[mediaType].example;
  } else if (response.content[mediaType].examples) {
    // This isn't actually something that's defined in the spec. Do we really need to support this?
    const customResponse = response.content[mediaType].examples.response;
    if (customResponse) {
      // If we have a $ref here then it's a circular reference and we should ignore it.
      if (customResponse.value.$ref) {
        return false;
      }

      return customResponse.value;
    }

    const examples = Object.keys(response.content[mediaType].examples);
    if (examples.length) {
      if (examples.length > 1) {
        // Since we're trying to return a single example with this method, but have multiple present,
        // return `false` so `getMultipleExamples` will pick up this response instead later.
        return false;
      }

      let example = examples[0];
      example = response.content[mediaType].examples[example];
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

  if (response.content[mediaType].schema) {
    return sampleFromSchema(response.content[mediaType].schema);
  }

  return false;
}

/**
 * @param {object} response
 * @param {string} mediaType
 */
function getMultipleExamples(response, mediaType) {
  if (!response.content[mediaType].examples || response.content[mediaType].examples.response) return false;

  const { examples } = response.content[mediaType];
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

      example = JSON.stringify(example, undefined, 2);
    }

    return {
      label: key,
      code: example,
    };
  });

  return multipleExamples.length > 0 ? multipleExamples : false;
}

function constructMediaType(mediaType, response, example) {
  const multipleExamples = getMultipleExamples(response, mediaType);
  if (!example && !multipleExamples) {
    return false;
  }

  return {
    language: mediaType,
    code: example !== null && typeof example === 'object' ? JSON.stringify(example, undefined, 2) : example,
    multipleExamples: !example ? multipleExamples : false,
  };
}

/**
 * @param {Operation} op
 * @param {Oas} oas
 */
module.exports = async (operation, oas) => {
  // We should replace this with `swagger-client` and its `.resolve()` method as it can better handle circular
  // references.
  //
  // For example, with a particular schema that's circular `json-schema-ref-parser` generates the following:
  //
  // {
  //   dateTime: '2020-11-03T00:09:55.361Z',
  //   offsetAfter: undefined,
  //   offsetBefore: undefined
  // }
  //
  // But `swagger-client` does this:
  //
  // {
  //   dateTime: '2020-11-03T00:09:44.920Z',
  //   offsetAfter: { id: 'string', rules: { transitions: [ undefined ] } },
  //   offsetBefore: { id: 'string', rules: { transitions: [ undefined ] } }
  // }
  const schema = await $RefParser.dereference(
    { ...operation, components: oas.components },
    {
      resolve: {
        // We shouldn't be resolving external pointers at this point so just ignore them.
        external: false,
      },
      dereference: {
        // If circular `$refs` are ignored they'll remain in `derefSchema` as `$ref: String`, otherwise `$ref‘ just
        // won't exist. This allows us to do easy circular reference detection.
        circular: 'ignore',
      },
    }
  );

  return Object.keys(schema.responses || {})
    .map(status => {
      const response = schema.responses[status];

      // If we have a $ref here that means that this was a circular ref so we should ignore it.
      if (response.$ref) {
        // response = findSchemaDefinition(response.$ref, oas);
        return false;
      }

      const mediaTypes = [];

      getMediaTypes(response).forEach(mediaType => {
        if (!mediaType) return false;

        const langResponse = response.content[mediaType];
        const example = langResponse.code || getExample(response, mediaType);
        const cmt = constructMediaType(mediaType, response, example);
        if (cmt) {
          mediaTypes.push(cmt);
        }

        return true;
      });

      // If we don't have any languages or media types to show here, don't bother return anything.
      if (mediaTypes.length === 0) return false;

      return {
        status,

        // This should return a mediaTypes object instead of `languages`, but since `response.language` is integrated
        // into our legacy manual editor, we'll leave this alone for now.
        // @todo
        languages: mediaTypes,
      };
    })
    .filter(Boolean);
};
