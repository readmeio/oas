import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import type { JSONSchema4, JSONSchema6, JSONSchema7 } from 'json-schema'; // eslint-disable-line import/no-unresolved

/**
 * @param check Data to determine if it contains a ReferenceObject (`$ref` pointer`).
 * @returns If the supplied data has a `$ref` pointer.
 */
export function isRef(check: unknown): check is OpenAPIV3.ReferenceObject | OpenAPIV3_1.ReferenceObject {
  return (check as OpenAPIV3.ReferenceObject | OpenAPIV3_1.ReferenceObject).$ref !== undefined;
}

export interface User {
  [key: string]: unknown;
  keys?: Array<{
    name: string | number;
    user?: string | number;
    pass?: string | number;
    [key: string]: unknown;
  }>;
}

export type HttpMethods =
  | (OpenAPIV3.HttpMethods | OpenAPIV3_1.HttpMethods)
  | ('get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace');

// The following are custom OpenAPI types that we use throughout this library, sans `ReferenceObject` because we assume
// that the API definition has been dereferenced.
//
// These are organized by how they're defined in the OpenAPI Specification.

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#oasObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#oasObject}
 */
export type OASDocument = (OpenAPIV3.Document | OpenAPIV3_1.Document) & {
  [extension: string]: unknown;
};

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
export type ServerVariablesObject = {
  [variable: string]: ServerVariableObject;
};

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
export type OperationObject = (OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject) & {
  [extension: string]: unknown;
};

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
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schemaObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#schemaObject}
 */
export type SchemaObject = (
  | OpenAPIV3.SchemaObject
  | OpenAPIV3_1.SchemaObject
  // Adding `JSONSchema4`, `JSONSchema6`, and `JSONSchema7` to this because `json-schema-merge-allof` expects those.
  | (JSONSchema4 | JSONSchema6 | JSONSchema7)
) & {
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  'x-readme-ref-name'?: string;
};

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#securitySchemeObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#securitySchemeObject}
 */
export type SecuritySchemeObject = OpenAPIV3.SecuritySchemeObject | OpenAPIV3_1.SecuritySchemeObject;

export type SecuritySchemesObject = {
  [key: string]: SecuritySchemeObject;
};

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
