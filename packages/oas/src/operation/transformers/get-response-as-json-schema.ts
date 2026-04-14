import type { toJSONSchemaOptions } from '../../lib/openapi-to-json-schema.js';
import type { HeaderObject, MediaTypeObject, OASDocument, ResponseObject, SchemaObject } from '../../types.js';
import type { Operation } from '../index.js';

import { applyDiscriminatorOneOfToUsedSchemas } from '../../lib/build-discriminator-one-of.js';
import { cloneObject } from '../../lib/clone-object.js';
import { isPrimitive } from '../../lib/helpers.js';
import matches from '../../lib/matches-mimetype.js';
import { getSchemaVersionString, toJSONSchema } from '../../lib/openapi-to-json-schema.js';
import { dereferenceRef, filterRequiredRefsToReferenced, mergeReferencedSchemasIntoRoot } from '../../lib/refs.js';
import { isRef } from '../../types.js';

export interface ResponseSchemaObject {
  description?: string;
  label: string;
  schema: SchemaObject;
  type: string[] | string;
}

const isJSON = matches.json;

/**
 * Turn a header map from OpenAPI 3.0 (and some earlier versions too) into a schema.
 *
 * Note: This does not support OpenAPI 3.1's header format.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#header-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.3.md#header-object}
 * @param response Response object to build a JSON Schema object for its headers for.
 * @param schemaOptions Optional options to pass to toJSONSchema (e.g. for ref resolution).
 */
function buildHeadersSchema(response: ResponseObject, schemaOptions: toJSONSchemaOptions) {
  const headersSchema: SchemaObject = {
    type: 'object',
    properties: {},
  };

  const api = schemaOptions.definition;
  const seenRefs = schemaOptions.seenRefs ?? new Set<string>();

  if (response.headers) {
    Object.keys(response.headers).forEach(key => {
      let headerEntry = response.headers?.[key];
      if (!headerEntry) return;
      if (isRef(headerEntry)) {
        headerEntry = dereferenceRef(headerEntry, api, seenRefs);
        if (!headerEntry || isRef(headerEntry)) return;
      }

      if (headerEntry.schema) {
        const header: HeaderObject = headerEntry;

        let headerSchema = header.schema;
        if (!headerSchema) return;
        if (isRef(headerSchema)) {
          headerSchema = dereferenceRef(headerSchema, api, seenRefs);
          if (!headerSchema || isRef(headerSchema)) return;
        }

        // TODO: Response headers are essentially parameters in OAS
        //    This means they can have content instead of schema.
        //    We should probably support that in the future
        headersSchema.properties![key] = toJSONSchema(cloneObject(headerSchema), {
          addEnumsToDescriptions: true,
          ...schemaOptions,
        });

        if (header.description) {
          headersSchema.properties![key].description = header.description;
        }
      }
    });
  }

  const headersWrapper: {
    description?: string;
    label: string;
    schema: SchemaObject;
    type: string;
  } = {
    schema: headersSchema,
    type: 'object',
    label: 'Headers',
  };

  if (response.description && headersWrapper.schema) {
    headersWrapper.description = response.description;
  }

  return headersWrapper;
}

/**
 * Extract all the response schemas, matching the format of `get-parameters-as-json-schema`.
 *
 * This automatically resolves `$ref` pointers on the fly and attaches used schemas as components
 * within the generated JSON Schema object.
 *
 * @param operation Operation to construct a response JSON Schema for.
 * @param api The OpenAPI definition that this operation originates.
 * @param statusCode The response status code to generate a schema for.
 * @param opts Options for schema generation.
 * @param opts.contentType Optional content-type to use. If specified and the response doesn't have
 *   this content-type, the function will return null.
 */
export function getResponseAsJSONSchema(
  operation: Operation,
  api: OASDocument,
  statusCode: number | string,
  opts?: {
    includeDiscriminatorMappingRefs?: boolean;
    /**
     * Optional content-type to use. If specified and the response doesn't have this content-type,
     * the function will return null.
     */
    contentType?: string;
  },
): ResponseSchemaObject[] | null {
  const response = operation.getResponseByStatusCode(statusCode);
  const jsonSchema: ResponseSchemaObject[] = [];

  if (!response) {
    return null;
  }

  const usedSchemas = new Map<string, SchemaObject>();
  const seenRefs = new Set<string>();
  const refsByGroup = new Map<'body' | 'headers', Set<string>>();

  function refLoggerForSchemaGroup(group: 'body' | 'headers'): Set<string> {
    let set = refsByGroup.get(group);
    if (!set) {
      set = new Set();
      refsByGroup.set(group, set);
    }
    return set;
  }

  const baseSchemaOptions: toJSONSchemaOptions = {
    addEnumsToDescriptions: true,
    definition: api,
    seenRefs,
    usedSchemas,
    refLogger: ref => refLoggerForSchemaGroup('body').add(ref),
  };

  /**
   * @param content An array of `MediaTypeObject`'s to retrieve a preferred schema out of. We
   *    prefer JSON media types.
   * @param preferredContentType Optional content-type to use. If specified and not found, returns null.
   */
  function getPreferredSchema(content: Record<string, MediaTypeObject> | undefined, preferredContentType?: string) {
    if (!content) {
      return null;
    }

    const contentTypes = Object.keys(content);
    if (!contentTypes.length) {
      return null;
    }

    // If a specific content-type is requested, use it if it exists
    if (preferredContentType) {
      if (contentTypes.includes(preferredContentType)) {
        const schema = cloneObject(content[preferredContentType].schema);
        if (!schema) {
          return null;
        }

        return toJSONSchema(schema, baseSchemaOptions);
      }

      // Requested `content-type` not found, return null
      return null;
    }

    // Default behavior: prefer JSON media types
    for (let i = 0; i < contentTypes.length; i++) {
      if (isJSON(contentTypes[i])) {
        const schema = cloneObject(content[contentTypes[i]].schema);
        if (!schema) {
          return {};
        }

        return toJSONSchema(schema, baseSchemaOptions);
      }
    }

    // We always want to prefer the JSON-compatible content types over everything else but if we
    // haven't found one we should default to the first available.
    const contentType = contentTypes.shift();
    if (!contentType) {
      return {};
    }

    const schema = cloneObject(content[contentType].schema);
    if (!schema) {
      return {};
    }

    return toJSONSchema(schema, baseSchemaOptions);
  }

  const foundSchema = getPreferredSchema(response.content, opts?.contentType);

  // If a specific content-type was requested but not found, return null immediately
  if (opts?.contentType && !foundSchema) {
    return null;
  }

  if (foundSchema) {
    const schema = structuredClone(foundSchema);
    let schemaType = foundSchema.type;

    // If our found schema is a `$ref` pointer then we should try to resolve its type so we can
    // surface that to the root schema as its overall `type`.
    if (schemaType === undefined && isRef(foundSchema) && usedSchemas.size > 0) {
      const resolvedSchema = usedSchemas.get(foundSchema.$ref);
      const resolvedType =
        resolvedSchema && typeof resolvedSchema === 'object' && 'type' in resolvedSchema
          ? resolvedSchema.type
          : undefined;

      schemaType = Array.isArray(resolvedType) ? resolvedType[0] : resolvedType;
    }

    const schemaWrapper: {
      description?: string;
      label: string;
      schema: SchemaObject;
      type: string[] | string;
    } = {
      // If there's no `type` then the root schema is a circular `$ref` that we likely won't be
      // able to render so instead of generating a JSON Schema with an `undefined` type we should
      // default to `string` so there's at least *something* the end-user can interact with.
      type: schemaType ?? 'string',
      schema: isPrimitive(schema)
        ? schema
        : {
            ...schema,
            $schema: getSchemaVersionString(schema, api),
          },
      label: 'Response body',
    };

    if (response.description && schemaWrapper.schema) {
      schemaWrapper.description = response.description;
    }

    // Apply discriminator `oneOf` to used schemas.
    applyDiscriminatorOneOfToUsedSchemas(api, usedSchemas, (ref: string) => {
      if (usedSchemas.has(ref)) {
        return usedSchemas.get(ref);
      }

      try {
        const resolved = dereferenceRef({ $ref: ref }, api, seenRefs);
        if (isRef(resolved)) return;
        const converted = toJSONSchema(structuredClone(resolved), {
          ...baseSchemaOptions,
          seenRefs,
        });

        usedSchemas.set(ref, converted);
        return converted;
      } catch {
        // no-op
      }
    });

    // Include only schemas that are still referenced in the output; merge them into the root at their ref paths.
    if (schemaWrapper.schema && usedSchemas.size > 0) {
      const refsInGroup = refsByGroup.get('body') ?? new Set<string>();
      const referencedSchemas = filterRequiredRefsToReferenced(refsInGroup, usedSchemas);

      if (referencedSchemas.size > 0) {
        mergeReferencedSchemasIntoRoot(schemaWrapper.schema, referencedSchemas);
      }
    }

    jsonSchema.push(schemaWrapper);
  }

  // 3.0.3 and earlier headers. TODO: New format for 3.1.0
  if (response.headers) {
    const headersWrapper = buildHeadersSchema(response, {
      ...baseSchemaOptions,
      refLogger: ref => refLoggerForSchemaGroup('headers').add(ref),
    });

    if (headersWrapper.schema && usedSchemas.size > 0) {
      const refsInGroup = refsByGroup.get('headers') ?? new Set();
      const referencedSchemas = filterRequiredRefsToReferenced(refsInGroup, usedSchemas);

      if (referencedSchemas.size > 0) {
        mergeReferencedSchemasIntoRoot(headersWrapper.schema, referencedSchemas);
      }
    }

    jsonSchema.push(headersWrapper);
  }

  return jsonSchema.length ? jsonSchema : null;
}
