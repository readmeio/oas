import type { ComponentsObject, OASDocument, SchemaObject } from '../rmoas.types';
import type { OpenAPIV3_1 } from 'openapi-types';
import type Operation from '../operation';
import matchesMimetype from '../lib/matches-mimetype';
import toJSONSchema from '../lib/openapi-to-json-schema';
import * as RMOAS from '../rmoas.types';

const isJSON = matchesMimetype.json;

export type SchemaWrapper = {
  $schema?: string;
  type: string;
  label?: string;
  schema: SchemaObject;
  deprecatedProps?: SchemaWrapper;
};

/**
 * The order of this object determines how they will be sorted in the compiled JSON Schema representation.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#parameterObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#parameterObject}
 */
export const types: Record<keyof RMOAS.OASDocument, string> = {
  path: 'Path Params',
  query: 'Query Params',
  body: 'Body Params',
  cookie: 'Cookie Params',
  formData: 'Form Data',
  header: 'Headers',
};

function getSchemaVersionString(schema: SchemaObject, api: OASDocument): string {
  // If we're not on version 3.1.0, we always fall back to the default schema version for pre 3.1.0
  // TODO: Use real version number comparisons, to let >3.1.0 pass through.
  if (!RMOAS.isOAS31(api)) {
    // This should remain as an HTTP url, not HTTPS.
    return 'http://json-schema.org/draft-04/schema#';
  }

  // If the schema indicates the version, prefer that.
  // We use `as` here because the schema *should* be an oas 3.1 schema due to the isOAS31 check above.
  if ((schema as OpenAPIV3_1.SchemaObject).$schema) {
    return (schema as OpenAPIV3_1.SchemaObject).$schema;
  }

  // If the user defined a global schema version on their oas document, prefer that
  if (api.jsonSchemaDialect) {
    return api.jsonSchemaDialect;
  }

  return 'https://json-schema.org/draft/2020-12/schema#';
}

function cloneObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * @param operation
 * @param api
 * @param globalDefaults
 */
export default function getParametersAsJsonSchema(operation: Operation, api: OASDocument, globalDefaults = {}) {
  let hasCircularRefs = false;

  function refLogger() {
    hasCircularRefs = true;
  }

  function getDeprecated(schema: SchemaObject, type: string) {
    // If there's no properties, bail
    if (!schema || !schema.properties) return null;
    // Clone the original schema so this doesn't interfere with it
    const deprecatedBody = cloneObject(schema);
    // Booleans are not valid for required in draft 4, 7 or 2020. Not sure why the typing thinks they are.
    const requiredParams = (schema.required || []) as string[];

    // Find all top-level deprecated properties from the schema - required and readOnly params are excluded
    const allDeprecatedProps: Record<string, SchemaObject> = {};

    Object.keys(deprecatedBody.properties).forEach(key => {
      const deprecatedProp = deprecatedBody.properties[key] as SchemaObject;
      if (deprecatedProp.deprecated && !requiredParams.includes(key) && !deprecatedProp.readOnly) {
        allDeprecatedProps[key] = deprecatedProp;
      }
    });

    // We know this is the right type. todo: don't use as
    (deprecatedBody.properties as Record<string, SchemaObject>) = allDeprecatedProps;
    const deprecatedSchema = toJSONSchema(deprecatedBody, { globalDefaults, prevSchemas: [], refLogger });

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
      schema: {
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

    const [mediaType, mediaTypeObject] = requestBody;
    const type = mediaType === 'application/x-www-form-urlencoded' ? 'formData' : 'body';

    // If this schema is completely empty, don't bother processing it.
    if (!Object.keys(mediaTypeObject.schema).length) {
      return null;
    }

    const prevSchemas: RMOAS.SchemaObject[] = [];
    if ('example' in mediaTypeObject) {
      prevSchemas.push({ example: mediaTypeObject.example });
    } else if ('examples' in mediaTypeObject) {
      prevSchemas.push({
        examples: Object.values(mediaTypeObject.examples)
          .map((example: RMOAS.ExampleObject) => example.value)
          .filter(val => val !== undefined),
      });
    }

    // We're cloning the request schema because we've had issues with request schemas that were dereferenced being
    // processed multiple times because their component is also processed.
    const requestSchema = cloneObject(mediaTypeObject.schema);
    const cleanedSchema = toJSONSchema(requestSchema, { globalDefaults, prevSchemas, refLogger });

    // If this schema is **still** empty, don't bother returning it.
    if (!Object.keys(cleanedSchema).length) {
      return null;
    }

    return {
      type,
      label: types[type],
      schema: {
        ...cleanedSchema,
        $schema: getSchemaVersionString(cleanedSchema, api),
      },
      deprecatedProps: getDeprecated(cleanedSchema, type),
    };
  }

  function transformComponents(): ComponentsObject {
    if (!('components' in api)) {
      return false;
    }

    const components: Partial<ComponentsObject> = {};

    Object.keys(api.components).forEach((componentType: keyof ComponentsObject) => {
      if (typeof api.components[componentType] === 'object' && !Array.isArray(api.components[componentType])) {
        // @fixme Typescript is INCREDIBLY SLOW parsing this one line. I think it's because of the large variety of types that that object could represent
        // but I can't yet think of a way to get around that.
        components[componentType] = {};

        Object.keys(api.components[componentType]).forEach(schemaName => {
          const componentSchema = cloneObject(api.components[componentType][schemaName]);
          components[componentType][schemaName] = toJSONSchema(componentSchema as RMOAS.SchemaObject, {
            globalDefaults,
            refLogger,
          });
        });
      }
    });

    return components;
  }

  function transformParameters(): SchemaWrapper[] {
    const operationParams = operation.getParameters();

    return Object.keys(types).map(type => {
      const required: string[] = [];

      // This `as` actually *could* be a ref, but we don't want refs to pass through here, so `.in` will never match `type`
      const parameters = operationParams.filter(param => (param as RMOAS.ParameterObject).in === type);
      if (parameters.length === 0) {
        return null;
      }

      const properties = parameters.reduce((prev: Record<string, SchemaObject>, current: RMOAS.ParameterObject) => {
        let schema: SchemaObject = {};
        if ('schema' in current) {
          const currentSchema: SchemaObject = current.schema ? cloneObject(current.schema) : {};

          if (current.example) {
            // `example` can be present outside of the `schema` block so if it's there we should pull it in so it can be
            // handled and returned if it's valid.
            currentSchema.example = current.example;
          } else if (current.examples) {
            // `examples` isn't actually supported here in OAS 3.0, but we might as well support it because `examples` is
            // JSON Schema and that's fully supported in OAS 3.1.
            currentSchema.examples = current.examples as unknown as unknown[];
          }

          if (current.deprecated) currentSchema.deprecated = current.deprecated;

          schema = {
            ...toJSONSchema(currentSchema, {
              currentLocation: `/${current.name}`,
              globalDefaults,
              refLogger,
            }),
            // Note: this applies a $schema version to each field in the larger schema object. It's not really *correct*
            // but it's what we have to do because there's a chance that the end user has indicated the schemas are different
            $schema: getSchemaVersionString(currentSchema, api),
          };
        } else if ('content' in current && typeof current.content === 'object') {
          const contentKeys = Object.keys(current.content);
          if (contentKeys.length) {
            let contentType;
            if (contentKeys.length === 1) {
              contentType = contentKeys[0];
            } else {
              // We should always try to prioritize `application/json` over any other possible content that might be present
              // on this schema.
              const jsonLikeContentTypes = contentKeys.filter(k => isJSON(k));
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
                // `example` can be present outside of the `schema` block so if it's there we should pull it in so it can be
                // handled and returned if it's valid.
                currentSchema.example = current.example;
              } else if (current.examples) {
                // `examples` isn't actually supported here in OAS 3.0, but we might as well support it because `examples` is
                // JSON Schema and that's fully supported in OAS 3.1.
                currentSchema.examples = current.examples as unknown as unknown[];
              }

              if (current.deprecated) currentSchema.deprecated = current.deprecated;

              schema = {
                ...toJSONSchema(currentSchema, {
                  currentLocation: `/${current.name}`,
                  globalDefaults,
                  refLogger,
                }),
                // Note: this applies a $schema version to each field in the larger schema object. It's not really *correct*
                // but it's what we have to do because there's a chance that the end user has indicated the schemas are different
                $schema: getSchemaVersionString(currentSchema, api),
              };
            }
          }
        }

        // Parameter descriptions don't exist in `current.schema` so `constructSchema` will never have access to it.
        if (current.description) {
          schema.description = current.description;
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
    });
  }

  // If this operation neither has any parameters or a request body then we should return null because there won't be
  // any JSON Schema.
  if (!operation.hasParameters() && !operation.hasRequestBody()) {
    return null;
  }

  const components = transformComponents();

  const typeKeys = Object.keys(types);
  return [transformRequestBody()]
    .concat(...transformParameters())
    .filter(Boolean)
    .map(group => {
      // Since this library assumes that the schema has already been dereferenced, adding every component here that
      // **isn't** circular adds a ton of bloat so it'd be cool if `components` was just the remaining `$ref` pointers
      // that are still being referenced.
      // @todo
      if (hasCircularRefs && components) {
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
