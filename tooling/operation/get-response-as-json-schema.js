const { constructSchema } = require('./get-parameters-as-json-schema');
const { json } = require('../lib/matches-mimetype');
/**
 * Turn a header map from oas 3.0.3 (and some earlier versions too) into a
 *  schema. Does not cover 3.1.0's header format
 * @param {object} response
 * @returns object
 */
function buildHeadersSchema(response) {
  const headers = response.headers;

  const headersSchema = {
    type: 'object',
    properties: {},
  };

  Object.keys(headers).forEach(key => {
    if (headers[key] && headers[key].schema) {
      // TODO: Response headers are essentially parameters in OAS
      //    This means they can have content instead of schema.
      //    We should probably support that in the future
      headersSchema.properties[key] = constructSchema(headers[key].schema);
    }
  });

  const headersWrapper = {
    schema: headersSchema,
    type: 'object',
    label: 'Headers',
  };

  if (response.description && headersWrapper.schema) {
    headersWrapper.description = response.description;
  }

  return headersWrapper;
}

function getPreferredSchema(content) {
  if (!content) {
    return null;
  }

  const contentTypes = Object.keys(content);

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < contentTypes.length; i++) {
    if (json(contentTypes[i])) {
      return constructSchema(content[contentTypes[i]].schema);
    }
  }

  return null;
}

/**
 * Extract all the response schemas, matching the format of get-parameters-as-json-schema.
 *
 * Note: This expects a dereferenced schema.
 *
 * @param {Operation} operation
 * @param {Oas} oas
 * @param {String} statusCode
 * @returns Array<{schema: Object, type: string, label: string}>
 */
module.exports = function getResponseAsJsonSchema(operation, oas, statusCode) {
  const response = operation.getResponseByStatusCode(statusCode);
  const jsonSchema = [];

  if (!response) {
    return null;
  }

  const foundSchema = getPreferredSchema(response.content);
  if (foundSchema) {
    const schemaWrapper = {
      // shallow copy so that the upcoming components addition doesn't pass to other uses of this schema
      schema: { ...foundSchema },
      type: foundSchema.type,
      label: 'Response body',
    };

    if (response.description && schemaWrapper.schema) {
      schemaWrapper.description = response.description;
    }

    // Components are included so we can identify the names of refs
    //    Also so we can do a lookup if we end up with a $ref
    if (oas.components && schemaWrapper.schema) {
      schemaWrapper.schema.components = oas.components;
    }

    jsonSchema.push(schemaWrapper);
  }

  // 3.0.3 and earlier headers. TODO: New format for 3.1.0
  if (response.headers) {
    jsonSchema.push(buildHeadersSchema(response));
  }

  return jsonSchema.length ? jsonSchema : null;
};
