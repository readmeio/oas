const getSchema = require('./get-schema');
const findSchemaDefinition = require('./find-schema-definition');

// https://github.com/OAI/OpenAPI-Specification/blob/4875e02d97048d030de3060185471b9f9443296c/versions/3.0.md#parameterObject
const types = {
  path: 'Path Params',
  query: 'Query Params',
  body: 'Body Params',
  cookie: 'Cookie Params',
  formData: 'Form Data',
  header: 'Headers',
};

function getBodyParam(pathOperation, oas) {
  const schema = getSchema(pathOperation, oas);

  if (!schema) return null;

  const type = schema.type === 'application/x-www-form-urlencoded' ? 'formData' : 'body';

  return {
    type,
    label: types[type],
    schema: oas.components
      ? { definitions: { components: oas.components }, ...schema.schema }
      : schema.schema,
  };
}

function hasCommonParameters(pathOperation) {
  const { path } = pathOperation || {};
  const commonParams = ((((pathOperation || {}).oas || {}).paths || {})[path] || {}).parameters;
  return !!(commonParams && commonParams.length !== 0);
}

function getOtherParams(pathOperation, oas) {
  let pathParameters = pathOperation.parameters || [];

  if (hasCommonParameters(pathOperation)) {
    const { path } = pathOperation;
    const commonParams = pathOperation.oas.paths[path].parameters;
    const commonParamsNotInParams = commonParams.filter(
      param => !pathParameters.find(param2 => param2.name === param.name && param2.in === param.in),
    );

    pathParameters = pathParameters.concat(commonParamsNotInParams || []);
  }

  const resolvedParameters = pathParameters.map(param => {
    if (param.$ref) return findSchemaDefinition(param.$ref, oas);
    return param;
  });

  return Object.keys(types).map(type => {
    const required = [];

    const parameters = resolvedParameters.filter(param => param.in === type);
    if (parameters.length === 0) {
      return null;
    }

    const properties = parameters.reduce((prev, current) => {
      const schema = { type: 'string' };

      if (current.description) {
        schema.description = current.description;
      }

      if (current.schema) {
        if (current.schema.type === 'array') {
          schema.type = 'array';

          if (
            Object.keys(current.schema.items).length === 1 &&
            typeof current.schema.items.$ref !== 'undefined'
          ) {
            schema.items = findSchemaDefinition(current.schema.items.$ref, oas);
          } else {
            schema.items = current.schema.items;
          }
        }

        if (typeof current.schema.default !== 'undefined') schema.default = current.schema.default;
        if (current.schema.enum) schema.enum = current.schema.enum;
        if (current.schema.type) schema.type = current.schema.type;
        if (current.schema.format) schema.format = current.schema.format;
      }

      prev[current.name] = schema;

      if (current.required) {
        required.push(current.name);
      }

      return prev;
    }, {});

    return {
      type,
      label: types[type],
      schema: {
        type: 'object',
        properties,
        required,
      },
    };
  });
}

module.exports = (pathOperation, oas) => {
  const hasRequestBody = !!pathOperation.requestBody;
  const hasParameters = !!(pathOperation.parameters && pathOperation.parameters.length !== 0);
  if (!hasParameters && !hasRequestBody && !hasCommonParameters(pathOperation)) return null;

  return [getBodyParam(pathOperation, oas)]
    .concat(...getOtherParams(pathOperation, oas))
    .filter(Boolean);
};

// Exported for use in oas-to-har for default values object
module.exports.types = types;
