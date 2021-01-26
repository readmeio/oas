// This library is built to translate OpenAPI schemas into schemas compatible with `@readme/oas-form`, and should
// not at this time be used for general purpose consumption.
const jsonpointer = require('jsonpointer');
const getSchema = require('../lib/get-schema');

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
  'example', // OpenAPI supports `example`, but we're it to `examples` below.
  'deprecated',
];

function encodePointer(str) {
  // These characters need to be encoded to be allowed within a JSON pointer.
  return str.replace('~', '~0').replace('/', '~1');
}

function isPrimitive(val) {
  return typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';
}

function isPolymorphicSchema(schema) {
  return 'allOf' in schema || 'anyOf' in schema || 'oneOf' in schema;
}

function isRequestBodySchema(schema) {
  return 'content' in schema;
}

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

  // This code has some quirks! If a deeply nested property shares the same name as an example that's further up the
  // stack (like `tags.id` and an example for `id`), there's a chance that it'll be misidentified as having an example
  // and receive the wrong example value.
  //
  // Any example is usually better than no example though, so while it's quirky behavior it shouldn't raise immediate
  // cause for alarm.
  for (let i = 0; i < pointers.length; i += 1) {
    for (let ii = 0; ii < rev.length; ii += 1) {
      let schema = rev[ii];
      if ('example' in schema) {
        schema = schema.example;
      } else {
        schema = schema.examples[Object.keys(schema.examples).shift()].value;
      }

      example = jsonpointer.get(schema, pointers[i]);
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

function constructSchema(data, prevSchemas = [], currentLocation = '') {
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
    } else if (Array.isArray(schema.example) && isPrimitive(schema.example[0])) {
      schema.examples = [schema.example[0]];
    } else {
      prevSchemas.push({ example: schema.example });
    }

    delete schema.example;
  } else if ('examples' in schema) {
    let reshapedExamples = false;
    if (typeof schema.examples === 'object' && !Array.isArray(schema.examples)) {
      const example = schema.examples[Object.keys(schema.examples).shift()];
      if ('$ref' in example) {
        // no-op because any `$ref` example here after dereferencing is circular so we should ignore it
      } else if ('value' in example) {
        if (isPrimitive(example.value)) {
          schema.examples = [example.value];
          reshapedExamples = true;
        } else if (Array.isArray(example.value) && isPrimitive(example.value[0])) {
          schema.examples = [example.value[0]];
          reshapedExamples = true;
        } else {
          prevSchemas.push({ examples: schema.examples });
        }
      }
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
        schema.items = constructSchema(schema.items, prevSchemas, `${currentLocation}/0`);
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
          `${currentLocation}/${encodePointer(prop)}`
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
          schema.additionalProperties = constructSchema(data.additionalProperties, prevSchemas, currentLocation);
        }
      }
    }
  }

  // If we don't have a set type, but are dealing with an anyOf, oneOf, or allOf representation let's run through
  // them and make sure they're good.
  // @todo collapse this into a small loop
  if ('allOf' in schema && Array.isArray(schema.allOf)) {
    schema.allOf.forEach((item, idx) => {
      schema.allOf[idx] = constructSchema(item, prevSchemas, `${currentLocation}/${idx}`);
    });
  } else if ('anyOf' in schema && Array.isArray(schema.anyOf)) {
    schema.anyOf.forEach((item, idx) => {
      schema.anyOf[idx] = constructSchema(item, prevSchemas, `${currentLocation}/${idx}`);
    });
  } else if ('oneOf' in schema && Array.isArray(schema.oneOf)) {
    schema.oneOf.forEach((item, idx) => {
      schema.oneOf[idx] = constructSchema(item, prevSchemas, `${currentLocation}/${idx}`);
    });
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

function getRequestBody(operation, oas) {
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

  let cleanedSchema;
  if (oas.components) {
    // Since cleanupSchemaDefaults is a recursive method, it's best if we start it at the `components.schemas` level
    // so we have immediate knowledge of when we're first processing a component schema, and can reset our internal
    // prop states that keep track of how we should treat certain prop edge cases.
    const components = {};
    Object.keys(oas.components).forEach(componentType => {
      if (typeof oas.components[componentType] === 'object' && !Array.isArray(oas.components[componentType])) {
        if (typeof components[componentType] === 'undefined') {
          components[componentType] = {};
        }

        Object.keys(oas.components[componentType]).forEach(schemaName => {
          components[componentType][schemaName] = constructSchema(oas.components[componentType][schemaName]);
        });
      }
    });

    // You might be thinking why isnt this above `if (oas.components)` above since it's the same if we have or don't
    // have components and... well if this line is above where we construct schemas for components then `examples` in
    // the `requestBody` don't get properly processed.
    //
    // Your guess is as good as mine.
    cleanedSchema = constructSchema(requestBody.schema, examples);
    cleanedSchema.components = components;
  } else {
    cleanedSchema = constructSchema(requestBody.schema, examples);
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

function getParameters(path, operation, oas) {
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
      const schema = {
        ...(current.schema ? constructSchema(current.schema) : {}),
      };

      // Parameter descriptions don't exist in `current.schem` so `constructSchema` will never have access to it.
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

module.exports = (path, operation, oas) => {
  const hasRequestBody = !!operation.requestBody;
  const hasParameters = !!(operation.parameters && operation.parameters.length !== 0);
  if (!hasParameters && !hasRequestBody && getCommonParams(path, oas).length === 0) return null;

  const typeKeys = Object.keys(types);
  return [getRequestBody(operation, oas)]
    .concat(...getParameters(path, operation, oas))
    .filter(Boolean)
    .sort((a, b) => {
      return typeKeys.indexOf(a.type) - typeKeys.indexOf(b.type);
    });
};

module.exports.constructSchema = constructSchema;

// Exported for use in `@readme/oas-to-har` for default values object.
module.exports.types = types;
