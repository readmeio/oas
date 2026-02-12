import type { toJSONSchemaOptions } from '../../lib/openapi-to-json-schema.js';
import type { ComponentsObject, MediaTypeObject, OASDocument, ResponseObject, SchemaObject } from '../../types.js';
import type { Operation } from '../index.js';

import { cloneObject } from '../../lib/clone-object.js';
import { dereferenceRef } from '../../lib/dereferenceRef.js';
import { isPrimitive } from '../../lib/helpers.js';
import matches from '../../lib/matches-mimetype.js';
import { getSchemaVersionString, toJSONSchema } from '../../lib/openapi-to-json-schema.js';
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
 * @note This does not support OpenAPI 3.1's header format.
 * @todo Add support for `content`
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#header-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.3.md#header-object}
 * @param response Response object to build a JSON Schema object for its headers for.
 */
function buildHeadersSchema(response: ResponseObject, opts?: Pick<toJSONSchemaOptions, 'transformer' | 'api'>) {
  const headersSchema: SchemaObject = {
    type: 'object',
    properties: {},
  };

  if (response.headers) {
    Object.keys(response.headers).forEach(key => {
      const header = dereferenceRef(response.headers?.[key], opts?.api);
      if (!header || isRef(header) || !header.schema) {
        // If this header is invalid or we're unable to be dereferenced then it should be ignored.
        return;
      }

      /**
       * This `SchemaObject` type casting is messy but `toJSONSchema()` supports it and
       * `ReferenceObject` but formally typing that in `toJSONSchema()` breaks much of its
       * internal typing.
       * @fixme
       */
      // biome-ignore lint/style/noNonNullAssertion: This is guaranteed.
      headersSchema.properties![key] = toJSONSchema(header.schema as SchemaObject, {
        addEnumsToDescriptions: true,
        ...opts,
      });

      if (header.description) {
        // biome-ignore lint/style/noNonNullAssertion: This is guaranteed.
        headersSchema.properties![key].description = header.description;
      }
    });
  }

  const headersWrapper: {
    description?: string;
    label: 'Headers';
    schema: SchemaObject;
    type: 'object';
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
 * Note: This expects a dereferenced schema.
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

    /**
     * With a transformer you can transform any data within a given schema, like say if you want
     * to rewrite a potentially unsafe `title` that might be eventually used as a JS variable
     * name, just make sure to return your transformed schema.
     */
    transformer?: toJSONSchemaOptions['transformer'];
  },
): ResponseSchemaObject[] | null {
  let response = operation.getResponseByStatusCode(statusCode);
  if (!response) {
    return null;
  } else if (isRef(response)) {
    response = dereferenceRef(response, api);
    if (!response || isRef(response)) {
      // If our response is still a `$ref` after a dereferencing attempt then we should ignore it.
      return null;
    }
  }

  const jsonSchema: ResponseSchemaObject[] = [];
  let hasCircularRefs = false;
  let hasDiscriminatorMappingRefs = false;

  function refLogger(ref: string, type: 'discriminator' | 'ref') {
    if (type === 'ref') {
      hasCircularRefs = true;
    } else {
      hasDiscriminatorMappingRefs = true;
    }
  }

  /**
   * @param content An array of `MediaTypeObject`'s to retrieve a preferred schema out of. We
   *    prefer JSON media types.
   * @param preferredContentType Optional content-type to use. If specified and not found, returns null.
   */
  function getPreferredSchema(content: Record<string, MediaTypeObject>, preferredContentType?: string) {
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
        /** @fixme type this to allow for `ReferenceObject` */
        const clonedSchema = cloneObject(content[preferredContentType].schema) as SchemaObject;
        return toJSONSchema(clonedSchema, {
          addEnumsToDescriptions: true,
          refLogger,
          transformer: opts?.transformer,
          api,
        });
      }
      // Requested content-type not found, return null
      return null;
    }

    // Default behavior: prefer JSON media types
    for (let i = 0; i < contentTypes.length; i++) {
      if (isJSON(contentTypes[i])) {
        /** @fixme type this to allow for `ReferenceObject` */
        const clonedSchema = cloneObject(content[contentTypes[i]].schema) as SchemaObject;
        return toJSONSchema(clonedSchema, {
          addEnumsToDescriptions: true,
          refLogger,
          transformer: opts?.transformer,
          api,
        });
      }
    }

    // We always want to prefer the JSON-compatible content types over everything else but if we
    // haven't found one we should default to the first available.
    const contentType = contentTypes.shift();
    if (!contentType) {
      return null;
    }

    /** @fixme type this to allow for `ReferenceObject` */
    const clonedSchema = cloneObject(content[contentType].schema) as SchemaObject;
    return toJSONSchema(clonedSchema, {
      addEnumsToDescriptions: true,
      refLogger,
      transformer: opts?.transformer,
      api,
    });
  }

  const foundSchema = getPreferredSchema(response.content ?? {}, opts?.contentType);

  // If a specific content-type was requested but not found, return null immediately
  if (opts?.contentType && !foundSchema) {
    return null;
  }

  if (foundSchema) {
    const schema = cloneObject(foundSchema);
    const schemaWrapper: {
      description?: string;
      label: string;
      schema: SchemaObject;
      type: string[] | string;
    } = {
      // If there's no `type` then the root schema is a circular `$ref` that we likely won't be
      // able to render so instead of generating a JSON Schema with an `undefined` type we should
      // default to `string` so there's at least *something* the end-user can interact with.
      type: foundSchema.type || 'string',
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

    /**
     * Since this library assumes that the schema has already been dereferenced, adding every
     * component here that **isn't** circular adds a ton of bloat so it'd be cool if `components`
     * was just the remaining `$ref` pointers that are still being referenced.
     *
     * @todo
     */
    if (api.components && schemaWrapper.schema) {
      // We should only include components if we've got circular refs or we have discriminator
      // mapping refs (we want to include them).
      if (hasCircularRefs || (hasDiscriminatorMappingRefs && opts?.includeDiscriminatorMappingRefs)) {
        (schemaWrapper.schema.components as ComponentsObject) = api.components as ComponentsObject;
      }
    }

    jsonSchema.push(schemaWrapper);
  }

  // 3.0.3 and earlier headers. TODO: New format for 3.1.0
  if (response.headers) {
    jsonSchema.push(buildHeadersSchema(response, opts));
  }

  return jsonSchema.length ? jsonSchema : null;
}
