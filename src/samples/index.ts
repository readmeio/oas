/**
 * This file has been extracted and modified from Swagger UI.
 *
 * @license Apache-2.0
 * @see {@link https://github.com/swagger-api/swagger-ui/blob/master/src/core/plugins/samples/fn.js}
 */
import type * as RMOAS from '../rmoas.types';

import mergeAllOf from 'json-schema-merge-allof';
import memoize from 'memoizee';

import { objectify, usesPolymorphism, isFunc, normalizeArray, deeplyStripKey } from './utils';

const sampleDefaults = (genericSample: string | number | boolean) => {
  return (schema: RMOAS.SchemaObject): typeof genericSample =>
    typeof schema.default === typeof genericSample ? schema.default : genericSample;
};

const primitives: Record<string, (arg: void | RMOAS.SchemaObject) => string | number | boolean> = {
  string: sampleDefaults('string'),
  string_email: sampleDefaults('user@example.com'),
  'string_date-time': sampleDefaults(new Date().toISOString()),
  string_date: sampleDefaults(new Date().toISOString().substring(0, 10)),
  'string_YYYY-MM-DD': sampleDefaults(new Date().toISOString().substring(0, 10)),
  string_uuid: sampleDefaults('3fa85f64-5717-4562-b3fc-2c963f66afa6'),
  string_hostname: sampleDefaults('example.com'),
  string_ipv4: sampleDefaults('198.51.100.42'),
  string_ipv6: sampleDefaults('2001:0db8:5b96:0000:0000:426f:8e17:642a'),
  number: sampleDefaults(0),
  number_float: sampleDefaults(0.0),
  integer: sampleDefaults(0),
  boolean: sampleDefaults(true),
};

const primitive = (schema: RMOAS.SchemaObject) => {
  schema = objectify(schema);
  const { type, format } = schema;

  // @todo add support for if `type` is an array
  const fn = primitives[`${type}_${format}`] || primitives[type as string];
  if (isFunc(fn)) {
    return fn(schema);
  }

  return `Unknown Type: ${schema.type}`;
};

/**
 * Generate a piece of sample data from a JSON Schema object. If `example` declarations are present
 * they will be utilized, but generally this will generate fake data for the information present in
 * the schema.
 *
 * @param schema JSON Schema to generate a sample for.
 * @param opts Options
 * @param opts.includeReadOnly If you wish to include data that's flagged as `readOnly`.
 * @param opts.includeWriteOnly If you wish to include data that's flatted as `writeOnly`.
 * @returns A generated piece of data based off the JSON Schema that was supplied.
 */
function sampleFromSchema(
  schema: RMOAS.SchemaObject,
  opts: { includeReadOnly?: boolean; includeWriteOnly?: boolean } = {}
): string | number | boolean | null | unknown[] | Record<string, unknown> | undefined {
  const objectifySchema = objectify(schema);
  let { type } = objectifySchema;

  const hasPolymorphism = usesPolymorphism(objectifySchema);
  if (hasPolymorphism === 'allOf') {
    try {
      return sampleFromSchema(
        mergeAllOf(objectifySchema, {
          resolvers: {
            // Ignore any unrecognized OAS-specific keywords that might be present on the schema
            // (like `xml`).
            defaultResolver: mergeAllOf.options.resolvers.title,
          },
        }),
        opts
      );
    } catch (error) {
      return undefined;
    }
  } else if (hasPolymorphism) {
    return sampleFromSchema((objectifySchema[hasPolymorphism] as RMOAS.SchemaObject[])[0], opts);
  }

  const { example, additionalProperties, properties, items } = objectifySchema;
  const { includeReadOnly, includeWriteOnly } = opts;

  if (example !== undefined) {
    return deeplyStripKey(example, '$$ref', (val: string) => {
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
    const obj: Record<string, any> = {};
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

      obj[name] = sampleFromSchema(props[name], opts);
    }

    if (additionalProperties === true) {
      obj.additionalProp = {};
    } else if (additionalProperties) {
      const additionalProps = objectify(additionalProperties);
      const additionalPropVal = sampleFromSchema(additionalProps, opts);

      obj.additionalProp = additionalPropVal;
    }

    return obj;
  }

  if (type === 'array') {
    // `items` should always be present on arrays, but if it isn't we should at least do our best
    // to support its absence.
    if (typeof items === 'undefined') {
      return [];
    }

    if (Array.isArray(items.anyOf)) {
      return items.anyOf.map((i: RMOAS.SchemaObject) => sampleFromSchema(i, opts));
    }

    if (Array.isArray(items.oneOf)) {
      return items.oneOf.map((i: RMOAS.SchemaObject) => sampleFromSchema(i, opts));
    }

    return [sampleFromSchema(items, opts)];
  }

  if (schema.enum) {
    if (schema.default) {
      return schema.default;
    }

    return normalizeArray(schema.enum as string[])[0];
  }

  if (type === 'file') {
    return undefined;
  }

  return primitive(schema);
}

export default memoize(sampleFromSchema);
