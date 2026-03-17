import type { OASDocument, ParameterObject, SchemaObject } from 'oas/types';

import { isRef } from 'oas/types';
import { dereferenceRef, getParameterContentType as getParameterContentTypeUtil } from 'oas/utils';

import { get } from './lodash.js';

/**
 * Determine if a schema `type` is, or contains, a specific discriminator.
 *
 */
export function hasSchemaType(
  schema: SchemaObject,
  discriminator: 'array' | 'boolean' | 'integer' | 'null' | 'number' | 'object' | 'string',
): boolean {
  if (Array.isArray(schema.type)) {
    return schema.type.includes(discriminator);
  }

  return schema.type === discriminator;
}

/**
 * Because some request body schema shapes might not always be a top-level `properties`, instead
 * nesting it in an `oneOf` or `anyOf` we need to extract the first usable schema that we have. If
 * we don't do this then these non-conventional request body schema payloads may not be properly
 * represented in the HAR that we generate.
 *
 */
export function getSafeRequestBody(obj: any): any {
  if ('oneOf' in obj) {
    return getSafeRequestBody(obj.oneOf[0]);
  } else if ('anyOf' in obj) {
    return getSafeRequestBody(obj.anyOf[0]);
  }

  return obj;
}

interface Options {
  parentIsArray?: boolean;
  parentKey?: string;
  payload: unknown;
}

interface SubschemaEntry {
  key: string;
  schema: SchemaObject;
  parentIsArray?: boolean;
}

function getSubschemas(schema: SchemaObject, api: OASDocument, opts: Options): SubschemaEntry[] | false {
  let subSchemaDataSize = 0;
  if (opts.parentIsArray) {
    // If we don't have data for this parent schema in our body payload then we
    // shouldn't bother spidering further into the schema looking for more `format`s
    // for data that definitely doesn't exist.
    const parentData = get(opts.payload, opts.parentKey || '');
    if (parentData === undefined || !Array.isArray(parentData)) {
      return false;
    }

    subSchemaDataSize = parentData.length;
  }

  let subschemas: SubschemaEntry[] = [];
  if (subSchemaDataSize > 0) {
    for (let idx = 0; idx < subSchemaDataSize; idx += 1) {
      const foundSubschemas = getSubschemas(schema, api, {
        ...opts,
        parentIsArray: false,
        parentKey: opts.parentKey ? [opts.parentKey, idx].join('.') : String(idx),
      });

      if (foundSubschemas) {
        subschemas = subschemas.concat(foundSubschemas);
      }
    }
  } else {
    let resolvedSchema = schema;
    if (schema && isRef(schema)) {
      resolvedSchema = dereferenceRef(schema, api);
      if (!resolvedSchema || isRef(resolvedSchema)) {
        return subschemas;
      }
    }

    const baseKey = opts.parentKey ?? '';

    // Collect subschemas from this objects `properties`, dereferencing `$ref` pointers and
    // building up a collection of dot-notation keys for each schema.
    if (resolvedSchema.properties && typeof resolvedSchema.properties === 'object') {
      for (const [propName, propSchema] of Object.entries(resolvedSchema.properties)) {
        if (propSchema && typeof propSchema === 'object') {
          const resolved = isRef(propSchema) ? dereferenceRef(propSchema, api) : propSchema;
          if (resolved && !isRef(resolved)) {
            subschemas.push({
              key: baseKey ? [baseKey, propName].join('.') : propName,
              schema: resolved,
            });
          }
        }
      }
    }

    // When the schema has no formal `properties` we need to enumerate through each of its available
    // property keys, collecting subschemas and dot-notation keysfrom each value. Generally we'll
    // hit this block when processing data like OpenAPI Media Type objects.
    if (
      !('properties' in resolvedSchema) &&
      typeof resolvedSchema === 'object' &&
      !('type' in resolvedSchema && resolvedSchema.type !== 'object')
    ) {
      for (const [propName, propSchema] of Object.entries(resolvedSchema)) {
        if (propSchema && (Array.isArray(propSchema) || (typeof propSchema === 'object' && propSchema !== null))) {
          const raw = getSafeRequestBody(propSchema);
          const resolved = isRef(raw) ? dereferenceRef(raw, api) : raw;
          const toPush = resolved && !isRef(resolved) ? resolved : raw;
          if (toPush && typeof toPush === 'object') {
            subschemas.push({
              key: baseKey ? [baseKey, propName].join('.') : propName,
              schema: toPush,
            });
          }
        }
      }
    }

    if ('items' in resolvedSchema && resolvedSchema.items !== undefined && resolvedSchema.items !== true) {
      const itemsSchema = resolvedSchema.items as SchemaObject;
      const resolved = isRef(itemsSchema) ? dereferenceRef(itemsSchema, api) : itemsSchema;
      if (resolved && !isRef(resolved)) {
        subschemas.push({
          key: baseKey,
          schema: resolved,
          parentIsArray: true,
        });
      }
    }
  }

  return subschemas;
}

/**
 * With a supplied JSON Schema object, spider through it for any schemas that may contain specific
 * kind of `format` that also happen to be within the current `requestBody` payload that we're
 * creating a HAR representation for.
 *
 */
export function getTypedFormatsInSchema(
  format: 'binary' | 'json',
  schema: SchemaObject,
  api: OASDocument,
  opts: Options,
): (boolean | string)[] | boolean | string {
  try {
    if (schema?.format === format) {
      if (opts.parentIsArray) {
        const parentData = get(opts.payload, opts.parentKey || '');
        if (parentData !== undefined && Array.isArray(parentData)) {
          return Object.keys(parentData)
            .map(pdk => {
              const currentKey = [opts.parentKey, pdk].join('.');
              if (get(opts.payload, currentKey) !== undefined) {
                return currentKey;
              }

              return false;
            })
            .filter(Boolean);
        }
      } else if (opts.parentKey && get(opts.payload, opts.parentKey) !== undefined) {
        return opts.parentKey;
      } else if (!opts.parentKey && opts.payload !== undefined) {
        // If this payload is present and we're looking for a specific format then we should assume
        // that the **root** schema of the request body is that format, and we aren't trafficking in
        // a nested object or array schema.
        return true;
      }

      return false;
    }

    const subschemas = getSubschemas(schema, api, opts);
    if (!subschemas) {
      return false;
    }

    return subschemas
      .flatMap(({ key, schema: subschema, parentIsArray: entryIsArray }) => {
        if (isRef(subschema)) {
          const resolved = dereferenceRef(subschema, api);
          if (resolved && !isRef(resolved)) {
            return resolved;
          }

          return false;
        }

        return getTypedFormatsInSchema(format, subschema, api, {
          payload: opts.payload,
          parentKey: key,
          parentIsArray: entryIsArray,
        });
      })
      .filter(Boolean);
  } catch {
    // If this fails for whatever reason then we should act as if we didn't find any `format`'d
    // schemas.
    return [];
  }
}

/**
 * Extract content type from a parameter's `content` field.
 * According to OAS spec, when `content` is present, `style` and `explode` are ignored.
 * We prioritize `application/json` and other JSON-like content types over other content types.
 * Note: this is just a safe guard. In OAS parser, we enforce that there is exactly one content type.
 *
 * @param param - The parameter object
 * @returns The content type, or `null` if no content is present
 */
export function getParameterContentType(param: ParameterObject): string | null {
  if (!('content' in param) || typeof param.content !== 'object' || !param.content) {
    return null;
  }

  const contentKeys = Object.keys(param.content);
  if (contentKeys.length < 1) {
    return null;
  }

  return getParameterContentTypeUtil(contentKeys) || null;
}

/**
 * Extract schema from a parameter's `content` field.
 *
 * @param param - The parameter object
 * @param contentType - The content type
 * @returns The schema, or `null` if no schema is present
 */
export function getParameterContentSchema(param: ParameterObject, contentType: string): SchemaObject | null {
  if (!('content' in param) || typeof param.content !== 'object' || !param.content) {
    return null;
  }

  const mediaTypeObject = param.content[contentType];
  if (typeof mediaTypeObject === 'object' && mediaTypeObject && 'schema' in mediaTypeObject && mediaTypeObject.schema) {
    return isRef(mediaTypeObject.schema) ? null : (mediaTypeObject.schema as SchemaObject);
  }

  return null;
}

/**
 * Recursively parse string values that are valid JSON.
 *
 * This is used when we're dealing with objects that have nested `format: json` descriptors.
 */
export function parseJsonStringsInBody(obj: unknown): unknown {
  if (typeof obj === 'string') {
    try {
      const p = JSON.parse(obj);
      return typeof p === 'object' && p !== null ? parseJsonStringsInBody(p) : p;
    } catch {
      return obj;
    }
  }

  if (Array.isArray(obj)) {
    return obj.map(parseJsonStringsInBody);
  }

  if (obj !== null && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = parseJsonStringsInBody(v);
    }

    return out;
  }

  return obj;
}
