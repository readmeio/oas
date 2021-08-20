/**
 * This file has been extracted and modified from Swagger UI.
 *
 * @license Apache 2.0
 * @link https://github.com/swagger-api/swagger-ui/blob/master/src/core/plugins/samples/fn.js
 */

const { objectify, usesPolymorphism, isFunc, normalizeArray, deeplyStripKey } = require('./utils');
const memoize = require('memoizee');
const mergeAllOf = require('json-schema-merge-allof');

const primitives = {
  string: () => 'string',
  string_email: () => 'user@example.com',
  'string_date-time': () => new Date().toISOString(),
  string_date: () => new Date().toISOString().substring(0, 10),
  'string_YYYY-MM-DD': () => new Date().toISOString().substring(0, 10),
  string_uuid: () => '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  string_hostname: () => 'example.com',
  string_ipv4: () => '198.51.100.42',
  string_ipv6: () => '2001:0db8:5b96:0000:0000:426f:8e17:642a',
  number: () => 0,
  number_float: () => 0.0,
  integer: () => 0,
  boolean: schema => (typeof schema.default === 'boolean' ? schema.default : true),
};

const primitive = schema => {
  schema = objectify(schema);
  const { type, format } = schema;

  const fn = primitives[`${type}_${format}`] || primitives[type];

  if (isFunc(fn)) {
    return fn(schema);
  }

  return `Unknown Type: ${schema.type}`;
};

const sampleFromSchema = (schema, config = {}) => {
  const objectifySchema = objectify(schema);
  let { type } = objectifySchema;

  const hasPolymorphism = usesPolymorphism(objectifySchema);
  if (hasPolymorphism === 'allOf') {
    try {
      return sampleFromSchema(
        mergeAllOf(objectifySchema, {
          resolvers: {
            // Ignore any unrecognized OAS-specific keywords that might be present on the schema (like `xml`).
            defaultResolver: mergeAllOf.options.resolvers.title,
          },
        }),
        config
      );
    } catch (error) {
      return undefined;
    }
  } else if (hasPolymorphism) {
    return sampleFromSchema(objectifySchema[hasPolymorphism][0], config);
  }

  const { example, additionalProperties, properties, items } = objectifySchema;
  const { includeReadOnly, includeWriteOnly } = config;

  if (example !== undefined) {
    return deeplyStripKey(example, '$$ref', val => {
      // do a couple of quick sanity tests to ensure the value
      // looks like a $$ref that swagger-client generates.
      return typeof val === 'string' && val.indexOf('#') > -1;
    });
  }

  if (!type) {
    if (properties || additionalProperties) {
      type = 'object';
    } else if (items) {
      type = 'array';
    } else {
      return undefined;
    }
  }

  if (type === 'object') {
    const props = objectify(properties);
    const obj = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const name in props) {
      if (props[name] && props[name].deprecated) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (props[name] && props[name].readOnly && !includeReadOnly) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (props[name] && props[name].writeOnly && !includeWriteOnly) {
        // eslint-disable-next-line no-continue
        continue;
      }

      obj[name] = sampleFromSchema(props[name], config);
    }

    if (additionalProperties === true) {
      obj.additionalProp = {};
    } else if (additionalProperties) {
      const additionalProps = objectify(additionalProperties);
      const additionalPropVal = sampleFromSchema(additionalProps, config);

      obj.additionalProp = additionalPropVal;
    }

    return obj;
  }

  if (type === 'array') {
    // `items` should always be present on arrays, but if it isn't we should at least do our best to support its
    // absence.
    if (typeof items === 'undefined') {
      return [];
    }

    if (Array.isArray(items.anyOf)) {
      return items.anyOf.map(i => sampleFromSchema(i, config));
    }

    if (Array.isArray(items.oneOf)) {
      return items.oneOf.map(i => sampleFromSchema(i, config));
    }

    return [sampleFromSchema(items, config)];
  }

  if (schema.enum) {
    if (schema.default) {
      return schema.default;
    }

    return normalizeArray(schema.enum)[0];
  }

  if (type === 'file') {
    return undefined;
  }

  return primitive(schema);
};

module.exports.sampleFromSchema = memoize(sampleFromSchema);
