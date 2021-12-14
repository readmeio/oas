import type { ComponentsObject, OASDocument, OperationObject, SchemaObject } from '../rmoas.types';
import type { OpenAPIV3_1 } from 'openapi-types';
import getSchema from '../lib/get-schema';
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
 * @param schema
 * @param api
 */
function getSchemaVersionString(schema: SchemaObject, api: OASDocument): string {
  // If we're not on version 3.1.0, we always fall back to the default schema version for pre 3.1.0
  // TODO: Use real version number comparisons, to let >3.1.0 pass through.
  if (!RMOAS.isOAS31(api)) {
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

  // Otherwise this is the default
  return 'https://json-schema.org/draft/2020-12/schema#';
}

// The order of this object determines how they will be sorted in the compiled JSON Schema
// representation.
// https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#parameterObject
export const types: { [key: keyof RMOAS.OASDocument]: string } = {
  path: 'Path Params',
  query: 'Query Params',
  body: 'Body Params',
  cookie: 'Cookie Params',
  formData: 'Form Data',
  header: 'Headers',
};

/**
 * @param obj
 */
function cloneObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * @param {string} path
 * @param {Operation} operation
 * @param {OpenAPI.Document} api
 * @param {Object} globalDefaults
 * @returns {Array<object>}
 */
export default (path: string, operation: OperationObject, api: OASDocument, globalDefaults = {}) => {
  let hasCircularRefs = false;

  /**
   *
   */
  function refLogger() {
    hasCircularRefs = true;
  }

  /**
   * @param schema
   * @param type
   */
  function getDeprecated(schema: SchemaObject, type: string) {
    // If there's no properties, bail
    if (!schema || !schema.properties) return null;
    // Clone the original schema so this doesn't interfere with it
    const deprecatedBody = cloneObject(schema);
    // Booleans are not valid for required in draft 4, 7 or 2020. Not sure why the typing thinks they are.
    const requiredParams = (schema.required || []) as Array<string>;

    // Find all top-level deprecated properties from the schema - required and readOnly params are excluded
    const allDeprecatedProps: { [key: string]: SchemaObject } = {};

    Object.keys(deprecatedBody.properties).forEach(key => {
      const deprecatedProp = deprecatedBody.properties[key] as SchemaObject;
      if (deprecatedProp.deprecated && !requiredParams.includes(key) && !deprecatedProp.readOnly) {
        allDeprecatedProps[key] = deprecatedProp;
      }
    });

    // We know this is the right type. todo: don't use as
    (deprecatedBody.properties as { [key: string]: SchemaObject }) = allDeprecatedProps;
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
  function getRequestBody(): SchemaWrapper {
    const schema = getSchema(operation, api);
    if (!schema || !schema.schema) return null;

    const type = schema.type === 'application/x-www-form-urlencoded' ? 'formData' : 'body';
    const requestBody = schema.schema;

    // If this schema is completely empty, don't bother processing it.
    if (Object.keys(requestBody.schema).length === 0) {
      return null;
    }

    const examples = [];
    if ('example' in requestBody) {
      examples.push({ example: requestBody.example });
    } else if ('examples' in requestBody) {
      examples.push({ examples: requestBody.examples });
    }

    // We're cloning the request schema because we've had issues with request schemas that were dereferenced being
    // processed multiple times because their component is also processed.
    const requestSchema = cloneObject(requestBody.schema);
    const cleanedSchema = toJSONSchema(requestSchema, { globalDefaults, prevSchemas: examples, refLogger });

    // If this schema is **still** empty, don't bother returning it.
    if (Object.keys(cleanedSchema).length === 0) {
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

  /**
   *
   */
  function getCommonParams() {
    if (api && 'paths' in api && path in api.paths && 'parameters' in api.paths[path]) {
      return api.paths[path].parameters;
    }

    return [];
  }

  /**
   *
   */
  function getComponents(): ComponentsObject {
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

  /**
   *
   */
  function getParameters(): Array<SchemaWrapper> {
    let operationParams = operation.parameters || [];
    const commonParams = getCommonParams();

    if (commonParams.length !== 0) {
      const commonParamsNotInParams = commonParams.filter((param: RMOAS.ParameterObject) => {
        return !operationParams.find((param2: RMOAS.ParameterObject) => {
          if (param.name && param2.name) {
            return param.name === param2.name && param.in === param2.in;
          } else if (RMOAS.isRef(param) && RMOAS.isRef(param2)) {
            return param.$ref === param2.$ref;
          }

          return false;
        });
      });

      operationParams = operationParams.concat(commonParamsNotInParams || []);
    }

    return Object.keys(types).map(type => {
      const required: Array<string> = [];

      // This `as` actually *could* be a ref, but we don't want refs to pass through here, so `.in` will never match `type`
      const parameters = operationParams.filter(param => (param as RMOAS.ParameterObject).in === type);
      if (parameters.length === 0) {
        return null;
      }

      const properties = parameters.reduce((prev: { [key: string]: SchemaObject }, current: RMOAS.ParameterObject) => {
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
            currentSchema.examples = current.examples as unknown as Array<unknown>;
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
                currentSchema.examples = current.examples as unknown as Array<unknown>;
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

        // If for whatever reason we were unable to ascertain a type for the schema (maybe `schema` and `content` aren't
        // present, or they're not in the shape they should be), set it to a string so we can at least make an attempt at
        // returning *something* for it.
        if (!('type' in schema)) {
          // Only add a missing type if this schema isn't a polymorphismified schema.
          if (!('allOf' in schema) && !('oneOf' in schema) && !('anyOf' in schema)) {
            schema.type = 'string';
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
        properties: properties as { [key: string]: OpenAPIV3_1.SchemaObject },
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

  const hasRequestBody = !!operation.requestBody;
  const hasParameters = !!(operation.parameters && operation.parameters.length !== 0);
  if (!hasParameters && !hasRequestBody && getCommonParams().length === 0) return null;

  const components = getComponents();

  const typeKeys = Object.keys(types);
  return [getRequestBody()]
    .concat(...getParameters())
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

      // Delete deprecatedProps if it's null on the schema
      if (!group.deprecatedProps) delete group.deprecatedProps;

      return group;
    })
    .sort((a, b) => {
      return typeKeys.indexOf(a.type) - typeKeys.indexOf(b.type);
    });
};
