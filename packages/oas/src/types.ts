import type { JSONSchema4, JSONSchema6, JSONSchema7 } from 'json-schema';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

export type JSONSchema = JSONSchema4 | JSONSchema6 | JSONSchema7;

/**
 * @param check Data to determine if it contains a ReferenceObject (`$ref` pointer`).
 * @returns If the supplied data has a `$ref` pointer.
 */
export function isRef(check: unknown): check is OpenAPIV3_1.ReferenceObject | OpenAPIV3.ReferenceObject {
  return (check as OpenAPIV3_1.ReferenceObject | OpenAPIV3.ReferenceObject).$ref !== undefined;
}

/**
 * @param check API definition to determine if it's a 3.1 definition.
 * @returns If the definition is a 3.1 definition.
 */
export function isOAS31(check: OpenAPIV3_1.Document | OpenAPIV3.Document): check is OpenAPIV3_1.Document {
  return check.openapi === '3.1.0';
}

export interface User {
  [key: string]: unknown;
  keys?: {
    [key: string]: unknown;
    name: number | string;
    pass?: number | string;
    user?: number | string;
  }[];
}

export type HttpMethods =
  | OpenAPIV3_1.HttpMethods
  | OpenAPIV3.HttpMethods
  | 'delete'
  | 'get'
  | 'head'
  | 'options'
  | 'patch'
  | 'post'
  | 'put'
  | 'trace';

// The following are custom OpenAPI types that we use throughout this library, sans
// `ReferenceObject` because we assume that the API definition has been dereferenced.
//
// These are organized by how they're defined in the OpenAPI Specification.

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#oasObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#oasObject}
 */
// eslint-disable-next-line @typescript-eslint/sort-type-constituents
export type OASDocument = (OpenAPIV3_1.Document | OpenAPIV3.Document) &
  // `x-*` extensions
  Record<string, unknown>;

export type OAS31Document = OpenAPIV3_1.Document &
  // `x-*` extensions
  Record<string, unknown>;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#serverObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#serverObject}
 */
export type ServerObject = OpenAPIV3_1.ServerObject | OpenAPIV3.ServerObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#serverVariableObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#serverVariableObject}
 */
export type ServerVariableObject = OpenAPIV3_1.ServerVariableObject | OpenAPIV3.ServerVariableObject;
export type ServerVariablesObject = Record<string, ServerVariableObject>;
export type ServerVariable = Record<
  string,
  { default?: number | string }[] | Record<string, never> | number | string | { default?: number | string }
>;

export interface Servers {
  selected: number;
  variables: ServerVariable;
}

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#componentsObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#componentsObject}
 */
export type ComponentsObject = OpenAPIV3_1.ComponentsObject | OpenAPIV3.ComponentsObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#pathsObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#pathsObject}
 */
export type PathsObject = OpenAPIV3_1.PathsObject | OpenAPIV3.PathsObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#pathItemObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#pathItemObject}
 */
export type PathItemObject = OpenAPIV3_1.PathItemObject | OpenAPIV3.PathItemObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#operationObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#operationObject}
 */
// eslint-disable-next-line @typescript-eslint/sort-type-constituents
export type OperationObject = (OpenAPIV3_1.OperationObject | OpenAPIV3.OperationObject) &
  // `x-*` extensions
  Record<string, unknown>;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#parameterObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#parameterObject}
 */
export type ParameterObject = OpenAPIV3_1.ParameterObject | OpenAPIV3.ParameterObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#requestBodyObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#requestBodyObject}
 */
export type RequestBodyObject = OpenAPIV3_1.RequestBodyObject | OpenAPIV3.RequestBodyObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#mediaTypeObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#mediaTypeObject}
 */
export type MediaTypeObject = OpenAPIV3_1.MediaTypeObject | OpenAPIV3.MediaTypeObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#responseObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#responseObject}
 */
export type ResponseObject = OpenAPIV3_1.ResponseObject | OpenAPIV3.ResponseObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#callbackObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#callbackObject}
 */
export type CallbackObject = OpenAPIV3_1.CallbackObject | OpenAPIV3.CallbackObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#exampleObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.3.md#exampleObject}
 */
export type ExampleObject = OpenAPIV3_1.ExampleObject | OpenAPIV3.ExampleObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#tagObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#tagObject}
 */
export type TagObject = OpenAPIV3_1.TagObject | OpenAPIV3.TagObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#headerObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#headerObject}
 */
export type HeaderObject = OpenAPIV3_1.HeaderObject | OpenAPIV3.HeaderObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schemaObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#schemaObject}
 */
export type SchemaObject = {
  // OpenAPI-specific properties
  externalDocs?: unknown;
  xml?: unknown;
} & {
  // TODO: We should split this into one type for v3 and one type for v3.1 to ensure type accuracy.
  $schema?: string;

  // We add this to the schema to help out with circular refs
  components?: OpenAPIV3_1.ComponentsObject;

  deprecated?: boolean;
  example?: unknown;
  examples?: unknown[];
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;

  // We add this extension within our dereferencing work to preserve the origin dereferenced
  // schemas.
  'x-readme-ref-name'?: string;
} & ( // eslint-disable-next-line @typescript-eslint/sort-type-constituents
    | OpenAPIV3.SchemaObject
    | OpenAPIV3_1.SchemaObject
    // Adding `JSONSchema` to this because `json-schema-merge-allof` expects those.
    | JSONSchema
  );

/**
 * @param check JSON Schema object to determine if it's a non-polymorphic schema.
 * @param isPolymorphicAllOfChild If this JSON Schema object is the child of a polymorphic `allOf`.
 * @returns If the JSON Schema object is a JSON Schema object.
 */
export function isSchema(check: unknown, isPolymorphicAllOfChild = false): check is SchemaObject {
  return (
    (check as SchemaObject).type !== undefined ||
    (check as SchemaObject).allOf !== undefined ||
    (check as SchemaObject).anyOf !== undefined ||
    (check as SchemaObject).oneOf !== undefined ||
    isPolymorphicAllOfChild
  );
}

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#securitySchemeObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#securitySchemeObject}
 */
export type SecuritySchemeObject = OpenAPIV3_1.SecuritySchemeObject | OpenAPIV3.SecuritySchemeObject;

export type SecuritySchemesObject = Record<string, SecuritySchemeObject>;

export type KeyedSecuritySchemeObject = SecuritySchemeObject & {
  _key: string;

  // `x-default` is our custom extension for specifying auth defaults.
  // https://docs.readme.com/docs/openapi-extensions#authentication-defaults
  'x-default'?: number | string;
};

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#securityRequirementObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#securityRequirementObject}
 */
export type SecurityRequirementObject = OpenAPIV3_1.SecurityRequirementObject | OpenAPIV3.SecurityRequirementObject;
