/* eslint-disable no-continue */
// This library is built to translate OpenAPI schemas into schemas compatible with `@readme/oas-form`, and should
// not at this time be used for general purpose consumption.
const jsonpointer = require('jsonpointer');
const getSchema = require('../lib/get-schema');
const matchesMimeType = require('../lib/matches-mimetype');

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

// This list has been pulled from `openapi-schema-to-json-schema` but been slightly modified to fit within the
// constraints in which ReadMe uses the output from this library in `@readme/oas-form` as while properties like
// `readOnly` aren't represented within JSON Schema, we support it within that library's handling of OpenAPI-friendly
// JSON Schema.
//
// https://github.com/openapi-contrib/openapi-schema-to-json-schema/blob/master/index.js#L23-L27
const unsupportedSchemaProps = [
  'nullable',
  // 'discriminator',
  // 'readOnly',
  // 'writeOnly',
  'xml',
  'externalDocs',
  'example', // OpenAPI supports `example`, but we're mapping it to `examples` below.
  'deprecated',
];

/**
 * Take a string and encode it to be used as a JSON pointer.
 *
 * @link https://tools.ietf.org/html/rfc6901
 * @param {String} str
 * @returns {String}
 */
function encodePointer(str) {
  return str.replace('~', '~0').replace('/', '~1');
}

function isPrimitive(val) {
  return typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';
}

function isPolymorphicSchema(schema) {
  return 'allOf' in schema || 'anyOf' in schema || 'oneOf' in schema;
}

/**
 * Determine if a given schema looks like a `requestBody` schema and contains the `content` object.
 *
 * @param {Object} schema
 * @returns {Boolean}
 */
function isRequestBodySchema(schema) {
  return 'content' in schema;
}

/**
 * Given a JSON pointer and an array of examples do a reverse search through them until we find the JSON pointer, or
 * part of it, within the array.
 *
 * This function will allow you to take a pointer like `/tags/name` and return back `buster` from the following array:
 *
 * ```
 *  [
 *    {
 *      example: {id: 20}
 *    },
 *    {
 *      examples: {
 *        distinctName: {
 *          tags: {name: 'buster'}
 *        }
 *      }
 *    }
 *  ]
 * ```
 *
 * As with most things however, this is not without its quirks! If a deeply nested property shares the same name as an
 * example that's further up the stack (like `tags.id` and an example for `id`), there's a chance that it'll be
 * misidentified as having an example and receive the wrong value.
 *
 * That said, any example is usually better than no example though, so while it's quirky behavior it shouldn't raise
 * immediate cause for alarm.
 *
 * @link https://tools.ietf.org/html/rfc6901
 * @param {String} pointer
 * @param {Object[]} examples
 * @returns {(undefined|*)}
 */
function searchForExampleByPointer(pointer, examples = []) {
  if (!examples.length || !pointer.length) {
    return undefined;
  }

  const locSplit = pointer.split('/').filter(Boolean).reverse();
  const pointers = [];

  let point = '';
  for (let i = 0; i < locSplit.length; i += 1) {
    point = `/${locSplit[i]}${point}`;
    pointers.push(point);
  }

  let example;
  const rev = [...examples].reverse();

  for (let i = 0; i < pointers.length; i += 1) {
    for (let ii = 0; ii < rev.length; ii += 1) {
      let schema = rev[ii];
      if ('example' in schema) {
        schema = schema.example;
      } else {
        const keys = Object.keys(schema.examples);
        if (!keys.length) {
          continue;
        }

        // Prevent us from crashing if `examples` is a completely empty object.
        const ex = schema.examples[keys.shift()];
        if (typeof ex !== 'object' || Array.isArray(ex)) {
          continue;
        } else if (!('value' in ex)) {
          continue;
        }

        schema = ex.value;
      }

      try {
        example = jsonpointer.get(schema, pointers[i]);
      } catch (err) {
        // If the schema we're looking at is `{obj: null}` and our pointer if `/obj/propertyName` jsonpointer will throw
        // an error. If that happens, we should silently catch and toss it and return no example.
      }

      if (example !== undefined) {
        break;
      }
    }

    if (example !== undefined) {
      break;
    }
  }

  return example;
}

/**
 * Given an OpenAPI-flavored JSON Schema, make an effort to modify it so it's shaped more towards stock JSON Schema.
 *
 * Why do this?
 *
 *  1. OpenAPI 3.0.x supports its own flavor of JSON Schema that isn't fully compatible with most JSON Schema tooling
 *    (like `@readme/oas-form` or `@rjsf/core`).
 *  2. While validating an OpenAPI definition will prevent corrupted or improper schemas from occuring, we have a lot of
 *    legacy schemas in ReadMe that were ingested before we had proper validation in place, and as a result have some
 *    API definitions that will not pass validation right now. In addition to reshaping OAS-JSON Schema into JSON Schema
 *    this library will also fix these improper schemas: things like `type: object` having `items` instead of
 *    `properties`, `type: array` missing `items`, or `type` missing completely on a schema.
 *  3. Additionally due to OpenAPI 3.0.x not supporting JSON Schema, in order to support the `example` keyword that OAS
 *    supports, we need to do some work in here to remap it into `examples`. However, since all we care about in respect
 *    to examples for usage within `@readme/oas-form`, we're only retaining primitives. This *slightly* deviates from
 *    JSON Schema in that JSON Schema allows for any schema to be an example, but since `@readme/oas-form` can only
 *    actually **render** primitives, that's what we're retaining.
 *  4. Though OpenAPI 3.1 does support full JSON Schema, this library should be able to handle it without any problems.
 *
 * @link https://json-schema.org/draft/2019-09/json-schema-validation.html
 * @link https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md
 * @param {Object} data
 * @param {Object[]} prevSchemas
 * @param {String} currentLocation
 * @param {Object} globalDefaults
 * @param {Boolean} isPolymorphicAllOfChild
 */
function constructSchema(
  data,
  prevSchemas = [],
  currentLocation = '',
  globalDefaults,
  isPolymorphicAllOfChild = false
) {
  const schema = { ...data };

  // If this schema contains a `$ref`, it's circular and we shouldn't try to resolve it. Just return and move along.
  if (schema.$ref) {
    return {
      $ref: schema.$ref,
    };
  }

  // If this schema is malformed for some reason, let's do our best to repair it.
  if (!('type' in schema) && !isPolymorphicSchema(schema) && !isRequestBodySchema(schema)) {
    if ('properties' in schema) {
      schema.type = 'object';
    } else if ('items' in schema) {
      schema.type = 'array';
    } else if (isPolymorphicAllOfChild) {
      // If this schema is immediate child of a polymorphic schema and is neither an array or an object, we should
      // leave it alone. Cases like this are common where somebody might use `allOf` in order to dynamically add a
      // `description` onto another schema, like such:
      //
      //   allOf: [
      //      { type: 'array', items: { type: 'string' },
      //      { description: 'This is the description for the `array`.' }
      //   ]
    } else {
      // If we're processing a schema that has no types, no refs, and is just a lone schema, we should treat it at the
      // bare minimum as a simple string so we make an attempt to generate valid JSON Schema.
      schema.type = 'string';
    }
  }

  // JSON Schema doesn't support OpenAPI-style examples so we need to reshape them a bit.
  if ('example' in schema) {
    // Only bother adding primitive examples.
    if (isPrimitive(schema.example)) {
      schema.examples = [schema.example];
    } else if (Array.isArray(schema.example)) {
      schema.examples = schema.example.filter(example => isPrimitive(example));
      if (!schema.examples.length) {
        delete schema.examples;
      }
    } else {
      prevSchemas.push({ example: schema.example });
    }

    delete schema.example;
  } else if ('examples' in schema) {
    let reshapedExamples = false;
    if (typeof schema.examples === 'object' && !Array.isArray(schema.examples)) {
      const examples = [];
      Object.keys(schema.examples).forEach(name => {
        const example = schema.examples[name];
        if ('$ref' in example) {
          // no-op because any `$ref` example here after dereferencing is circular so we should ignore it
        } else if ('value' in example) {
          if (isPrimitive(example.value)) {
            examples.push(example.value);
            reshapedExamples = true;
          } else if (Array.isArray(example.value) && isPrimitive(example.value[0])) {
            examples.push(example.value[0]);
            reshapedExamples = true;
          } else {
            prevSchemas.push({ examples: schema.examples });
          }
        }
      });

      if (examples.length) {
        reshapedExamples = true;
        schema.examples = examples;
      }
    } else if (Array.isArray(schema.examples) && isPrimitive(schema.examples[0])) {
      // We haven't reshaped `examples` here, but since it's in a state that's preferrable to us let's keep it around.
      reshapedExamples = true;
    }

    if (!reshapedExamples) {
      delete schema.examples;
    }
  }

  // If we didn't have any immediately defined examples, let's search backwards and see if we can find one. But as we're
  // only looking for primitive example, only try to search for one if we're dealing with a primitive schema.
  if (schema.type !== 'array' && schema.type !== 'object' && !schema.examples) {
    const foundExample = searchForExampleByPointer(currentLocation, prevSchemas);
    if (foundExample) {
      // We can only really deal with primitives, so only promote those as the found example if it is.
      if (isPrimitive(foundExample) || (Array.isArray(foundExample) && isPrimitive(foundExample[0]))) {
        schema.examples = [foundExample];
      }
    }
  }

  if (schema.type === 'array') {
    if ('items' in schema) {
      if (
        !Array.isArray(schema.items) &&
        Object.keys(schema.items).length === 1 &&
        typeof schema.items.$ref !== 'undefined'
      ) {
        // `items` contains a `$ref`, so since it's circular we should do a no-op here and ignore it.
      } else {
        // Run through the arrays contents and clean them up.
        schema.items = constructSchema(schema.items, prevSchemas, `${currentLocation}/0`, globalDefaults);
      }
    } else if ('properties' in schema || 'additionalProperties' in schema) {
      // This is a fix to handle cases where someone may have typod `items` as `properties` on an array. Since
      // throwing a complete failure isn't ideal, we can see that they meant for the type to be `object`, so we can do
      // our best to shape the data into what they were intending it to be.
      // README-6R
      schema.type = 'object';
    } else {
      // This is a fix to handle cases where we have a malformed array with no `items` property present.
      // README-8E
      schema.items = {};
    }
  } else if (schema.type === 'object') {
    if ('properties' in schema) {
      Object.keys(schema.properties).map(prop => {
        schema.properties[prop] = constructSchema(
          schema.properties[prop],
          prevSchemas,
          `${currentLocation}/${encodePointer(prop)}`,
          globalDefaults
        );

        return true;
      });
    }

    if ('additionalProperties' in schema) {
      if (typeof schema.additionalProperties === 'object' && schema.additionalProperties !== null) {
        // If this `additionalProperties` is completely empty and devoid of any sort of schema, treat it as such.
        // Otherwise let's recurse into it and see if we can sort it out.
        if (
          !('type' in schema.additionalProperties) &&
          !('$ref' in schema.additionalProperties) &&
          !isPolymorphicSchema(schema.additionalProperties)
        ) {
          schema.additionalProperties = {};
        } else {
          schema.additionalProperties = constructSchema(
            data.additionalProperties,
            prevSchemas,
            currentLocation,
            globalDefaults
          );
        }
      }
    }
  }

  // If we don't have a set type, but are dealing with an `anyOf`, `oneOf`, or `allOf` representation let's run through
  // them and make sure they're good.
  ['allOf', 'anyOf', 'oneOf'].forEach(polyType => {
    if (polyType in schema && Array.isArray(schema[polyType])) {
      schema[polyType].forEach((item, idx) => {
        schema[polyType][idx] = constructSchema(
          item,
          prevSchemas,
          `${currentLocation}/${idx}`,
          globalDefaults,
          polyType === 'allOf'
        );
      });
    }
  });

  // Users can pass in parameter defaults via JWT User Data: https://docs.readme.com/docs/passing-data-to-jwt
  // We're checking to see if the defaults being passed in exist on endpoints via jsonpointer
  if (globalDefaults && Object.keys(globalDefaults).length > 0 && currentLocation) {
    try {
      const userJwtDefault = jsonpointer.get(globalDefaults, currentLocation);
      if (userJwtDefault) {
        schema.default = userJwtDefault;
      }
    } catch (err) {
      // If jsonpointer returns an error, we won't show any defaults for that path.
    }
  }

  // Only add a default value if we actually have one.
  if ('default' in schema && typeof schema.default !== 'undefined') {
    if (('allowEmptyValue' in schema && schema.allowEmptyValue && schema.default === '') || schema.default !== '') {
      // If we have `allowEmptyValue` present, and the default is actually an empty string, let it through as it's
      // allowed.
    } else {
      // If the default is empty and we don't want to allowEmptyValue, we need to remove the default.
      delete schema.default;
    }
  }

  // Remove unsupported JSON Schema props.
  for (let i = 0; i < unsupportedSchemaProps.length; i += 1) {
    delete schema[unsupportedSchemaProps[i]];
  }

  return schema;
}

function getRequestBody(operation, oas, globalDefaults) {
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

  const cleanedSchema = constructSchema(requestBody.schema, examples, '', globalDefaults);
  if (oas.components) {
    const components = {};
    Object.keys(oas.components).forEach(componentType => {
      if (typeof oas.components[componentType] === 'object' && !Array.isArray(oas.components[componentType])) {
        if (typeof components[componentType] === 'undefined') {
          components[componentType] = {};
        }

        Object.keys(oas.components[componentType]).forEach(schemaName => {
          components[componentType][schemaName] = constructSchema(
            oas.components[componentType][schemaName],
            [],
            '',
            globalDefaults
          );
        });
      }
    });

    cleanedSchema.components = components;
  }

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

function getCommonParams(path, oas) {
  if (oas && 'paths' in oas && path in oas.paths && 'parameters' in oas.paths[path]) {
    return oas.paths[path].parameters;
  }

  return [];
}

function getParameters(path, operation, oas, globalDefaults) {
  let operationParams = operation.parameters || [];
  const commonParams = getCommonParams(path, oas);

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
        schema = {
          ...(current.schema ? constructSchema(current.schema, [], '', globalDefaults) : {}),
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
            const jsonLikeContentTypes = contentKeys.filter(k => matchesMimeType.json(k));
            if (jsonLikeContentTypes.length) {
              contentType = jsonLikeContentTypes[0];
            } else {
              contentType = contentKeys[0];
            }
          }

          if (typeof current.content[contentType] === 'object' && 'schema' in current.content[contentType]) {
            schema = {
              ...(current.content[contentType].schema
                ? constructSchema(current.content[contentType].schema, [], '', globalDefaults)
                : {}),
            };
          }
        }
      }

      // Parameter descriptions don't exist in `current.schem` so `constructSchema` will never have access to it.
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

module.exports = (path, operation, oas, globalDefaults = {}) => {
  const hasRequestBody = !!operation.requestBody;
  const hasParameters = !!(operation.parameters && operation.parameters.length !== 0);
  if (!hasParameters && !hasRequestBody && getCommonParams(path, oas).length === 0) return null;

  const typeKeys = Object.keys(types);
  return [getRequestBody(operation, oas, globalDefaults)]
    .concat(...getParameters(path, operation, oas, globalDefaults))
    .filter(Boolean)
    .sort((a, b) => {
      return typeKeys.indexOf(a.type) - typeKeys.indexOf(b.type);
    });
};

module.exports.constructSchema = constructSchema;

// Exported for use in `@readme/oas-to-har` for default values object.
module.exports.types = types;
