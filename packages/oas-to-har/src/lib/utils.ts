import type { OASDocument, ParameterObject, SchemaObject } from 'oas/types';

import { isRef } from 'oas/types';
import { dereferenceRef, dereferenceRefDeep, getParameterContentType as getParameterContentTypeUtil } from 'oas/utils';

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
 * When we only have a schema fragment (no request payload), peel a single top-level polymorphic
 * schema to its first branch so we can enumerate its properties.
 *
 */
function unwrapFirstPolymorphicBranch(obj: SchemaObject): SchemaObject {
  if (obj.oneOf && Array.isArray(obj.oneOf) && obj.oneOf.length) {
    return unwrapFirstPolymorphicBranch(obj.oneOf[0] as SchemaObject);
  }

  if (obj.anyOf && Array.isArray(obj.anyOf) && obj.anyOf.length) {
    return unwrapFirstPolymorphicBranch(obj.anyOf[0] as SchemaObject);
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
  parentIsArray?: boolean;
  schema: SchemaObject;
}

function getSubschemas(
  schema: SchemaObject,
  api: OASDocument,
  opts: Options,
  seenRefs: Set<string> = new Set(),
): SubschemaEntry[] | false {
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
      const foundSubschemas = getSubschemas(
        schema,
        api,
        {
          ...opts,
          parentIsArray: false,
          parentKey: opts.parentKey ? [opts.parentKey, idx].join('.') : String(idx),
        },
        seenRefs,
      );

      if (foundSubschemas) {
        subschemas = subschemas.concat(foundSubschemas);
      }
    }
  } else {
    let resolvedSchema = schema;
    if (schema && isRef(schema)) {
      // Skip $refs we've already visited to prevent infinite recursion on circular references
      if (seenRefs.has(schema.$ref)) {
        return subschemas;
      }
      seenRefs.add(schema.$ref);

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
          let resolved: SchemaObject | undefined;
          if (isRef(propSchema)) {
            if (seenRefs.has(propSchema.$ref)) {
              // oxlint-disable-next-line no-continue
              continue;
            }

            seenRefs.add(propSchema.$ref);
            resolved = dereferenceRef(propSchema, api);
          } else {
            resolved = propSchema;
          }

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
          const raw = unwrapFirstPolymorphicBranch(propSchema as SchemaObject);
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
      let resolved: SchemaObject | undefined;
      if (isRef(itemsSchema)) {
        if (!seenRefs.has(itemsSchema.$ref)) {
          seenRefs.add(itemsSchema.$ref);
          resolved = dereferenceRef(itemsSchema, api);
        }
      } else {
        resolved = itemsSchema;
      }

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
  seenRefs: Set<string> = new Set(),
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

    const subschemas = getSubschemas(schema, api, opts, seenRefs);
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

        return getTypedFormatsInSchema(
          format,
          subschema,
          api,
          {
            payload: opts.payload,
            parentKey: key,
            parentIsArray: entryIsArray,
          },
          seenRefs,
        );
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
export function parseJSONStrings(obj: unknown): unknown {
  if (typeof obj === 'string') {
    try {
      const p = JSON.parse(obj);
      return typeof p === 'object' && p !== null ? parseJSONStrings(p) : p;
    } catch {
      return obj;
    }
  }

  if (Array.isArray(obj)) {
    return obj.map(parseJSONStrings);
  }

  if (obj !== null && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = parseJSONStrings(v);
    }

    return out;
  }

  return obj;
}

/**
 * Like {@link parseJSONStrings} but only parses string values that are clearly JSON objects or
 * arrays (after trim, starts with `{` or `[`). Used for payload keys that are not declared on the
 * schema's `properties` map so numerical strings are not coerced into numbers.
 */
function parseJSONStringsObjectContainersOnly(obj: unknown): unknown {
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(obj);
        return parseJSONStringsObjectContainersOnly(parsed);
      } catch {
        return obj;
      }
    }

    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(parseJSONStringsObjectContainersOnly);
  }

  if (obj !== null && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = parseJSONStringsObjectContainersOnly(v);
    }

    return out;
  }

  return obj;
}

function mergePropertiesFromAllOf(
  allOf: SchemaObject[],
  api: OASDocument,
  seenRefs: Set<string>,
): Record<string, SchemaObject> | undefined {
  const merged: Record<string, SchemaObject> = {};
  let found = false;

  for (const branch of allOf) {
    // oxlint-disable-next-line no-use-before-define
    const collected = collectSchemaObjectProperties(branch, api, new Set(seenRefs));
    if (collected) {
      found = true;
      Object.assign(merged, collected);
    }
  }

  return found ? merged : undefined;
}

function collectSchemaObjectProperties(
  schema: SchemaObject,
  api: OASDocument,
  seenRefs: Set<string>,
): Record<string, SchemaObject> | undefined {
  let node: SchemaObject | undefined = schema;

  if (isRef(node)) {
    if (seenRefs.has(node.$ref)) {
      return undefined;
    }

    seenRefs.add(node.$ref);
    const deref = dereferenceRef(node, api);
    if (!deref || isRef(deref)) {
      return undefined;
    }

    node = deref;
  }

  const safe = unwrapFirstPolymorphicBranch(node);
  if (isRef(safe)) {
    return collectSchemaObjectProperties(safe, api, seenRefs);
  }

  node = safe;

  if (node) {
    if ('allOf' in node && Array.isArray(node.allOf) && node.allOf.length) {
      return mergePropertiesFromAllOf(node.allOf as SchemaObject[], api, seenRefs);
    }

    if (node.properties && typeof node.properties === 'object') {
      return node.properties as Record<string, SchemaObject>;
    }
  }

  return undefined;
}

function getPayloadPropertyKeys(payload: unknown): string[] {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return [];
  }

  return Object.keys(payload as Record<string, unknown>).filter(
    k => typeof (payload as Record<string, unknown>)[k] !== 'undefined',
  );
}

function getPolymorphicSchema(node: SchemaObject): SchemaObject[] | null {
  return node.oneOf && Array.isArray(node.oneOf) && node.oneOf.length
    ? (node.oneOf as SchemaObject[])
    : node.anyOf && Array.isArray(node.anyOf) && node.anyOf.length
      ? (node.anyOf as SchemaObject[])
      : null;
}

/**
 * Choose a single branch from a polymorphic schema that best matches the payload we have.
 *
 * A branch matches when every non-`undefined` payload key exists on that branch's merged object
 * properties. If we have no payload, or no branches match, we use the first branch.
 *
 * When several branches match the one with the fewest declared properties wins, which would get us
 * as close to a best match as possible, however having more data in our payload would give us more
 * insight into which branch is what the user wants.
 */
function pickPolymorphicBranch(alternatives: SchemaObject[], keys: string[], api: OASDocument): SchemaObject {
  if (!keys.length) {
    return alternatives[0];
  }

  const scored = alternatives.map((branch, idx) => {
    const props = collectSchemaObjectProperties(branch, api, new Set<string>());
    const allMatch = Boolean(props && keys.every(k => Object.prototype.hasOwnProperty.call(props, k)));
    const propCount = props ? Object.keys(props).length : Number.POSITIVE_INFINITY;

    return { idx, branch, allMatch, propCount };
  });

  const matches = scored.filter(entry => entry.allMatch);
  if (matches.length === 1) return matches[0].branch;
  if (matches.length > 1) {
    matches.sort((a, b) => a.propCount - b.propCount || a.idx - b.idx);
    return matches[0].branch;
  }

  return scored[0].branch;
}

/**
 * Resolve a request-body JSON Schema against a concrete payload.
 *
 */
export function getSafeRequestBody(schema: SchemaObject, payload: unknown, api: OASDocument): SchemaObject {
  // This isn't ideal but let's do a full dereference of our current schema so we can quickly pick
  // up and determine the polymorphic branch we need to use for this payload.
  let resolved = dereferenceRefDeep(schema, api);

  const keys = getPayloadPropertyKeys(payload);

  // Stop when `resolved` has no top-level polymorphic schema. Each pass replaces `resolved` with
  // one branch, which may still be polymorphic, so the increment step recomputes `alternatives`
  // from the new `resolved`.
  for (
    let alternatives = getPolymorphicSchema(resolved);
    alternatives != null;
    alternatives = getPolymorphicSchema(resolved)
  ) {
    resolved = pickPolymorphicBranch(alternatives, keys, api);
  }

  if ('allOf' in resolved && Array.isArray(resolved.allOf) && resolved.allOf.length) {
    const fromAllOf = mergePropertiesFromAllOf(resolved.allOf as SchemaObject[], api, new Set());
    if (fromAllOf && Object.keys(fromAllOf).length) {
      const existing =
        resolved.properties && typeof resolved.properties === 'object' && resolved.properties !== null
          ? resolved.properties
          : {};

      resolved = {
        ...resolved,
        type: 'object',
        properties: { ...fromAllOf, ...existing },
      } as SchemaObject;
    }
  }

  return resolved;
}

/**
 * Recursively runs through a schema, parsing any values that have `format: json` attached and
 * deserializing them into their JSON representations.
 *
 * @see {@link parseJSONStrings}
 */
export function parseJSONStringsInBodyWithSchema(
  obj: unknown,
  schema: SchemaObject | undefined,
  api: OASDocument,
  seenRefs: Set<string> = new Set(),
): unknown {
  // If there's no schema then we should parse any strings that look like JSON.
  if (schema === undefined) return parseJSONStrings(obj);

  let resolved: SchemaObject = schema;
  if (isRef(schema)) {
    // If we have already processed this `$ref` before then we should stop all schema-guiding
    // parsing behaviors so we don't infinitely recurse.
    if (seenRefs.has(schema.$ref)) {
      return parseJSONStrings(obj);
    }

    seenRefs.add(schema.$ref);
    const deref = dereferenceRef(schema, api);
    if (!deref || isRef(deref)) {
      return parseJSONStrings(obj);
    }

    resolved = deref;
  }

  // If our resolved schema is a polymorphic `oneOf` or `anyOf` schema then we should use the first
  // branch of the schema to guide our parsing behavior. If the schema is _not_ polymorphic then
  // we'll use that schema as-is.
  const safe = getSafeRequestBody(resolved, obj, api);
  if (isRef(safe)) {
    return parseJSONStringsInBodyWithSchema(obj, safe, api, seenRefs);
  }

  resolved = safe;

  if ('allOf' in resolved && Array.isArray(resolved.allOf) && resolved.allOf.length) {
    const fromAllOf = mergePropertiesFromAllOf(resolved.allOf as SchemaObject[], api, new Set(seenRefs));
    if (fromAllOf && Object.keys(fromAllOf).length) {
      const existing =
        resolved.properties && typeof resolved.properties === 'object' && resolved.properties !== null
          ? resolved.properties
          : {};

      resolved = {
        ...resolved,
        type: 'object',
        properties: { ...fromAllOf, ...existing },
      } as SchemaObject;
    }
  }

  if (typeof obj === 'string') {
    // If the schema is a string but does **not** have `format: json` then it should be left alone.
    if (hasSchemaType(resolved, 'string') && resolved.format !== 'json') {
      return obj;
    }

    return parseJSONStrings(obj);
  }

  if (Array.isArray(obj)) {
    // @ts-expect-error -- `items` exists in schema objects, just the typing on `SchemaObject` is very messy.
    let items = resolved.items as SchemaObject | undefined;
    if (items && typeof items === 'object' && isRef(items)) {
      // If we've already processed this `$ref` before then we should stop all schema-guided
      // parsing behaviors so we don't infinitely recurse, instead treating what we have as it is
      // and parsing anything that looks like JSON.
      if (seenRefs.has(items.$ref)) {
        return obj.map(item => parseJSONStrings(item));
      }

      seenRefs.add(items.$ref);
      const derefItems = dereferenceRef(items, api);
      items = derefItems && !isRef(derefItems) ? derefItems : undefined;
    }

    return obj.map(item => parseJSONStringsInBodyWithSchema(item, items, api, new Set(seenRefs)));
  }

  if (obj !== null && typeof obj === 'object') {
    // If we have an object schema that doesn't have any `properties` then we should just parse
    // anything that looks like JSON within whatever we _do_ have here.
    if (!resolved.properties || typeof resolved.properties !== 'object') {
      return parseJSONStrings(obj);
    }

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const propSchema = resolved.properties[k] as SchemaObject | undefined;
      out[k] =
        propSchema !== undefined
          ? parseJSONStringsInBodyWithSchema(v, propSchema, api, new Set(seenRefs))
          : parseJSONStringsObjectContainersOnly(v);
    }

    return out;
  }

  return obj;
}
