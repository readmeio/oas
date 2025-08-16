/**
 * This file has been extracted and modified from Swagger UI.
 *
 * @license Apache-2.0
 * @see {@link https://github.com/swagger-api/swagger-ui/blob/master/src/core/plugins/samples/fn.js}
 */
import type { SchemaObject } from '../types.js';

import mergeJSONSchemaAllOf from 'json-schema-merge-allof';
import memoize from 'memoizee';

import { deeplyStripKey, isFunc, normalizeArray, objectify, usesPolymorphism } from './utils.js';

const sampleDefaults = (genericSample: boolean | number | string) => {
  return (schema: SchemaObject): typeof genericSample =>
    typeof schema.default === typeof genericSample ? schema.default : genericSample;
};

const primitives: Record<string, (arg: SchemaObject) => boolean | number | string> = {
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

const primitive = (schema: SchemaObject) => {
  const objectifiedSchema = objectify(schema);
  const { format } = objectifiedSchema;
  let { type } = objectifiedSchema;

  if (type === 'null') {
    return null;
  } else if (Array.isArray(type)) {
    if (type.length === 1) {
      type = type[0];
    } else {
      // If one of our types is `null` then we should generate a sample for the non-null value.
      if (type.includes('null')) {
        type = type.filter(t => t !== 'null');
      }

      type = type.shift();
    }
  }

  // @todo add support for if `type` is an array
  const fn = primitives[`${type}_${format}`] || primitives[type as string];
  if (isFunc(fn)) {
    return fn(objectifiedSchema);
  }

  return `Unknown Type: ${objectifiedSchema.type}`;
};

/**
 * Generate a piece of sample data from a JSON Schema object. If `example` declarations are present
 * they will be utilized, but generally this will generate fake data for the information present in
 * the schema.
 *
 * @param schema JSON Schema to generate a sample for.
 */
function sampleFromSchema(
  schema: SchemaObject,
  opts: {
    /**
     * If you wish to include data that's flagged as `readOnly`.
     */
    includeReadOnly?: boolean;

    /**
     * If you wish to include data that's flatted as `writeOnly`.
     */
    includeWriteOnly?: boolean;
  } = {},
): Record<string, unknown> | unknown[] | boolean | number | string | null | undefined {
  const objectifySchema = objectify(schema);
  let { type } = objectifySchema;

  const hasPolymorphism = usesPolymorphism(objectifySchema);
  if (hasPolymorphism === 'allOf') {
    try {
      return sampleFromSchema(
        mergeJSONSchemaAllOf(objectifySchema, {
          resolvers: {
            // Ignore any unrecognized OAS-specific keywords that might be present on the schema
            // (like `xml`).
            defaultResolver: mergeJSONSchemaAllOf.options.resolvers.title,
          },
        }),
        opts,
      );
    } catch {
      return undefined;
    }
  } else if (hasPolymorphism) {
    const samples = (objectifySchema[hasPolymorphism] as SchemaObject[]).map(s => {
      return sampleFromSchema(s, opts);
    });

    if (samples.length === 1) {
      return samples[0];
    } else if (samples.some(s => s === null)) {
      // If one of our samples is null then we should try to surface the first non-null one.
      return samples.find(s => s !== null);
    }

    // If we still don't have a sample then we should just return whatever the first sample we've
    // got is. The sample might not be a _full_ example but it should be enough to act as a sample.
    return samples[0];
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

  if (type === 'object' || (Array.isArray(type) && type.includes('object'))) {
    const props = objectify(properties);
    const obj: Record<string, any> = {};
    for (const name in props) {
      if (props?.[name].deprecated) {
        continue;
      }

      if (props?.[name].readOnly && !includeReadOnly) {
        continue;
      }

      if (props?.[name].writeOnly && !includeWriteOnly) {
        continue;
      }

      if (props[name].examples?.length) {
        obj[name] = props[name].examples[0];
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

  if (type === 'array' || (Array.isArray(type) && type.includes('array'))) {
    // `items` should always be present on arrays, but if it isn't we should at least do our best
    // to support its absence.
    if (typeof items === 'undefined') {
      return [];
    }

    if (Array.isArray(items.anyOf)) {
      return items.anyOf.map((i: SchemaObject) => sampleFromSchema(i, opts));
    }

    if (Array.isArray(items.oneOf)) {
      return items.oneOf.map((i: SchemaObject) => sampleFromSchema(i, opts));
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

const memo: typeof sampleFromSchema = memoize(sampleFromSchema);

// biome-ignore lint/style/noDefaultExport: This is safe for now.
export default memo;
