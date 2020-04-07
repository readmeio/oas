// This library is built to translate OpenAPI schemas into schemas compatible with react-jsonschema-form, and should
// not at this time be used for general purpose consumption.
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

  const cleanupSchemaDefaults = obj => {
    Object.keys(obj).forEach(prop => {
      if (obj[prop] === null) {
        // If the item is null, just carry on. Why do this in addition to `typeof obj[prop] == object`? Because
        // `typeof null` equates to `object` for "legacy reasons" apparently.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null
      } else if (typeof obj[prop] === 'object') {
        cleanupSchemaDefaults(obj[prop]);
      } else {
        switch (prop) {
          case 'additionalProperties':
            // If it's set to `false`, don't bother adding it.
            if (obj[prop] === false) {
              delete obj[prop];
            }
            break;

          case 'default':
            if ('allowEmptyValue' in obj && obj.allowEmptyValue && obj[prop] === '') {
              // If we have `allowEmptyValue` present, and the default is actually an empty string, let it through as
              // it's allowed.
            } else if (obj[prop] === '') {
              delete obj[prop];
            }
            break;

          case 'maxLength':
            obj.maximum = obj[prop];
            delete obj[prop];
            break;

          case 'minLength':
            obj.minimum = obj[prop];
            delete obj[prop];
            break;

          case 'type':
            if (obj.type === 'array') {
              if (!('items' in obj)) {
                if ('properties' in obj) {
                  // This is a fix to handle cases where someone may have typod `items` as `properties` on an array.
                  // Since throwing a complete failure isn't ideal, we can see that they meant for the type to be
                  // `object`, so we  can do our best to shape the data into what they were intendint it to be.
                  // README-6R
                  obj.type = 'object';
                } else {
                  // This is a fix to handle cases where we have a malformed array with no `items` property present.
                  // README-8E
                  obj.items = {};
                }
              }
            }
            break;

          // Do nothing
          default:
        }
      }
    });

    return obj;
  };

  const type = schema.type === 'application/x-www-form-urlencoded' ? 'formData' : 'body';

  const cleanedSchema = oas.components
    ? { components: cleanupSchemaDefaults(oas.components), ...cleanupSchemaDefaults(schema.schema) }
    : cleanupSchemaDefaults(schema.schema);

  // If there's not actually any data within this schema, don't bother returning it.
  if (Object.keys(cleanedSchema).length === 0) {
    return null;
  }

  return {
    type,
    label: types[type],
    schema: cleanedSchema,
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
  let operationParams = pathOperation.parameters || [];
  const commonParams = getCommonParams(pathOperation);

  if (commonParams.length !== 0) {
    const commonParamsNotInParams = commonParams.filter(param => {
      return !operationParams.find(param2 => {
        if (param.name && param2.name) {
          return param.name === param2.name && param.in === param2.in;
        } else if (param.$ref && param2.$ref) {
          return param.$ref === param2.$ref;
        }

        return false;
      });
    });

    operationParams = operationParams.concat(commonParamsNotInParams || []);
  }

  const resolvedParameters = operationParams.map(param => {
    if (param.$ref) return findSchemaDefinition(param.$ref, oas);
    return param;
  });

  const constructSchema = data => {
    const schema = {};

    if (data.type === 'array') {
      schema.type = 'array';

      if ('items' in data) {
        if (Object.keys(data.items).length === 1 && typeof data.items.$ref !== 'undefined') {
          schema.items = findSchemaDefinition(data.items.$ref, oas);
        } else {
          schema.items = data.items;
        }

        // Run through the arrays contents and clean them up.
        schema.items = constructSchema(schema.items);
      } else if ('properties' in data || 'additionalProperties' in data) {
        // This is a fix to handle cases where someone may have typod `items` as `properties` on an array. Since
        // throwing a complete failure isn't ideal, we can see that they meant for the type to be `object`, so we can do
        // our best to shape the data into what they were intendint it to be.
        // README-6R
        schema.type = 'object';
      } else {
        // This is a fix to handle cases where we have a malformed array with no `items` property present.
        // README-8E
        schema.items = {};
      }
    }

    if (data.type === 'object') {
      schema.type = 'object';

      if ('properties' in data) {
        schema.properties = {};

        Object.keys(data.properties).map(prop => {
          schema.properties[prop] = constructSchema(data.properties[prop]);
          return true;
        });
      }

      if ('additionalProperties' in data) {
        if (typeof data.additionalProperties === 'object' && data.additionalProperties !== null) {
          schema.additionalProperties = constructSchema(data.additionalProperties);
        } else if (data.additionalProperties !== false) {
          // If it's set to `false`, don't bother adding it.
          schema.additionalProperties = data.additionalProperties;
        }
      }
    }

    if ('allowEmptyValue' in data) {
      schema.allowEmptyValue = data.allowEmptyValue;
    }

    // Only add a default value if we actually have one.
    if (typeof data.default !== 'undefined') {
      if ('allowEmptyValue' in schema && schema.allowEmptyValue && data.default === '') {
        // If we have `allowEmptyValue` present, and the default is actually an empty string, let it through as it's
        // allowed.
        schema.default = data.default;
      } else if (data.default !== '') {
        schema.default = data.default;
      }
    }

    if ('maxLength' in data) schema.maximum = data.maxLength;
    if ('minLength' in data) schema.minimum = data.minLength;

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
