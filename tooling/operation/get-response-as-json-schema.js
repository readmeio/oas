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
    if (headers[key]?.schema) {
      // TODO: Response headers are essentially parameters in OAS
      //    This means they can have content instead of schema.
      //    We should probably support that in the future
      headersSchema.properties[key] = headers[key].schema;
    }
  });

  const headersWrapper = {
    schema: headersSchema,
    type: 'object',
    label: 'Headers',
  };

  if (response.description) {
    headersWrapper.description = response.description;
  }

  return headersWrapper;
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

  // TODO: This lookup should be in the operation
  if (response.content?.['application/json'].schema) {
    const actualSchema = response?.content?.['application/json'].schema;
    const builtSchema = {
      // shallow copy so that the upcoming components addition doesn't pass to other uses of this schema
      schema: { ...actualSchema },
      type: actualSchema.type,
      label: 'Response body',
    };

    if (response.description) {
      builtSchema.description = response.description;
    }

    // Components are included so we can identify the names of refs
    //    Also so we can do a lookup if we end up with a $ref
    if (oas.components) {
      builtSchema.schema.components = oas.components;
    }

    jsonSchema.push(builtSchema);
  }

  // 3.0.3 and earlier headers. TODO: New format for 3.1.0
  if (response.headers) {
    jsonSchema.push(buildHeadersSchema(response));
  }

  return jsonSchema.length ? jsonSchema : null;
};
