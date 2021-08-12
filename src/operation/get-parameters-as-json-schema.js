const getSchema = require('../lib/get-schema');
const { json: isJSON } = require('../lib/matches-mimetype');
const toJSONSchema = require('../lib/openapi-to-json-schema');

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

function cloneObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * @param {string} path
 * @param {Operation} operation
 * @param {Oas} oas
 * @param {Object} globalDefaults
 * @returns {array<object>}
 */
module.exports = (path, operation, oas, globalDefaults = {}) => {
  let hasCircularRefs = false;

  function refLogger() {
    hasCircularRefs = true;
  }

  function getRequestBody() {
    const schema = getSchema(operation, oas);
    if (!schema || !schema.schema) return null;

    const type = schema.type === 'application/x-www-form-urlencoded' ? 'formData' : 'body';
    const requestBody = schema.schema;

    // If this schema is completely empty, don't bother processing it.
    if (Object.keys(requestBody.schema).length === 0) {
      return null;
    }

    const examples = [];
    if ('example' in requestBody) {
      examples.push({ example: requestBody.example });
    } else if ('examples' in requestBody) {
      examples.push({ examples: requestBody.examples });
    }

    // We're cloning the request schema because we've had issues with request schemas that were dereferenced being
    // processed multiple times because their component is also processed.
    const requestSchema = cloneObject(requestBody.schema);
    const cleanedSchema = toJSONSchema(requestSchema, { globalDefaults, prevSchemas: examples, refLogger });

    // If this schema is **still** empty, don't bother returning it.
    if (Object.keys(cleanedSchema).length === 0) {
      return null;
    }

    return {
      type,
      label: types[type],
      schema: cleanedSchema,
    };
  }

  function getCommonParams() {
    if (oas && 'paths' in oas && path in oas.paths && 'parameters' in oas.paths[path]) {
      return oas.paths[path].parameters;
    }

    return [];
  }

  function getComponents() {
    if (!('components' in oas)) {
      return false;
    }

    const components = {};
    Object.keys(oas.components).forEach(componentType => {
      if (typeof oas.components[componentType] === 'object' && !Array.isArray(oas.components[componentType])) {
        if (typeof components[componentType] === 'undefined') {
          components[componentType] = {};
        }

        Object.keys(oas.components[componentType]).forEach(schemaName => {
          const componentSchema = cloneObject(oas.components[componentType][schemaName]);
          components[componentType][schemaName] = toJSONSchema(componentSchema, { globalDefaults, refLogger });
        });
      }
    });

    return components;
  }

  function getParameters() {
    let operationParams = operation.parameters || [];
    const commonParams = getCommonParams();

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

    return Object.keys(types).map(type => {
      const required = [];

      const parameters = operationParams.filter(param => param.in === type);
      if (parameters.length === 0) {
        return null;
      }

      const properties = parameters.reduce((prev, current) => {
        let schema = {};
        if ('schema' in current) {
          const currentSchema = current.schema ? cloneObject(current.schema) : {};

          if (current.example) {
            // `example` can be present outside of the `schema` block so if it's there we should pull it in so it can be
            // handled and returned if it's valid.
            currentSchema.example = current.example;
          } else if (current.examples) {
            // `examples` isn't actually supported here in OAS 3.0, but we might as well support it because `examples` is
            // JSON Schema and that's fully supported in OAS 3.1.
            currentSchema.examples = current.examples;
          }

          schema = {
            ...toJSONSchema(currentSchema, {
              currentLocation: `/${current.name}`,
              globalDefaults,
              refLogger,
            }),
          };
        } else if ('content' in current && typeof current.content === 'object') {
          const contentKeys = Object.keys(current.content);
          if (contentKeys.length) {
            let contentType;
            if (contentKeys.length === 1) {
              contentType = contentKeys[0];
            } else {
              // We should always try to prioritize `application/json` over any other possible content that might be present
              // on this schema.
              const jsonLikeContentTypes = contentKeys.filter(k => isJSON(k));
              if (jsonLikeContentTypes.length) {
                contentType = jsonLikeContentTypes[0];
              } else {
                contentType = contentKeys[0];
              }
            }

            if (typeof current.content[contentType] === 'object' && 'schema' in current.content[contentType]) {
              const currentSchema = current.content[contentType].schema
                ? cloneObject(current.content[contentType].schema)
                : {};

              if (current.example) {
                // `example` can be present outside of the `schema` block so if it's there we should pull it in so it can be
                // handled and returned if it's valid.
                currentSchema.example = current.example;
              } else if (current.examples) {
                // `examples` isn't actually supported here in OAS 3.0, but we might as well support it because `examples` is
                // JSON Schema and that's fully supported in OAS 3.1.
                currentSchema.examples = current.examples;
              }

              schema = {
                ...toJSONSchema(currentSchema, {
                  currentLocation: `/${current.name}`,
                  globalDefaults,
                  refLogger,
                }),
              };
            }
          }
        }

        // Parameter descriptions don't exist in `current.schema` so `constructSchema` will never have access to it.
        if (current.description) {
          schema.description = current.description;
        }

        // If for whatever reason we were unable to ascertain a type for the schema (maybe `schema` and `content` aren't
        // present, or they're not in the shape they should be), set it to a string so we can at least make an attempt at
        // returning *something* for it.
        if (!('type' in schema)) {
          // Only add a missing type if this schema isn't a polymorphismified schema.
          if (!('allOf' in schema) && !('oneOf' in schema) && !('anyOf' in schema)) {
            schema.type = 'string';
          }
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

  const hasRequestBody = !!operation.requestBody;
  const hasParameters = !!(operation.parameters && operation.parameters.length !== 0);
  if (!hasParameters && !hasRequestBody && getCommonParams().length === 0) return null;

  const components = getComponents();

  const typeKeys = Object.keys(types);
  return [getRequestBody()]
    .concat(...getParameters())
    .filter(Boolean)
    .map(group => {
      // Since this library assumes that the schema has already been dereferenced, adding every component here that
      // **isn't** circular adds a ton of bloat so it'd be cool if `components` was just the remaining `$ref` pointers
      // that are still being referenced.
      // @todo
      if (hasCircularRefs && components) {
        group.schema.components = components;
      }

      return group;
    })
    .sort((a, b) => {
      return typeKeys.indexOf(a.type) - typeKeys.indexOf(b.type);
    });
};

// Exported for use in `@readme/oas-to-har` for default values object.
module.exports.types = types;
