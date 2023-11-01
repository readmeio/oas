import type { JSONSchema4, JSONSchema6, JSONSchema7 } from 'json-schema';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

export type JSONSchema = JSONSchema4 | JSONSchema6 | JSONSchema7;

/**
 * @param check Data to determine if it contains a ReferenceObject (`$ref` pointer`).
 * @returns If the supplied data has a `$ref` pointer.
 */
export function isRef(check: unknown): check is OpenAPIV3.ReferenceObject | OpenAPIV3_1.ReferenceObject {
  return (check as OpenAPIV3.ReferenceObject | OpenAPIV3_1.ReferenceObject).$ref !== undefined;
}

/**
 * @param check API definition to determine if it's a 3.1 definition.
 * @returns If the definition is a 3.1 definition.
 */
export function isOAS31(check: OpenAPIV3.Document | OpenAPIV3_1.Document): check is OpenAPIV3_1.Document {
  return check.openapi === '3.1.0';
}

export interface User {
  [key: string]: unknown;
  keys?: {
    [key: string]: unknown;
    name: string | number;
    pass?: string | number;
    user?: string | number;
  }[];
}

export type HttpMethods =
  | (OpenAPIV3.HttpMethods | OpenAPIV3_1.HttpMethods)
  | ('get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace');

// The following are custom OpenAPI types that we use throughout this library, sans
// `ReferenceObject` because we assume that the API definition has been dereferenced.
//
// These are organized by how they're defined in the OpenAPI Specification.

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#oasObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#oasObject}
 */
export type OASDocument = (OpenAPIV3.Document | OpenAPIV3_1.Document) &
  // `x-*` extensions
  Record<string, unknown>;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#serverObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#serverObject}
 */
export type ServerObject = OpenAPIV3.ServerObject | OpenAPIV3_1.ServerObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#serverVariableObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#serverVariableObject}
 */
export type ServerVariableObject = OpenAPIV3.ServerVariableObject | OpenAPIV3_1.ServerVariableObject;
export type ServerVariablesObject = Record<string, ServerVariableObject>;
export type ServerVariable = Record<
  string,
  string | number | { default?: string | number }[] | { default?: string | number } | Record<string, never>
>;

export interface Servers {
  selected: number;
  variables: ServerVariable;
}

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#componentsObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#componentsObject}
 */
export type ComponentsObject = OpenAPIV3.ComponentsObject | OpenAPIV3_1.ComponentsObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#pathsObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#pathsObject}
 */
export type PathsObject = OpenAPIV3.PathsObject | OpenAPIV3_1.PathsObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#pathItemObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#pathItemObject}
 */
export type PathItemObject = OpenAPIV3.PathItemObject | OpenAPIV3_1.PathItemObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#operationObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#operationObject}
 */
export type OperationObject = (OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject) &
  // `x-*` extensions
  Record<string, unknown>;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#parameterObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#parameterObject}
 */
export type ParameterObject = OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#requestBodyObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#requestBodyObject}
 */
export type RequestBodyObject = OpenAPIV3.RequestBodyObject | OpenAPIV3_1.RequestBodyObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#mediaTypeObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#mediaTypeObject}
 */
export type MediaTypeObject = OpenAPIV3.MediaTypeObject | OpenAPIV3_1.MediaTypeObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#responseObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#responseObject}
 */
export type ResponseObject = OpenAPIV3.ResponseObject | OpenAPIV3_1.ResponseObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#callbackObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#callbackObject}
 */
export type CallbackObject = OpenAPIV3.CallbackObject | OpenAPIV3_1.CallbackObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#exampleObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.3.md#exampleObject}
 */
export type ExampleObject = OpenAPIV3.ExampleObject | OpenAPIV3_1.ExampleObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#tagObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#tagObject}
 */
export type TagObject = OpenAPIV3.TagObject | OpenAPIV3_1.TagObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#headerObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#headerObject}
 */
export type HeaderObject = OpenAPIV3.HeaderObject | OpenAPIV3_1.HeaderObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schemaObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#schemaObject}
 */
export type SchemaObject = (
  | OpenAPIV3.SchemaObject
  | OpenAPIV3_1.SchemaObject
  // Adding `JSONSchema` to this because `json-schema-merge-allof` expects those.
  | JSONSchema
) & {
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
} & {
  // OpenAPI-specific properties
  externalDocs?: unknown;
  xml?: unknown;
};

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
export type SecuritySchemeObject = OpenAPIV3.SecuritySchemeObject | OpenAPIV3_1.SecuritySchemeObject;

export type SecuritySchemesObject = Record<string, SecuritySchemeObject>;

export type KeyedSecuritySchemeObject = {
  _key: string;

  // `x-default` is our custom extension for specifying auth defaults.
  // https://docs.readme.com/docs/openapi-extensions#authentication-defaults
  'x-default'?: string | number;
} & SecuritySchemeObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#securityRequirementObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#securityRequirementObject}
 */
export type SecurityRequirementObject = OpenAPIV3.SecurityRequirementObject | OpenAPIV3_1.SecurityRequirementObject;
