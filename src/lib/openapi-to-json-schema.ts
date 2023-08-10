/* eslint-disable no-continue */
import type { SchemaObject } from '../rmoas.types';
import type { JSONSchema7TypeName } from 'json-schema';
import type { OpenAPIV3_1 } from 'openapi-types';

import mergeJSONSchemaAllOf from 'json-schema-merge-allof';
import jsonpointer from 'jsonpointer';
import removeUndefinedObjects from 'remove-undefined-objects';

import * as RMOAS from '../rmoas.types';

import { hasSchemaType, isObject, isPrimitive } from './helpers';

/**
 * This list has been pulled from `openapi-schema-to-json-schema` but been slightly modified to fit
 * within the constraints in which ReadMe uses the output from this library in schema form
 * rendering as while properties like `readOnly` aren't represented within JSON Schema, we support
 * it within that library's handling of OpenAPI-friendly JSON Schema.
 *
 * @see {@link https://github.com/openapi-contrib/openapi-schema-to-json-schema/blob/main/src/consts.ts}
 */
const UNSUPPORTED_SCHEMA_PROPS = [
  'example', // OpenAPI supports `example` but we're mapping it to `examples` in this library.
  'externalDocs',
  'xml',
] as const;

export interface toJSONSchemaOptions {
  /**
   * Whether or not to extend descriptions with a list of any present enums.
   */
  addEnumsToDescriptions?: boolean;

  /**
   * Current location within the schema -- this is a JSON pointer.
   */
  currentLocation?: string;

  /**
   * Object containing a global set of defaults that we should apply to schemas that match it.
   */
  globalDefaults?: Record<string, unknown>;

  /**
   * If you wish to hide properties that are marked as being `readOnly`.
   */
  hideReadOnlyProperties?: boolean;

  /**
   * If you wish to hide properties that are marked as being `writeOnly`.
   */
  hideWriteOnlyProperties?: boolean;

  /**
   * Is this schema the child of a polymorphic `allOf` schema?
   */
  isPolymorphicAllOfChild?: boolean;

  /**
   * Array of parent `default` schemas to utilize when attempting to path together schema defaults.
   */
  prevDefaultSchemas?: RMOAS.SchemaObject[];

  /**
   * Array of parent `example` schemas to utilize when attempting to path together schema examples.
   */
  prevExampleSchemas?: RMOAS.SchemaObject[];

  /**
   * A function that's called anytime a (circular) `$ref` is found.
   */
  refLogger?: (ref: string, type: 'ref' | 'discriminator') => void;

  /**
   * With a transformer you can transform any data within a given schema, like say if you want
   * to rewrite a potentially unsafe `title` that might be eventually used as a JS variable
   * name, just make sure to return your transformed schema.
   */
  transformer?: (schema: RMOAS.SchemaObject) => RMOAS.SchemaObject;
}

/**
 * List partially sourced from `openapi-schema-to-json-schema`.
 *
 * @see {@link https://github.com/openapi-contrib/openapi-schema-to-json-schema/blob/master/lib/converters/schema.js#L140-L154}
 */
const FORMAT_OPTIONS: {
  [key: `${string}_MAX`]: number;
  [key: `${string}_MIN`]: number;
} = {
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
 * Encode a string to be used as a JSON pointer.
 *
 * @see {@link https://tools.ietf.org/html/rfc6901}
 * @param str String to encode into string that can be used as a JSON pointer.
 */
function encodePointer(str: string) {
  return str.replace('~', '~0').replace('/', '~1');
}

export function getSchemaVersionString(schema: RMOAS.SchemaObject, api: RMOAS.OASDocument): string {
  // If we're not on version 3.1.0, we always fall back to the default schema version for pre-3.1.0.
  if (!RMOAS.isOAS31(api)) {
    // This should remain as an HTTP url, not HTTPS.
    return 'http://json-schema.org/draft-04/schema#';
  }

  /**
   * If the schema indicates the version, prefer that.
   *
   * We use `as` here because the schema *should* be an OAS 3.1 schema due to the `isOAS31` check
   * above.
   */
  if ((schema as OpenAPIV3_1.SchemaObject).$schema) {
    return (schema as OpenAPIV3_1.SchemaObject).$schema;
  }

  // If the user defined a global schema version on their OAS document, prefer that.
  if (api.jsonSchemaDialect) {
    return api.jsonSchemaDialect;
  }

  return 'https://json-schema.org/draft/2020-12/schema#';
}

function isPolymorphicSchema(schema: RMOAS.SchemaObject): boolean {
  return 'allOf' in schema || 'anyOf' in schema || 'oneOf' in schema;
}

function isRequestBodySchema(schema: unknown): schema is RMOAS.RequestBodyObject {
  return 'content' in (schema as RMOAS.RequestBodyObject);
}

/**
 * Given a JSON pointer, a type of property to look for, and an array of schemas do a reverse
 * search through them until we find the JSON pointer, or part of it, within the array.
 *
 * This function will allow you to take a pointer like `/tags/name` and return back `buster` from
 * the following array:
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
 * As with most things however, this is not without its quirks! If a deeply nested property shares
 * the same name as an example that's further up the stack (like `tags.id` and an example for `id`),
 * there's a chance that it'll be misidentified as having an example and receive the wrong value.
 *
 * That said, any example is usually better than no example though, so while it's quirky behavior
 * it shouldn't raise immediate cause for alarm.
 *
 * @see {@link https://tools.ietf.org/html/rfc6901}
 * @param property Specific type of schema property to look for a value for.
 * @param pointer JSON pointer to search for an example for.
 * @param schemas Array of previous schemas we've found relating to this pointer.
 */
function searchForValueByPropAndPointer(
  property: 'example' | 'default',
  pointer: string,
  schemas: toJSONSchemaOptions['prevExampleSchemas'] | toJSONSchemaOptions['prevDefaultSchemas'] = [],
) {
  if (!schemas.length || !pointer.length) {
    return undefined;
  }

  const locSplit = pointer.split('/').filter(Boolean).reverse();
  const pointers = [];

  let point = '';
  for (let i = 0; i < locSplit.length; i += 1) {
    point = `/${locSplit[i]}${point}`;
    pointers.push(point);
  }

  let foundValue;
  const rev = [...schemas].reverse();

  for (let i = 0; i < pointers.length; i += 1) {
    for (let ii = 0; ii < rev.length; ii += 1) {
      let schema = rev[ii];

      if (property === 'example') {
        if ('example' in schema) {
          schema = schema.example;
        } else {
          if (!Array.isArray(schema.examples) || !schema.examples.length) {
            continue;
          }

          // Prevent us from crashing if `examples` is a completely empty object.
          schema = [...schema.examples].shift();
        }
      } else {
        schema = schema.default;
      }

      try {
        foundValue = jsonpointer.get(schema, pointers[i]);
      } catch (err) {
        // If the schema we're looking at is `{obj: null}` and our pointer is `/obj/propertyName`
        // `jsonpointer` will throw an error. If that happens, we should silently catch and toss it
        // and return no example.
      }

      if (foundValue !== undefined) {
        break;
      }
    }

    if (foundValue !== undefined) {
      break;
    }
  }

  return foundValue;
}

/**
 * Given an OpenAPI-flavored JSON Schema, make an effort to modify it so it's shaped more towards
 * stock JSON Schema.
 *
 * Why do this?
 *
 *  1. OpenAPI 3.0.x supports its own flavor of JSON Schema that isn't fully compatible with most
 *    JSON Schema tooling (like `@readme/oas-form` or `@rjsf/core`).
 *  2. While validating an OpenAPI definition will prevent corrupted or improper schemas from
 *    occuring, we have a lot of legacy schemas in ReadMe that were ingested before we had proper
 *    validation in place, and as a result have some API definitions that will not pass validation
 *    right now. In addition to reshaping OAS-JSON Schema into JSON Schema this library will also
 *    fix these improper schemas: things like `type: object` having `items` instead of `properties`,
 *    or `type: array` missing `items`.
 *  3. To ease the burden of polymorphic handling on our form rendering engine we make an attempt
 *    to merge `allOf` schemas here.
 *  4. Additionally due to OpenAPI 3.0.x not supporting JSON Schema, in order to support the
 *    `example` keyword that OAS supports, we need to do some work in here to remap it into
 *    `examples`. However, since all we care about in respect to examples for usage within
 *    `@readme/oas-form`, we're only retaining primitives. This *slightly* deviates from JSON
 *    Schema in that JSON Schema allows for any schema to be an example, but since
 *    `@readme/oas-form` can only actually **render** primitives, that's what we're retaining.
 *  5. Though OpenAPI 3.1 does support full JSON Schema, this library should be able to handle it
 *    without any problems.
 *
 * And why use this over `@openapi-contrib/openapi-schema-to-json-schema`? Fortunately and
 * unfortunately we've got a lot of API definitions in our database that aren't currently valid so
 * we need to have a lot of bespoke handling for odd quirks, typos, and missing declarations that
 * might be present.
 *
 * @todo add support for `schema: false` and `not` cases.
 * @see {@link https://json-schema.org/draft/2019-09/json-schema-validation.html}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schemaObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#schemaObject}
 * @param data OpenAPI Schema Object to convert to pure JSON Schema.
 */
export default function toJSONSchema(
  data: RMOAS.SchemaObject | boolean,
  opts: toJSONSchemaOptions = {},
): RMOAS.SchemaObject {
  let schema = data === true ? {} : { ...data };
  const schemaAdditionalProperties = RMOAS.isSchema(schema) ? schema.additionalProperties : null;

  const {
    addEnumsToDescriptions,
    currentLocation,
    globalDefaults,
    hideReadOnlyProperties,
    hideWriteOnlyProperties,
    isPolymorphicAllOfChild,
    prevDefaultSchemas,
    prevExampleSchemas,
    refLogger,
    transformer,
  } = {
    addEnumsToDescriptions: false,
    currentLocation: '',
    globalDefaults: {},
    hideReadOnlyProperties: false,
    hideWriteOnlyProperties: false,
    isPolymorphicAllOfChild: false,
    prevDefaultSchemas: [] as toJSONSchemaOptions['prevDefaultSchemas'],
    prevExampleSchemas: [] as toJSONSchemaOptions['prevExampleSchemas'],
    refLogger: () => true,
    transformer: (s: RMOAS.SchemaObject) => s,
    ...opts,
  };

  // If this schema contains a `$ref`, it's circular and we shouldn't try to resolve it. Just
  // return and move along.
  if (RMOAS.isRef(schema)) {
    refLogger(schema.$ref, 'ref');

    return transformer({
      $ref: schema.$ref,
    });
  }

  // If we don't have a set type, but are dealing with an `anyOf`, `oneOf`, or `allOf`
  // representation let's run through them and make sure they're good.
  if (RMOAS.isSchema(schema, isPolymorphicAllOfChild)) {
    // If this is an `allOf` schema we should make an attempt to merge so as to ease the burden on
    // the tooling that ingests these schemas.
    if ('allOf' in schema && Array.isArray(schema.allOf)) {
      try {
        schema = mergeJSONSchemaAllOf(schema as RMOAS.JSONSchema, {
          ignoreAdditionalProperties: true,
          resolvers: {
            // `merge-json-schema-allof` by default takes the first `description` when you're
            // merging an `allOf` but because generally when you're merging two schemas together
            // with an `allOf` you want data in the subsequent schemas to be applied to the first
            // and `description` should be a part of that.
            description: (obj: string[]) => {
              return obj.slice(-1)[0];
            },

            // `merge-json-schema-allof` doesn't support merging enum arrays but since that's a
            // safe and simple operation as enums always contain primitives we can handle it
            // ourselves with a custom resolver.
            enum: (obj: unknown[]) => {
              let arr: unknown[] = [];
              obj.forEach(e => {
                arr = arr.concat(e);
              });

              return arr;
            },

            // JSON Schema ony supports examples with the `examples` property, since we're
            // ingesting OpenAPI definitions we need to add a custom resolver for its `example`
            // property.
            example: (obj: unknown[]) => obj[0],

            // JSON Schema has no support for `format` on anything other than `string`, but since
            // OpenAPI has it on `integer` and `number` we need to add a custom resolver here so we
            // can still merge schemas that may have those.
            format: (obj: string[]) => obj[0],

            // Since JSON Schema obviously doesn't know about our vendor extension we need to tell
            // the library to essentially ignore and pass it along.
            'x-readme-ref-name': (obj: string[]) => obj[0],
          } as unknown,
        }) as RMOAS.SchemaObject;
      } catch (e) {
        // If we can't merge the `allOf` for whatever reason (like if one item is a `string` and
        // the other is a `object`) then we should completely remove it from the schema and continue
        // with whatever we've got. Why? If we don't, any tooling that's ingesting this will need
        // to account for the incompatible `allOf` and it may be subject to more breakages than
        // just not having it present would be.
        const { ...schemaWithoutAllOf } = schema;
        schema = schemaWithoutAllOf as RMOAS.SchemaObject;
        delete schema.allOf;
      }

      // If after merging the `allOf` this schema still contains a `$ref` then it's circular and
      // we shouldn't do anything else.
      if (RMOAS.isRef(schema)) {
        refLogger(schema.$ref, 'ref');

        return transformer({
          $ref: schema.$ref,
        });
      }
    }

    ['anyOf', 'oneOf'].forEach((polyType: 'anyOf' | 'oneOf') => {
      if (polyType in schema && Array.isArray(schema[polyType])) {
        schema[polyType].forEach((item, idx) => {
          const polyOptions: toJSONSchemaOptions = {
            addEnumsToDescriptions,
            currentLocation: `${currentLocation}/${idx}`,
            globalDefaults,
            hideReadOnlyProperties,
            hideWriteOnlyProperties,
            isPolymorphicAllOfChild: false,
            prevDefaultSchemas,
            prevExampleSchemas,
            refLogger,
            transformer,
          };

          // When `properties` or `items` are present alongside a polymorphic schema instead of
          // letting whatever JSON Schema interpreter is handling these constructed schemas we can
          // guide its hand a bit by manually transforming it into an inferred `allOf` of the
          // `properties` + the polymorph schema.
          //
          // This `allOf` schema will be merged together when fed through `toJSONSchema`.
          if ('properties' in schema) {
            schema[polyType][idx] = toJSONSchema(
              { allOf: [item, { properties: schema.properties }] } as RMOAS.SchemaObject,
              polyOptions,
            );
          } else if ('items' in schema) {
            schema[polyType][idx] = toJSONSchema(
              { allOf: [item, { items: schema.items }] } as RMOAS.SchemaObject,
              polyOptions,
            );
          } else {
            schema[polyType][idx] = toJSONSchema(item as RMOAS.SchemaObject, polyOptions);
          }

          // Ensure that we don't have any invalid `required` booleans lying around.
          if (
            isObject(schema[polyType][idx]) &&
            'required' in (schema[polyType][idx] as SchemaObject) &&
            typeof (schema[polyType][idx] as SchemaObject).required === 'boolean'
          ) {
            delete (schema[polyType][idx] as SchemaObject).required;
          }
        });
      }
    });

    if ('discriminator' in schema) {
      if ('mapping' in schema.discriminator && typeof schema.discriminator.mapping === 'object') {
        // Discriminator mappings aren't written as traditional `$ref` pointers so in order to log
        // them to the supplied `refLogger`.
        const mapping = schema.discriminator.mapping;
        Object.keys(mapping).forEach(k => {
          refLogger(mapping[k], 'discriminator');
        });
      }
    }
  }

  // If this schema is malformed for some reason, let's do our best to repair it.
  if (!('type' in schema) && !isPolymorphicSchema(schema) && !isRequestBodySchema(schema)) {
    if ('properties' in schema) {
      schema.type = 'object';
    } else if ('items' in schema) {
      schema.type = 'array';
    } else {
      // If there's still no `type` on the schema we should leave it alone because we don't have a
      // great way to know if it's part of a nested schema that should, and couldn't be merged,
      // into another, or it's just purely malformed.
      //
      // Whatever tooling that ingests the generated schema should handle it however it needs to.
    }
  }

  if ('type' in schema) {
    // `nullable` isn't a thing in JSON Schema but it was in OpenAPI 3.0 so we should retain and
    // translate it into something that's compatible with JSON Schema.
    if ('nullable' in schema) {
      if (Array.isArray(schema.type)) {
        schema.type.push('null');
      } else if (schema.type !== null && schema.type !== 'null') {
        schema.type = [schema.type, 'null'];
      }

      delete schema.nullable;
    }

    if (schema.type === null) {
      // `type: null` is possible in JSON Schema but we're translating it to a string version
      // so we don't need to worry about asserting nullish types in our implementations of this
      // generated schema.
      schema.type = 'null';
    } else if (Array.isArray(schema.type)) {
      if (schema.type.includes(null)) {
        schema.type[schema.type.indexOf(null)] = 'null';
      }

      schema.type = Array.from(new Set(schema.type));

      // We don't need `type: [<type>]` when we can just as easily make it `type: <type>`.
      if (schema.type.length === 1) {
        schema.type = schema.type.shift();
      } else if (schema.type.includes('array') || schema.type.includes('boolean') || schema.type.includes('object')) {
        // If we have a `null` type but there's only two types present then we can remove `null`
        // as an option and flag the whole schema as `nullable`.
        const isNullable = schema.type.includes('null');

        if (schema.type.length === 2 && isNullable) {
          // If this is `array | null` or `object | null` then we don't need to do anything.
        } else {
          // If this mixed type has non-primitives then we for convenience of our implementation
          // we're moving them into a `oneOf`.
          const nonPrimitives: any[] = [];

          // Because arrays, booleans, and objects are not compatible with any other schem type
          // other than null we're moving them into an isolated `oneOf`, and as such want to take
          // with it its specific properties that may be present on our current schema.
          Object.entries({
            // https://json-schema.org/understanding-json-schema/reference/array.html
            array: [
              'additionalItems',
              'contains',
              'items',
              'maxContains',
              'maxItems',
              'minContains',
              'minItems',
              'prefixItems',
              'uniqueItems',
            ],

            // https://json-schema.org/understanding-json-schema/reference/boolean.html
            boolean: [
              // Booleans don't have any boolean-specific properties.
            ],

            // https://json-schema.org/understanding-json-schema/reference/object.html
            object: [
              'additionalProperties',
              'maxProperties',
              'minProperties',
              'nullable',
              'patternProperties',
              'properties',
              'propertyNames',
              'required',
            ],
          }).forEach(([typeKey, keywords]) => {
            if (!schema.type.includes(typeKey as JSONSchema7TypeName)) {
              return;
            }

            const reducedSchema: any = removeUndefinedObjects({
              type: isNullable ? [typeKey, 'null'] : typeKey,

              allowEmptyValue: (schema as any).allowEmptyValue ?? undefined,
              deprecated: schema.deprecated ?? undefined,
              description: schema.description ?? undefined,
              readOnly: schema.readOnly ?? undefined,
              title: schema.title ?? undefined,
              writeOnly: schema.writeOnly ?? undefined,
            });

            keywords.forEach((t: keyof SchemaObject) => {
              if (t in schema) {
                reducedSchema[t] = schema[t];
                delete schema[t];
              }
            });

            nonPrimitives.push(reducedSchema);
          });

          schema.type = schema.type.filter(t => t !== 'array' && t !== 'boolean' && t !== 'object');
          if (schema.type.length === 1) {
            schema.type = schema.type.shift();
          }

          // Because we may have encountered a fully mixed non-primitive type like `array | object`
          // we only want to retain the existing schema object if we still have types remaining
          // in it.
          if (schema.type.length > 1) {
            schema = { oneOf: [schema, ...nonPrimitives] };
          } else {
            schema = { oneOf: nonPrimitives };
          }
        }
      }
    }
  }

  if (RMOAS.isSchema(schema, isPolymorphicAllOfChild)) {
    if ('default' in schema && isObject(schema.default)) {
      prevDefaultSchemas.push({ default: schema.default });
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
        prevExampleSchemas.push({ example: schema.example });
      }

      delete schema.example;
    } else if ('examples' in schema) {
      let reshapedExamples = false;
      if (typeof schema.examples === 'object' && !Array.isArray(schema.examples)) {
        const examples: unknown[] = [];
        Object.keys(schema.examples).forEach(name => {
          const example = schema.examples[name as unknown as number];
          if ('$ref' in example) {
            // no-op because any `$ref` example here after dereferencing is circular so we should
            // ignore it
            refLogger(example.$ref, 'ref');
          } else if ('value' in example) {
            if (isPrimitive(example.value)) {
              examples.push(example.value);
              reshapedExamples = true;
            } else if (Array.isArray(example.value) && isPrimitive(example.value[0])) {
              examples.push(example.value[0]);
              reshapedExamples = true;
            } else {
              // If this example is neither a primitive or an array we should dump it into the
              // `prevExampleSchemas` array because we might be able to extract an example from it
              // further downstream.
              prevExampleSchemas.push({
                example: example.value,
              });
            }
          }
        });

        if (examples.length) {
          reshapedExamples = true;
          schema.examples = examples;
        }
      } else if (Array.isArray(schema.examples) && isPrimitive(schema.examples[0])) {
        // We haven't reshaped `examples` here, but since it's in a state that's preferrable to us
        // let's keep it around.
        reshapedExamples = true;
      }

      if (!reshapedExamples) {
        delete schema.examples;
      }
    }

    // If we didn't have any immediately defined examples, let's search backwards and see if we can
    // find one. But as we're only looking for primitive example, only try to search for one if
    // we're dealing with a primitive schema.
    if (!hasSchemaType(schema, 'array') && !hasSchemaType(schema, 'object') && !schema.examples) {
      const foundExample = searchForValueByPropAndPointer('example', currentLocation, prevExampleSchemas);
      if (foundExample) {
        // We can only really deal with primitives, so only promote those as the found example if
        // it is.
        if (isPrimitive(foundExample) || (Array.isArray(foundExample) && isPrimitive(foundExample[0]))) {
          schema.examples = [foundExample];
        }
      }
    }

    if (hasSchemaType(schema, 'array')) {
      if ('items' in schema) {
        if (!Array.isArray(schema.items) && Object.keys(schema.items).length === 1 && RMOAS.isRef(schema.items)) {
          // `items` contains a `$ref`, so since it's circular we should do a no-op here and log
          // and ignore it.
          refLogger(schema.items.$ref, 'ref');
        } else if (schema.items !== true) {
          // Run through the arrays contents and clean them up.
          schema.items = toJSONSchema(schema.items as RMOAS.SchemaObject, {
            addEnumsToDescriptions,
            currentLocation: `${currentLocation}/0`,
            globalDefaults,
            hideReadOnlyProperties,
            hideWriteOnlyProperties,
            prevExampleSchemas,
            refLogger,
            transformer,
          });

          // If we have a non-array `required` entry in our `items` schema then it's invalid and we
          // should remove it. We only support non-array boolean `required` properties inside object
          // properties.
          if (isObject(schema.items) && 'required' in schema.items && !Array.isArray(schema.items.required)) {
            delete schema.items.required;
          }
        }
      } else if ('properties' in schema || 'additionalProperties' in schema) {
        // This is a fix to handle cases where someone may have typod `items` as `properties` on an
        // array. Since throwing a complete failure isn't ideal, we can see that they meant for the
        // type to be `object`, so we can do our best to shape the data into what they were
        // intending it to be.
        schema.type = 'object';
      } else {
        // This is a fix to handle cases where we have a malformed array with no `items` property
        // present.
        (schema as any).items = {};
      }
    } else if (hasSchemaType(schema, 'object')) {
      if ('properties' in schema) {
        Object.keys(schema.properties).forEach(prop => {
          if (
            Array.isArray(schema.properties[prop]) ||
            (typeof schema.properties[prop] === 'object' && schema.properties[prop] !== null)
          ) {
            const newPropSchema = toJSONSchema(schema.properties[prop] as RMOAS.SchemaObject, {
              addEnumsToDescriptions,
              currentLocation: `${currentLocation}/${encodePointer(prop)}`,
              globalDefaults,
              hideReadOnlyProperties,
              hideWriteOnlyProperties,
              prevDefaultSchemas,
              prevExampleSchemas,
              refLogger,
              transformer,
            });

            // If this property is read or write only then we should fully hide it from its parent schema.
            let propShouldBeUpdated = true;
            if ((hideReadOnlyProperties || hideWriteOnlyProperties) && !Object.keys(newPropSchema).length) {
              // We should only delete this schema if it wasn't already empty though. We do this
              // because we (un)fortunately have handling in our API Explorer form system for
              // schemas that are devoid of any `type` declaration.
              if (Object.keys(schema.properties[prop]).length > 0) {
                delete schema.properties[prop];
                propShouldBeUpdated = false;
              }
            }

            if (propShouldBeUpdated) {
              schema.properties[prop] = newPropSchema;

              /**
               * JSON Schema does not have any support for `required: <boolean>` but because some
               * of our users do this, and it does not throw OpenAPI validation errors thanks to
               * some extremely loose typings around `schema` in the official JSON Schema
               * definitions that the OAI offers, we're opting to support these users and upgrade
               * their invalid `required` definitions into ones that our tooling can interpret.
               *
               * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/schemas/v3.1/schema.json#L1114-L1121}
               */
              if (
                isObject(newPropSchema) &&
                'required' in newPropSchema &&
                typeof newPropSchema.required === 'boolean' &&
                newPropSchema.required === true
              ) {
                if ('required' in schema && Array.isArray(schema.required)) {
                  schema.required.push(prop);
                } else {
                  schema.required = [prop];
                }

                delete (schema.properties[prop] as SchemaObject).required;
              }
            }
          }
        });

        // If we want to hide all readOnly or writeOnly properites and it happens to be that this
        // object was comprised of only those then we shouldn't render this object.
        if (hideReadOnlyProperties || hideWriteOnlyProperties) {
          if (!Object.keys(schema.properties).length) {
            return transformer({});
          }
        }
      }

      if (typeof schemaAdditionalProperties === 'object' && schemaAdditionalProperties !== null) {
        // If this `additionalProperties` is completely empty and devoid of any sort of schema,
        // treat it as such. Otherwise let's recurse into it and see if we can sort it out.
        if (
          !('type' in schemaAdditionalProperties) &&
          !('$ref' in schemaAdditionalProperties) &&
          // We know it will be a schema object because it's dereferenced
          !isPolymorphicSchema(schemaAdditionalProperties as RMOAS.SchemaObject)
        ) {
          schema.additionalProperties = true;
        } else {
          // We know it will be a schema object because it's dereferenced
          schema.additionalProperties = toJSONSchema(schemaAdditionalProperties as RMOAS.SchemaObject, {
            addEnumsToDescriptions,
            currentLocation,
            globalDefaults,
            hideReadOnlyProperties,
            hideWriteOnlyProperties,
            prevDefaultSchemas,
            prevExampleSchemas,
            refLogger,
            transformer,
          });
        }
      }

      // Since neither `properties` and `additionalProperties` are actually required to be present
      // on an object, since we construct this schema work to build up a form we still need
      // *something* for the user to enter in for this object so we'll add back in
      // `additionalProperties` for that.
      if (!isPolymorphicSchema(schema) && !('properties' in schema) && !('additionalProperties' in schema)) {
        schema.additionalProperties = true;
      }
    }
  }

  // Ensure that number schemas formats have properly constrained min/max attributes according to
  // whatever type of `format` and `type` they adhere to.
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

  /**
   * Users can pass in parameter defaults via JWT User Data. We're checking to see if the defaults
   * being passed in exist on endpoints via jsonpointer
   *
   * @see {@link https://docs.readme.com/docs/passing-data-to-jwt}
   */
  if (
    RMOAS.isSchema(schema, isPolymorphicAllOfChild) &&
    globalDefaults &&
    Object.keys(globalDefaults).length > 0 &&
    currentLocation
  ) {
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
    if (hasSchemaType(schema, 'object')) {
      // Defaults for `object` and types have been dereferenced into their children schemas already
      // above so we don't need to preserve this default anymore.
      delete schema.default;
    } else {
      // If it's an enum and not the response schema, add the default to the description.
      // If there's an existing description, trim trailing new lines so it doesn't look ugly.
      if ('enum' in schema && !addEnumsToDescriptions) {
        schema.description = schema.description
          ? `${schema.description.replace(/\n$/, '')}\n\nDefault: \`${schema.default}\``
          : `Default: ${schema.default}`;
      }

      if (('allowEmptyValue' in schema && schema.allowEmptyValue && schema.default === '') || schema.default !== '') {
        // If we have `allowEmptyValue` present, and the default is actually an empty string, let it
        // through as it's allowed.
      } else {
        // If the default is empty and we don't want to allowEmptyValue, we need to remove the
        // default.
        delete schema.default;
      }
    }
  } else if (prevDefaultSchemas.length) {
    const foundDefault = searchForValueByPropAndPointer('default', currentLocation, prevDefaultSchemas);

    // We shouldn't ever set an object default out of the parent lineage tree defaults because
    // the contents of that object will be set on the schema that they're a part of. Setting
    // that object as well would result us in duplicating the defaults for that schema in two
    // places.
    if (
      isPrimitive(foundDefault) ||
      foundDefault === null ||
      (Array.isArray(foundDefault) && hasSchemaType(schema, 'array'))
    ) {
      schema.default = foundDefault;
    }
  }

  if (RMOAS.isSchema(schema, isPolymorphicAllOfChild) && 'enum' in schema && Array.isArray(schema.enum)) {
    // Enums should not have duplicated items as those will break AJV validation.
    // If we ever target ES6 for typescript we can drop this array.from.
    // https://stackoverflow.com/questions/33464504/using-spread-syntax-and-new-set-with-typescript/56870548
    schema.enum = Array.from(new Set(schema.enum));

    // If we want to add enums to descriptions (like in the case of response JSON Schema)
    // generation we need to convert them into a list of Markdown tilda'd strings. We're also
    // filtering away empty and falsy strings here because adding empty `` blocks to the description
    // will serve nobody any good.
    if (addEnumsToDescriptions) {
      const enums = schema.enum
        .filter(Boolean)
        .map(str => `\`${str}\``)
        .join(' ');

      if (enums.length) {
        if ('description' in schema) {
          schema.description += `\n\n${enums}`;
        } else {
          schema.description = enums;
        }
      }
    }
  }

  // Clean up any remaining `items` or `properties` schema fragments lying around if there's also
  // polymorphism present.
  if ('anyOf' in schema || 'oneOf' in schema) {
    if ('properties' in schema) {
      delete schema.properties;
    }

    if ('items' in schema) {
      delete schema.items;
    }
  }

  // Remove unsupported JSON Schema props.
  for (let i = 0; i < UNSUPPORTED_SCHEMA_PROPS.length; i += 1) {
    // Using the as here because the purpose is to delete keys we don't expect, so of course the
    // typing won't work
    delete (schema as Record<string, unknown>)[UNSUPPORTED_SCHEMA_PROPS[i]];
  }

  // If we want to hide any `readOnly` or `writeOnly` schemas, and this one is that, then we
  // shouldn't return anything.
  if (hideReadOnlyProperties && 'readOnly' in schema && schema.readOnly === true) {
    return {};
  } else if (hideWriteOnlyProperties && 'writeOnly' in schema && schema.writeOnly === true) {
    return {};
  }

  return transformer(schema);
}
