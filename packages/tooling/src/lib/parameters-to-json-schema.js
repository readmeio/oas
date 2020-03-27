// This library is built to translate OpenAPI schemas into schemas compatible with react-jsonschema-form, and should
// not at this time be used for general purpose consumption.
const getSchema = require('./get-schema');

const refParser = require('@apidevtools/json-schema-ref-parser');
const toJsonSchema = require('@openapi-contrib/openapi-schema-to-json-schema');
const toJsonSchemaFromParameter = require('@openapi-contrib/openapi-schema-to-json-schema').fromParameter;

const toJsonSchemaOptions = {
  keepNotSupported: ['format'],
};

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
    // Run through the constructed JSON Schema and repair a few OpenAPI-specific oddities we might be experiencing.
    Object.keys(obj).forEach(prop => {
      if (obj[prop] === null) {
        // If the item is null, just carry on. Why do this in addition to `typeof obj[prop] == object`? Because
        // `typeof null` equates to `object` for "legacy reasons" apparently.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null
      } else if (typeof obj[prop] === 'object') {
        cleanupSchemaDefaults(obj[prop]);
      } else if (prop === 'type') {
        // This is a fix to handle cases where we have a malformed array with no `items` property present.
        // README-8E
        if (obj.type === 'array' && !('items' in obj)) {
          obj.items = {};
        }
      } else if (prop === '$schema') {
        // @todo delete $schema because we don't really need it right now
      }
    });

    return obj;
  };

  const type = schema.type === 'application/x-www-form-urlencoded' ? 'formData' : 'body';
  const cleanedSchema = cleanupSchemaDefaults(toJsonSchema(schema.schema, toJsonSchemaOptions));

  const constructedSchema = oas.components
    ? { components: cleanupSchemaDefaults(toJsonSchema(oas.components, toJsonSchemaOptions)), ...cleanedSchema }
    : cleanedSchema;

  // If there's not actually any data within this schema, don't bother returning it.
  if (Object.keys(cleanedSchema).length <= 1) {
    return null;
  }

  return {
    type,
    label: types[type],
    schema: constructedSchema,
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

function getOtherParams(pathOperation) {
  let operationParams = pathOperation.parameters || [];
  const commonParams = getCommonParams(pathOperation);

  if (commonParams.length !== 0) {
    const commonParamsNotInParams = commonParams.filter(
      param => !operationParams.find(param2 => param2.name === param.name && param2.in === param.in)
    );

    operationParams = operationParams.concat(commonParamsNotInParams || []);
  }

  return Object.keys(types).map(type => {
    const required = [];

    const parameters = operationParams.filter(param => param.in === type);
    if (parameters.length === 0) {
      return null;
    }

    const properties = parameters.reduce((prev, current) => {
      const schema = toJsonSchemaFromParameter(current, toJsonSchemaOptions);

      // This is a fix to handle cases where we have a malformed array with no `items` property present.
      // README-8E
      if (schema.type === 'array' && !('items' in schema)) {
        schema.items = {};
      }

      // @tood delete schema.$schema right now because we don't really need it

      prev[current.name] = schema;

      if (schema.required) {
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

module.exports = async (pathOperation, oas) => {
  // Add the full OAS back onto the pathOperation so we can resolve any `$ref` pointers that might be in the operation.
  pathOperation = await refParser.dereference({
    ...pathOperation,
    ...oas,
  });

  const hasRequestBody = !!pathOperation.requestBody;
  const hasParameters = !!(pathOperation.parameters && pathOperation.parameters.length !== 0);
  if (!hasParameters && !hasRequestBody && getCommonParams(pathOperation).length === 0) return null;

  const typeKeys = Object.keys(types);
  return [getBodyParam(pathOperation, oas)]
    .concat(...getOtherParams(pathOperation))
    .filter(Boolean)
    .sort((a, b) => {
      return typeKeys.indexOf(a.type) - typeKeys.indexOf(b.type);
    });
};

// Exported for use in oas-to-har for default values object
module.exports.types = types;
