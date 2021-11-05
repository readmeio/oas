/* eslint-disable no-continue */
/* eslint-disable jsdoc/check-types */
/* eslint-disable jsdoc/require-param-description */
/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable jsdoc/require-returns-description */
/* eslint-disable jsdoc/require-returns */
const jsonpointer = require('jsonpointer');

/**
 * This list has been pulled from `openapi-schema-to-json-schema` but been slightly modified to fit within the
 * constraints in which ReadMe uses the output from this library in `@readme/oas-form` as while properties like
 * `readOnly` aren't represented within JSON Schema, we support it within that library's handling of OpenAPI-friendly
 * JSON Schema.
 *
 * @see {@link https://github.com/openapi-contrib/openapi-schema-to-json-schema/blob/master/index.js#L23-L27}
 */
const UNSUPPORTED_SCHEMA_PROPS = [
  'nullable',
  // 'discriminator',
  // 'readOnly',
  // 'writeOnly',
  'xml',
  'externalDocs',
  'example', // OpenAPI supports `example`, but we're mapping it to `examples` below.
  // 'deprecated',
];

/**
 * List partially sourced from `openapi-schema-to-json-schema`.
 *
 * @see {@link https://github.com/openapi-contrib/openapi-schema-to-json-schema/blob/master/lib/converters/schema.js#L140-L154}
 */
const FORMAT_OPTIONS = {
  INT8_MIN: 0 - 2 ** 7, // -128
  INT8_MAX: 2 ** 7 - 1, // 127
  INT16_MIN: 0 - 2 ** 15, // -32768
  INT16_MAX: 2 ** 15 - 1, // 32767
  INT32_MIN: 0 - 2 ** 31, // -2147483648
  INT32_MAX: 2 ** 31 - 1, // 2147483647
  INT64_MIN: 0 - 2 ** 63, // -9223372036854775808
  INT64_MAX: 2 ** 63 - 1, // 9223372036854775807

  UINT8_MIN: 0,
  UINT8_MAX: 2 ** 8 - 1, // 255
  UINT16_MIN: 0,
  UINT16_MAX: 2 ** 16 - 1, // 65535
  UINT32_MIN: 0,
  UINT32_MAX: 2 ** 32 - 1, // 4294967295
  UINT64_MIN: 0,
  UINT64_MAX: 2 ** 64 - 1, // 18446744073709551615

  FLOAT_MIN: 0 - 2 ** 128, // -3.402823669209385e+38
  FLOAT_MAX: 2 ** 128 - 1, // 3.402823669209385e+38

  DOUBLE_MIN: 0 - Number.MAX_VALUE,
  DOUBLE_MAX: Number.MAX_VALUE,
};

/**
 * Take a string and encode it to be used as a JSON pointer.
 *
 * @see {@link https://tools.ietf.org/html/rfc6901}
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
 * @see {@link https://tools.ietf.org/html/rfc6901}
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
 * And why use this over `@openapi-contrib/openapi-schema-to-json-schema`? Fortunately and unfortunately we've got a lot
 * of API definitions in our database that aren't currently valid so we need to have a lot of bespoke handling for odd
 * quirks, typos, and missing declarations that they've got.
 *
 * @see {@link https://json-schema.org/draft/2019-09/json-schema-validation.html{}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md}
 * @param {Object} data
 * @param {Object} opts
 * @param {String} opts.currentLocation - Current location within the schema -- this is a JSON pointer.
 * @param {Object} opts.globalDefaults - Object containing a global set of defaults that we should apply to schemas that match it.
 * @param {Boolean} opts.isPolymorphicAllOfChild - Is this schema the child of a polymorphic `allOf` schema?
 * @param {Object[]} opts.prevSchemas - Array of parent schemas to utilize when attempting to path together examples.
 * @param {Function} opts.refLogger - A function that's called anytime a (circular) `$ref` is found.
 */
function toJSONSchema(data, opts = {}) {
  const schema = { ...data };
  const { currentLocation, globalDefaults, isPolymorphicAllOfChild, prevSchemas, refLogger } = {
    currentLocation: '',
    globalDefaults: {},
    isPolymorphicAllOfChild: false,
    prevSchemas: [],
    refLogger: () => true,
    ...opts,
  };

  // If this schema contains a `$ref`, it's circular and we shouldn't try to resolve it. Just return and move along.
  if (schema.$ref) {
    refLogger(schema.$ref);

    return {
      $ref: schema.$ref,
    };
  }

  // If we don't have a set type, but are dealing with an `anyOf`, `oneOf`, or `allOf` representation let's run through
  // them and make sure they're good.
  ['allOf', 'anyOf', 'oneOf'].forEach(polyType => {
    if (polyType in schema && Array.isArray(schema[polyType])) {
      schema[polyType].forEach((item, idx) => {
        const polyOptions = {
          currentLocation: `${currentLocation}/${idx}`,
          globalDefaults,
          isPolymorphicAllOfChild: polyType === 'allOf',
          prevSchemas,
          refLogger,
        };

        // When `properties` or `items` are present alongside a polymorphic schema instead of letting whatever JSON
        // Schema interpreter is handling these constructed schemas we can guide its hand a bit by manually transforming
        // it into an inferred `allOf` of the `properties` + the polymorph schema.
        if ('properties' in schema) {
          schema[polyType][idx] = toJSONSchema({ allOf: [item, { properties: schema.properties }] }, polyOptions);
        } else if ('items' in schema) {
          schema[polyType][idx] = toJSONSchema({ allOf: [item, { items: schema.items }] }, polyOptions);
        } else {
          schema[polyType][idx] = toJSONSchema(item, polyOptions);
        }
      });
    }
  });

  if ('discriminator' in schema) {
    if ('mapping' in schema.discriminator && typeof schema.discriminator.mapping === 'object') {
      // Discriminator mappings aren't written as traditional `$ref` pointers so in order to log them to the supplied
      // `refLogger`.
      Object.keys(schema.discriminator.mapping).forEach(k => {
        refLogger(schema.discriminator.mapping[k]);
      });
    }
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
          refLogger(example.$ref);
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
        // `items` contains a `$ref`, so since it's circular we should do a no-op here and log and ignore it.
        refLogger(schema.items.$ref);
      } else {
        // Run through the arrays contents and clean them up.
        schema.items = toJSONSchema(schema.items, {
          currentLocation: `${currentLocation}/0`,
          globalDefaults,
          prevSchemas,
          refLogger,
        });
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
        schema.properties[prop] = toJSONSchema(schema.properties[prop], {
          currentLocation: `${currentLocation}/${encodePointer(prop)}`,
          globalDefaults,
          prevSchemas,
          refLogger,
        });

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
          schema.additionalProperties = true;
        } else {
          schema.additionalProperties = toJSONSchema(data.additionalProperties, {
            currentLocation,
            globalDefaults,
            prevSchemas,
            refLogger,
          });
        }
      }
    }

    // Since neither `properties` and `additionalProperties` are actually required to be present on an object, since we
    // construct this schema work to build up a form we still need *something* for the user to enter in for this object
    // so we'll add back in `additionalProperties` for that.
    if (!isPolymorphicSchema(schema) && !('properties' in schema) && !('additionalProperties' in schema)) {
      schema.additionalProperties = true;
    }
  }

  // Ensure that number schemas formats have properly constrained min/max attributes according to whatever type of
  // `format` and `type` they adhere to.
  if ('format' in schema) {
    const formatUpper = schema.format.toUpperCase();

    if (`${formatUpper}_MIN` in FORMAT_OPTIONS) {
      if ((!schema.minimum && schema.minimum !== 0) || schema.minimum < FORMAT_OPTIONS[`${formatUpper}_MIN`]) {
        schema.minimum = FORMAT_OPTIONS[`${formatUpper}_MIN`];
      }
    }

    if (`${formatUpper}_MAX` in FORMAT_OPTIONS) {
      if ((!schema.maximum && schema.maximum !== 0) || schema.maximum > FORMAT_OPTIONS[`${formatUpper}_MAX`]) {
        schema.maximum = FORMAT_OPTIONS[`${formatUpper}_MAX`];
      }
    }
  }

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

  // Enums should not have duplicated items as those will break AJV validation.
  if ('enum' in schema && Array.isArray(schema.enum)) {
    schema.enum = [...new Set(schema.enum)];
  }

  // Clean up any remaining `items` or `properties` schema fragments lying around if there's also polymorphism present.
  if ('allOf' in schema || 'anyOf' in schema || 'oneOf' in schema) {
    if ('properties' in schema) {
      delete schema.properties;
    }

    if ('items' in schema) {
      delete schema.items;
    }
  }

  // Remove unsupported JSON Schema props.
  for (let i = 0; i < UNSUPPORTED_SCHEMA_PROPS.length; i += 1) {
    delete schema[UNSUPPORTED_SCHEMA_PROPS[i]];
  }

  return schema;
}

module.exports = toJSONSchema;
