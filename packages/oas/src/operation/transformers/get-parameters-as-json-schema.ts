import type { OpenAPIV3_1 } from 'openapi-types';
import type { toJSONSchemaOptions } from '../../lib/openapi-to-json-schema.js';
import type { ExampleObject, OASDocument, ParameterObject, SchemaObject, SchemaWrapper } from '../../types.js';
import type { Operation } from '../index.js';

import { getExtension, PARAMETER_ORDERING } from '../../extensions.js';
import { applyDiscriminatorOneOfToUsedSchemas } from '../../lib/build-discriminator-one-of.js';
import { cloneObject } from '../../lib/clone-object.js';
import { getParameterContentType } from '../../lib/get-parameter-content-type.js';
import { isPrimitive } from '../../lib/helpers.js';
import { getSchemaVersionString, toJSONSchema } from '../../lib/openapi-to-json-schema.js';
import {
  collectRefsInSchema,
  dereferenceRef,
  filterRequiredRefsToReferenced,
  mergeReferencedSchemasIntoRoot,
} from '../../lib/refs.js';
import { isRef } from '../../types.js';

/**
 * The order of this object determines how they will be sorted in the compiled JSON Schema
 * representation.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#parameter-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#parameter-object}
 */
export const types: Record<keyof OASDocument, string> = {
  path: 'Path Params',
  query: 'Query Params',
  body: 'Body Params',
  cookie: 'Cookie Params',
  formData: 'Form Data',
  header: 'Headers',
  metadata: 'Metadata', // This a special type reserved for https://npm.im/api
};

export interface getParametersAsJSONSchemaOptions {
  /**
   * Contains an object of user defined schema defaults.
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
   * If you wish to include discriminator mapping `$ref` components alongside your
   * `discriminator` in schemas. Defaults to `true`.
   */
  includeDiscriminatorMappingRefs?: boolean;

  /**
   * If you want the output to be two objects: body (contains `body` and `formData` JSON
   * Schema) and metadata (contains `path`, `query`, `cookie`, and `header`).
   */
  mergeIntoBodyAndMetadata?: boolean;
}

export function getParametersAsJSONSchema(
  operation: Operation,
  api: OASDocument,
  opts?: getParametersAsJSONSchemaOptions,
): SchemaWrapper[] | null {
  const seenRefs = new Set<string>();
  const refsByGroup = new Map<string, Set<string>>();
  const usedSchemasByGroup = new Map<string, Map<string, SchemaObject>>();

  function refLoggerForSchemaGroup(group: string) {
    let set = refsByGroup.get(group);
    if (!set) {
      set = new Set();
      refsByGroup.set(group, set);
    }

    return set;
  }

  function usedSchemasForSchemaGroup(group: string) {
    let map = usedSchemasByGroup.get(group);
    if (!map) {
      map = new Map<string, SchemaObject>();
      usedSchemasByGroup.set(group, map);
    }

    return map;
  }

  const baseSchemaOptions: toJSONSchemaOptions = {
    definition: api,
    globalDefaults: opts?.globalDefaults,
    hideReadOnlyProperties: opts?.hideReadOnlyProperties,
    hideWriteOnlyProperties: opts?.hideWriteOnlyProperties,
    seenRefs,
  };

  function transformRequestBody(): SchemaWrapper | null {
    const requestBody = operation.getRequestBody();
    if (!requestBody || !Array.isArray(requestBody)) return null;

    const [mediaType, mediaTypeObject, description] = requestBody;
    const type = mediaType === 'application/x-www-form-urlencoded' ? 'formData' : 'body';

    // If this schema is completely empty, don't bother processing it.
    if (!mediaTypeObject.schema || !Object.keys(mediaTypeObject.schema).length) {
      return null;
    }

    const prevExampleSchemas: toJSONSchemaOptions['prevExampleSchemas'] = [];
    if ('example' in mediaTypeObject) {
      prevExampleSchemas.push({ example: mediaTypeObject.example });
    } else if ('examples' in mediaTypeObject) {
      prevExampleSchemas.push({
        examples: Object.values(mediaTypeObject.examples || {})
          .map(ex => {
            let example = ex;
            if (!example) return undefined;
            if (isRef(example)) {
              example = dereferenceRef(example, operation.api);
              if (!example || isRef(example)) return undefined;
            }

            return example.value;
          })
          .filter((item): item is ExampleObject => item !== undefined),
      });
    }

    // We're cloning the request schema because we've had issues with request schemas that were
    // dereferenced being processed multiple times because their component is also processed.
    const requestSchema = cloneObject(mediaTypeObject.schema);

    const cleanedSchema = toJSONSchema(requestSchema, {
      ...baseSchemaOptions,
      usedSchemas: usedSchemasForSchemaGroup(type),
      prevExampleSchemas,
      refLogger: ref => refLoggerForSchemaGroup(type).add(ref),
    });

    // If this schema is **still** empty, don't bother returning it.
    if (!Object.keys(cleanedSchema).length) {
      return null;
    }

    return {
      type,
      label: types[type],
      schema: isPrimitive(cleanedSchema)
        ? cleanedSchema
        : {
            ...cleanedSchema,
            $schema: getSchemaVersionString(cleanedSchema, api),
          },
      ...(description ? { description } : {}),
    };
  }

  function transformParameters(): SchemaWrapper[] {
    const operationParams = operation.getParameters();

    const transformed = Object.keys(types)
      .map(type => {
        const required: string[] = [];

        // This `as` actually *could* be a ref, but we don't want refs to pass through here, so
        // `.in` will never match `type`
        const parameters = operationParams.filter(param => (param as ParameterObject).in === type);
        if (parameters.length === 0) {
          return null;
        }

        const properties = parameters.reduce((prev: Record<string, SchemaObject>, current: ParameterObject) => {
          let schema: SchemaObject = {};
          if ('schema' in current) {
            const currentSchema: SchemaObject = current.schema ? cloneObject(current.schema) : {};

            if (current.example) {
              // `example` can be present outside of the `schema` block so if it's there we should
              // pull it in so it can be handled and returned if it's valid.
              currentSchema.example = current.example;
            } else if (current.examples) {
              // `examples` isn't actually supported here in OAS 3.0, but we might as well support
              // it because `examples` is JSON Schema and that's fully supported in OAS 3.1.
              currentSchema.examples = current.examples as unknown as unknown[];
            }

            if (current.deprecated) currentSchema.deprecated = current.deprecated;

            const interimSchema = toJSONSchema(currentSchema, {
              ...baseSchemaOptions,
              usedSchemas: usedSchemasForSchemaGroup(type),
              currentLocation: `/${current.name}`,
              refLogger: ref => refLoggerForSchemaGroup(type).add(ref),
            });

            schema = isPrimitive(interimSchema) ? interimSchema : { ...interimSchema };
          } else if ('content' in current && typeof current.content === 'object') {
            const contentKeys = Object.keys(current.content);
            if (contentKeys.length) {
              const contentType = getParameterContentType(contentKeys);
              if (
                contentType &&
                typeof current.content[contentType] === 'object' &&
                'schema' in current.content[contentType]
              ) {
                const currentSchema: SchemaObject = current.content[contentType].schema
                  ? cloneObject(current.content[contentType].schema)
                  : {};

                if (current.example) {
                  // `example` can be present outside of the `schema` block so if it's there we
                  // should pull it in so it can be handled and returned if it's valid.
                  currentSchema.example = current.example;
                } else if (current.examples) {
                  // `examples` isn't actually supported here in OAS 3.0, but we might as well
                  // support it because `examples` is JSON Schema and that's fully supported in OAS
                  // 3.1.
                  currentSchema.examples = current.examples as unknown as unknown[];
                }

                if (current.deprecated) currentSchema.deprecated = current.deprecated;

                const interimSchema = toJSONSchema(currentSchema, {
                  ...baseSchemaOptions,
                  usedSchemas: usedSchemasForSchemaGroup(type),
                  currentLocation: `/${current.name}`,
                  refLogger: ref => refLoggerForSchemaGroup(type).add(ref),
                });

                schema = isPrimitive(interimSchema) ? interimSchema : { ...interimSchema };
              }
            }
          }

          // Parameter descriptions don't exist in `current.schema` so `constructSchema` will never
          // have access to it.
          if (current.description) {
            if (!isPrimitive(schema)) {
              schema.description = current.description;
            }
          }

          prev[current.name] = schema;

          if (current.required) {
            required.push(current.name);
          }

          return prev;
        }, {});

        const schema: OpenAPIV3_1.SchemaObject = {
          $schema: getSchemaVersionString({}, api),
          type: 'object',
          properties: properties as Record<string, OpenAPIV3_1.SchemaObject>,
          ...(required.length > 0 ? { required } : {}),
        };

        return {
          type,
          label: types[type],
          schema,
        };
      })
      .filter(item => item !== null);

    if (!opts?.mergeIntoBodyAndMetadata) {
      return transformed;
    } else if (!transformed.length) {
      return [];
    }

    // If we want to merge parameters into a single metadata entry then we need to pull all
    // available schemas under one roof.
    return [
      {
        type: 'metadata',
        label: types.metadata,
        schema: {
          allOf: transformed.map(r => r.schema),
        },
      },
    ];
  }

  // If this operation neither has any parameters or a request body then we should return `null`
  // because there won't be any JSON Schema.
  if (!operation.hasParameters() && !operation.hasRequestBody()) {
    return null;
  }

  // `metadata` is `api` SDK specific, is not a part of the `PARAMETER_ORDERING` extension, and
  // should always be sorted last. We also define `formData` as `form` in the extension because
  // we don't want folks to have to deal with casing issues so we need to rewrite it to `formData`.
  const typeKeys = (getExtension(PARAMETER_ORDERING, api, operation) as string[]).map(k => k.toLowerCase());
  typeKeys[typeKeys.indexOf('form')] = 'formData';
  typeKeys.push('metadata');

  const jsonSchema = [transformRequestBody()]
    .concat(...transformParameters())
    .filter((item): item is SchemaWrapper => item !== null);

  // For each group include only schemas that are referenced or otherwise used within that groups'
  // schema. This allows us to avoid having to include schemas or components that are not used,
  // which would otherwise add to the overall bloat and memory footprint of the generated JSON
  // Schema object.
  return jsonSchema
    .map(group => {
      if (group.schema && typeof group.schema === 'object') {
        const usedSchemas = usedSchemasByGroup.get(group.type) ?? new Map<string, SchemaObject>();

        // Apply discriminator `oneOf` arrays to used schemas.
        applyDiscriminatorOneOfToUsedSchemas(api, usedSchemas, (ref: string) => {
          if (usedSchemas.has(ref)) {
            return usedSchemas.get(ref);
          }

          try {
            const resolved = dereferenceRef({ $ref: ref }, api, seenRefs);
            if (isRef(resolved)) return undefined;
            const converted = toJSONSchema(structuredClone(resolved) as SchemaObject, {
              ...baseSchemaOptions,
              usedSchemas,
              seenRefs,
            });

            usedSchemas.set(ref, converted);
            return converted;
          } catch {
            return undefined;
          }
        });

        // Because the `refLogger` does not see every `$ref` that is present in the generated
        // schema (eg. nested refs inside an `anyOf` branch that was inlined from cache) we need to
        // collect everything else.
        const refsInOutput = collectRefsInSchema(group.schema);
        const refsInGroup = refsByGroup.get(group.type) ?? new Set();
        const referencedSchemas = filterRequiredRefsToReferenced(
          new Set([...refsInGroup, ...refsInOutput]),
          usedSchemas,
        );

        if (referencedSchemas.size > 0) {
          mergeReferencedSchemasIntoRoot(group.schema, referencedSchemas);
        }
      }

      return group;
    })
    .sort((a, b) => {
      return typeKeys.indexOf(a.type) - typeKeys.indexOf(b.type);
    });
}
