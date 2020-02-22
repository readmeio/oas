const getSchema = require('./get-schema');
const findSchemaDefinition = require('./find-schema-definition');

// The order of this object determines how they will be sorted in the compiled JSON Schema
// representation.
// https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#parameterObject
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
    schema: oas.components ? { definitions: { components: oas.components }, ...schema.schema } : schema.schema,
  };
}

function getCommonParams(pathOperation) {
  const { path } = pathOperation || {};
  if (pathOperation && 'oas' in pathOperation && 'paths' in pathOperation.oas && path in pathOperation.oas.paths) {
    if ('parameters' in pathOperation.oas.paths[path]) {
      return pathOperation.oas.paths[path].parameters;
    }
  }

  return [];
}

function getOtherParams(pathOperation, oas) {
  let pathParameters = pathOperation.parameters || [];
  const commonParams = getCommonParams(pathOperation);

  if (commonParams.length !== 0) {
    const commonParamsNotInParams = commonParams.filter(
      param => !pathParameters.find(param2 => param2.name === param.name && param2.in === param.in)
    );

    pathParameters = pathParameters.concat(commonParamsNotInParams || []);
  }

  const resolvedParameters = pathParameters.map(param => {
    if (param.$ref) return findSchemaDefinition(param.$ref, oas);
    return param;
  });

  const constructSchema = data => {
    const schema = {};

    if (data.type === 'array') {
      schema.type = 'array';

      if (Object.keys(data.items).length === 1 && typeof data.items.$ref !== 'undefined') {
        schema.items = findSchemaDefinition(data.items.$ref, oas);
      } else {
        schema.items = data.items;
      }

      // Run through the array items and clean them up.
      schema.items = constructSchema(schema.items);

      // Only add a default if we actually have one.
      if (typeof schema.items.default !== 'undefined' && schema.items.default === '') {
        delete schema.items.default;
      }
    } else if (data.type === 'object') {
      schema.type = 'object';
      schema.properties = {};

      Object.keys(data.properties).map(prop => {
        schema.properties[prop] = constructSchema(data.properties[prop]);
        return true;
      });
    }

    // Only add a default value if we actually have one.
    if (typeof data.default !== 'undefined' && data.default !== '') {
      schema.default = data.default;
    }

    if (data.enum) schema.enum = data.enum;
    if (data.type) schema.type = data.type;
    if (data.format) schema.format = data.format;

    return schema;
  };

  return Object.keys(types).map(type => {
    const required = [];

    const parameters = resolvedParameters.filter(param => param.in === type);
    if (parameters.length === 0) {
      return null;
    }

    const properties = parameters.reduce((prev, current) => {
      const schema = {
        type: 'string',
        ...(current.schema ? constructSchema(current.schema) : {}),
      };

      if (current.description) {
        schema.description = current.description;
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
  if (!hasParameters && !hasRequestBody && getCommonParams(pathOperation).length === 0) return null;

  const typeKeys = Object.keys(types);
  return [getBodyParam(pathOperation, oas)]
    .concat(...getOtherParams(pathOperation, oas))
    .filter(Boolean)
    .sort((a, b) => {
      return typeKeys.indexOf(a.type) - typeKeys.indexOf(b.type);
    });
};

// Exported for use in oas-to-har for default values object
module.exports.types = types;
