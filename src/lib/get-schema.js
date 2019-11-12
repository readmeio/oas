const findSchemaDefinition = require('./find-schema-definition');

// Gets the schema of the first media type defined in the `content` of the path operation
// or returns the ref if there's no Request Body Object
// If the ref looks like a `requestBodies` reference, then do a lookup for the actual schema
// https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#fixed-fields-8
module.exports = function getSchema(pathOperation, oas) {
  try {
    if (pathOperation.requestBody.content) {
      const type = Object.keys(pathOperation.requestBody.content)[0];
      return { type, schema: pathOperation.requestBody.content[type].schema };
    }

    if (
      pathOperation.requestBody &&
      pathOperation.requestBody.$ref.match(/^#\/components\/requestBodies\/.*$/)
    ) {
      return getSchema({ requestBody: findSchemaDefinition(pathOperation.requestBody.$ref, oas) });
    }

    return { type: 'application/json', schema: pathOperation.requestBody };
  } catch (e) {} // eslint-disable-line no-empty

  return undefined;
};
