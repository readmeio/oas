import type { toJSONSchemaOptions } from '../lib/openapi-to-json-schema';
import type Operation from '../operation';
import type { ComponentsObject, ExampleObject, OASDocument, ParameterObject, SchemaObject } from '../rmoas.types';
import type { OpenAPIV3_1 } from 'openapi-types';

import cloneObject from '../lib/clone-object';
import { isPrimitive } from '../lib/helpers';
import matchesMimetype from '../lib/matches-mimetype';
import toJSONSchema, { getSchemaVersionString } from '../lib/openapi-to-json-schema';

export interface SchemaWrapper {
  $schema?: string;
  deprecatedProps?: SchemaWrapper;
  description?: string;
  label?: string;
  schema: SchemaObject;
  type: string;
}

/**
 * The order of this object determines how they will be sorted in the compiled JSON Schema
 * representation.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#parameterObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#parameterObject}
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

  /**
   * If you wish to **not** split out deprecated properties into a separate `deprecatedProps`
   * object.
   */
  retainDeprecatedProperties?: boolean;

  /**
   * With a transformer you can transform any data within a given schema, like say if you want
   * to rewrite a potentially unsafe `title` that might be eventually used as a JS variable
   * name, just make sure to return your transformed schema.
   */
  transformer?: (schema: SchemaObject) => SchemaObject;
}

export default function getParametersAsJSONSchema(
  operation: Operation,
  api: OASDocument,
  opts?: getParametersAsJSONSchemaOptions,
) {
  let hasCircularRefs = false;
  let hasDiscriminatorMappingRefs = false;

  function refLogger(ref: string, type: 'ref' | 'discriminator') {
    if (type === 'ref') {
      hasCircularRefs = true;
    } else {
      hasDiscriminatorMappingRefs = true;
    }
  }

  function getDeprecated(schema: SchemaObject, type: string) {
    // If we wish to retain deprecated properties then we shouldn't split them out into the
    // `deprecatedProps` object.
    if (opts.retainDeprecatedProperties) {
      return null;
    }

    // If there's no properties, bail
    if (!schema || !schema.properties) return null;

    // Clone the original schema so this doesn't interfere with it
    const deprecatedBody = cloneObject(schema);

    // Booleans are not valid for required in draft 4, 7 or 2020. Not sure why the typing thinks
    // they are.
    const requiredParams = (schema.required || []) as string[];

    // Find all top-level deprecated properties from the schema - required and readOnly params are
    // excluded.
    const allDeprecatedProps: Record<string, SchemaObject> = {};

    Object.keys(deprecatedBody.properties).forEach(key => {
      const deprecatedProp = deprecatedBody.properties[key] as SchemaObject;
      if (deprecatedProp.deprecated && !requiredParams.includes(key) && !deprecatedProp.readOnly) {
        allDeprecatedProps[key] = deprecatedProp;
      }
    });

    // We know this is the right type. todo: don't use as
    (deprecatedBody.properties as Record<string, SchemaObject>) = allDeprecatedProps;
    const deprecatedSchema = toJSONSchema(deprecatedBody, {
      globalDefaults: opts.globalDefaults,
      hideReadOnlyProperties: opts.hideReadOnlyProperties,
      hideWriteOnlyProperties: opts.hideWriteOnlyProperties,
      prevExampleSchemas: [],
      refLogger,
      transformer: opts.transformer,
    });

    // Check if the schema wasn't created or there's no deprecated properties
    if (Object.keys(deprecatedSchema).length === 0 || Object.keys(deprecatedSchema.properties).length === 0) {
      return null;
    }

    // Remove deprecated properties from the original schema
    // Not using the clone here becuase we WANT this to affect the original
    Object.keys(schema.properties).forEach(key => {
      // We know this will always be a SchemaObject
      if ((schema.properties[key] as SchemaObject).deprecated && !requiredParams.includes(key)) {
        delete schema.properties[key];
      }
    });

    return {
      type,
      schema: isPrimitive(deprecatedSchema)
        ? deprecatedSchema
        : {
            ...deprecatedSchema,
            $schema: getSchemaVersionString(deprecatedSchema, api),
          },
    };
  }

  /**
   *
   */
  function transformRequestBody(): SchemaWrapper {
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
        examples: Object.values(mediaTypeObject.examples)
          .map((example: ExampleObject) => example.value)
          .filter(val => val !== undefined),
      });
    }

    // We're cloning the request schema because we've had issues with request schemas that were
    // dereferenced being processed multiple times because their component is also processed.
    const requestSchema = cloneObject(mediaTypeObject.schema);

    const cleanedSchema = toJSONSchema(requestSchema, {
      globalDefaults: opts.globalDefaults,
      hideReadOnlyProperties: opts.hideReadOnlyProperties,
      hideWriteOnlyProperties: opts.hideWriteOnlyProperties,
      prevExampleSchemas,
      refLogger,
      transformer: opts.transformer,
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
      deprecatedProps: getDeprecated(cleanedSchema, type),
      ...(description ? { description } : {}),
    };
  }

  function transformComponents(): ComponentsObject {
    if (!('components' in api)) {
      return false;
    }

    const components: Partial<ComponentsObject> = {
      ...Object.keys(api.components)
        .map(componentType => ({ [componentType]: {} }))
        .reduce((prev, next) => Object.assign(prev, next), {}),
    };

    Object.keys(api.components).forEach((componentType: keyof ComponentsObject) => {
      if (typeof api.components[componentType] === 'object' && !Array.isArray(api.components[componentType])) {
        Object.keys(api.components[componentType]).forEach(schemaName => {
          const componentSchema = cloneObject(api.components[componentType][schemaName]);
          components[componentType][schemaName] = toJSONSchema(componentSchema as SchemaObject, {
            globalDefaults: opts.globalDefaults,
            hideReadOnlyProperties: opts.hideReadOnlyProperties,
            hideWriteOnlyProperties: opts.hideWriteOnlyProperties,
            refLogger,
            transformer: opts.transformer,
          });
        });
      }
    });

    // If none of our above component type placeholders got used let's clean them up.
    Object.keys(components).forEach((componentType: keyof ComponentsObject) => {
      if (!Object.keys(components[componentType]).length) {
        delete components[componentType];
      }
    });

    return components;
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
              currentLocation: `/${current.name}`,
              globalDefaults: opts.globalDefaults,
              hideReadOnlyProperties: opts.hideReadOnlyProperties,
              hideWriteOnlyProperties: opts.hideWriteOnlyProperties,
              refLogger,
              transformer: opts.transformer,
            });

            schema = isPrimitive(interimSchema)
              ? interimSchema
              : {
                  ...interimSchema,

                  // Note: this applies a `$schema` version to each field in the larger schema
                  // object. It's not really **correct** but it's what we have to do because
                  // there's a chance that the end user has indicated the schemas are different.
                  $schema: getSchemaVersionString(currentSchema, api),
                };
          } else if ('content' in current && typeof current.content === 'object') {
            const contentKeys = Object.keys(current.content);
            if (contentKeys.length) {
              let contentType;
              if (contentKeys.length === 1) {
                contentType = contentKeys[0];
              } else {
                // We should always try to prioritize `application/json` over any other possible
                // content that might be present on this schema.
                const jsonLikeContentTypes = contentKeys.filter(k => matchesMimetype.json(k));
                if (jsonLikeContentTypes.length) {
                  contentType = jsonLikeContentTypes[0];
                } else {
                  contentType = contentKeys[0];
                }
              }

              if (typeof current.content[contentType] === 'object' && 'schema' in current.content[contentType]) {
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
                  currentLocation: `/${current.name}`,
                  globalDefaults: opts.globalDefaults,
                  hideReadOnlyProperties: opts.hideReadOnlyProperties,
                  hideWriteOnlyProperties: opts.hideWriteOnlyProperties,
                  refLogger,
                  transformer: opts.transformer,
                });

                schema = isPrimitive(interimSchema)
                  ? interimSchema
                  : {
                      ...interimSchema,

                      // Note: this applies a `$schema` version to each field in the larger schema
                      // object. It's not really **correct** but it's what we have to do because
                      // there's a chance that the end user has indicated the schemas are different.
                      $schema: getSchemaVersionString(currentSchema, api),
                    };
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

        // This typing is technically WRONG :( but it's the best we can do for now.
        const schema: OpenAPIV3_1.SchemaObject = {
          type: 'object',
          properties: properties as Record<string, OpenAPIV3_1.SchemaObject>,
          required,
        };

        return {
          type,
          label: types[type],
          schema,
          deprecatedProps: getDeprecated(schema, type),
        };
      })
      .filter(Boolean);

    if (!opts.mergeIntoBodyAndMetadata) {
      return transformed;
    } else if (!transformed.length) {
      return [];
    }

    // If we want to merge parameters into a single metadata entry then we need to pull all
    // available schemas and `deprecatedProps` (if we don't want to retain them via the
    // `retainDeprecatedProps` option) under one roof.
    const deprecatedProps = transformed.map(r => r.deprecatedProps?.schema || null).filter(Boolean);
    return [
      {
        type: 'metadata',
        label: types.metadata,
        schema: {
          allOf: transformed.map(r => r.schema),
        } as SchemaObject,
        deprecatedProps: deprecatedProps.length
          ? {
              type: 'metadata',
              schema: {
                allOf: deprecatedProps,
              } as SchemaObject,
            }
          : null,
      },
    ];
  }

  // If this operation neither has any parameters or a request body then we should return null
  // because there won't be any JSON Schema.
  if (!operation.hasParameters() && !operation.hasRequestBody()) {
    return null;
  }

  const typeKeys = Object.keys(types);
  const jsonSchema = [transformRequestBody()].concat(...transformParameters()).filter(Boolean);

  // We should only include `components`, or even bother transforming components into JSON Schema,
  // if we either have circular refs or if we have discriminator mapping refs somewhere and want to
  // include them.
  const shouldIncludeComponents =
    hasCircularRefs || (hasDiscriminatorMappingRefs && opts.includeDiscriminatorMappingRefs);

  const components = shouldIncludeComponents ? transformComponents() : false;

  return jsonSchema
    .map(group => {
      /**
       * Since this library assumes that the schema has already been dereferenced, adding every
       * component here that **isn't** circular adds a ton of bloat so it'd be cool if `components`
       * was just the remaining `$ref` pointers that are still being referenced.
       *
       * @todo
       */
      if (components && shouldIncludeComponents) {
        // Fixing typing and confused version mismatches
        (group.schema.components as ComponentsObject) = components;
      }

      // Delete deprecatedProps if it's null on the schema.
      if (!group.deprecatedProps) delete group.deprecatedProps;

      return group;
    })
    .sort((a, b) => {
      return typeKeys.indexOf(a.type) - typeKeys.indexOf(b.type);
    });
}
