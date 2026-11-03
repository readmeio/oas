import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from '@scalar/openapi-types';
import type { JSONSchema4, JSONSchema6, JSONSchema7 } from 'json-schema';

import {
  isOpenAPI30 as assertOpenAPI30,
  isOpenAPI31 as assertOpenAPI31,
  isSwagger as assertSwagger,
} from '@readme/openapi-parser/lib/assertions';

export type JSONSchema = JSONSchema4 | JSONSchema6 | JSONSchema7;

/**
 * @param check Data to determine if it contains a ReferenceObject (`$ref` pointer`).
 * @returns If the supplied data has a `$ref` pointer.
 */
export function isRef(check: unknown): check is { $ref: string } {
  // `OpenAPIV3_1.ReferenceObject` is built with `Omit` over a `[key: string]: any` index, which
  // makes every object assignable to it. Narrowing to that type would make the negative branch
  // `never`. A reference only needs `$ref`.
  return typeof (check as { $ref?: unknown })?.$ref === 'string';
}

/**
 * Is a given object a Swagger API definition?
 *
 */
export const isSwagger: (schema: any) => schema is OpenAPIV2.Document = assertSwagger;

/**
 * Is a given object an OpenAPI 3.0 API definition?
 *
 */
export const isOpenAPI30: (schema: any) => schema is OpenAPIV3.Document = assertOpenAPI30;

/**
 * Is a given object an OpenAPI 3.1 API definition?
 *
 */
export const isOpenAPI31: (schema: any) => schema is OpenAPIV3_1.Document = assertOpenAPI31;

/**
 * Data shape for taking OpenAPI operation data and converting it into HAR.
 *
 * @see {@link https://github.com/readmeio/oas/tree/main/packages/oas-to-har}
 */
export interface DataForHAR {
  body?: any;
  cookie?: Record<string, any>;
  formData?: Record<string, any>; // `application/x-www-form-urlencoded` requests payloads.
  header?: Record<string, any>;
  path?: Record<string, any>;
  query?: Record<string, any>;
  server?: {
    selected: number;
    variables?: ServerVariable;
  };
}

export type AuthForHAR = Record<string, number | string | { pass?: string; user?: string }>;

export type SecuritySchemeDefaultAuthPrimitive = number | string;

export interface BasicAuthDefault {
  pass?: SecuritySchemeDefaultAuthPrimitive;
  user?: SecuritySchemeDefaultAuthPrimitive;
}

export interface OAuthClientCredentialsDefault {
  client_id?: SecuritySchemeDefaultAuthPrimitive;
  client_secret?: SecuritySchemeDefaultAuthPrimitive;
  clientId?: SecuritySchemeDefaultAuthPrimitive;
  clientSecret?: SecuritySchemeDefaultAuthPrimitive;
}

export type SecuritySchemeDefaultAuth =
  | SecuritySchemeDefaultAuthPrimitive
  | BasicAuthDefault
  | OAuthClientCredentialsDefault;

export interface User {
  [key: string]: unknown;
  keys?: {
    [key: string]: unknown;
    name: number | string;
    pass?: number | string;
    user?: number | string;
  }[];
}

/**
 * The type of security scheme. Used by `operation.getSecurityWithTypes()` and `operation.prepareSecurity()`.
 */
export type SecurityType = 'apiKey' | 'Basic' | 'Bearer' | 'Cookie' | 'Header' | 'http' | 'OAuth2' | 'Query';

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
  | 'query'
  | 'trace';

// The following are custom OpenAPI types that we use throughout this library, sans
// `ReferenceObject` because we assume that the API definition has been dereferenced.
//
// These are organized by how they're defined in the OpenAPI Specification.

type WithoutIndexSignature<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};

/**
 * `@scalar/openapi-types` narrows `openapi` to the patch versions it lists. This library also
 * accepts `3.2.x` and any value typed as `string`.
 *
 * `Omit` on a `[key: string]: any` type drops every named field, so the index is removed first
 * and then put back.
 */
type WithStringOpenAPI<T> = T extends any
  ? Omit<WithoutIndexSignature<T>, 'openapi'> & { openapi?: string } & Record<string, any>
  : never;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#openapi-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#openapi-object}
 */
export type OASDocument = WithStringOpenAPI<OpenAPIV3_1.Document | OpenAPIV3.Document>;

export type OAS31Document = WithStringOpenAPI<OpenAPIV3_1.Document>;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#server-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#server-object}
 */
export type ServerObject = OpenAPIV3_1.ServerObject | OpenAPIV3.ServerObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#server-variable-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#server-variable-object}
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
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#components-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#components-object}
 */
export type ComponentsObject = OpenAPIV3_1.ComponentsObject | OpenAPIV3.ComponentsObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#reference-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#reference-object}
 */
export type ReferenceObject = OpenAPIV3_1.ReferenceObject | OpenAPIV3.ReferenceObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#paths-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#paths-object}
 */
export type PathsObject = OpenAPIV3_1.PathsObject | OpenAPIV3.PathsObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#path-item-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#path-item-object}
 */
export type PathItemObject = (OpenAPIV3_1.PathItemObject | OpenAPIV3.PathItemObject) & {
  /**
   * OpenAPI 3.2 operation for the HTTP QUERY method. `OpenAPIV3` and `OpenAPIV3_1` path items do
   * not include it; `OpenAPIV3_2.PathItemObject` does.
   *
   * @see {@link https://spec.openapis.org/oas/v3.2.0.html#path-item-object}
   */
  query?: OperationObject;
};

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#operation-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#operation-object}
 */
export type OperationObject = (OpenAPIV3_1.OperationObject | OpenAPIV3.OperationObject) &
  // `x-*` extensions
  Record<string, unknown>;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#parameter-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#parameter-object}
 */
export type ParameterObject = {
  in: 'cookie' | 'header' | 'path' | 'query';
} & (OpenAPIV3_1.ParameterObject | OpenAPIV3.ParameterObject);

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#request-body-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#request-body-object}
 */
export type RequestBodyObject = OpenAPIV3_1.RequestBodyObject | OpenAPIV3.RequestBodyObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#media-type-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#media-type-object}
 */
export type MediaTypeObject = OpenAPIV3_1.MediaTypeObject | OpenAPIV3.MediaTypeObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#response-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#response-object}
 */
export type ResponseObject = OpenAPIV3_1.ResponseObject | OpenAPIV3.ResponseObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#callback-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#callback-object}
 */
export type CallbackObject = OpenAPIV3_1.CallbackObject | OpenAPIV3.CallbackObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#example-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.3.md#example-object}
 */
export type ExampleObject = OpenAPIV3_1.ExampleObject | OpenAPIV3.ExampleObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#tag-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#tag-object}
 */
export type TagObject = OpenAPIV3_1.TagObject | OpenAPIV3.TagObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#header-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#header-object}
 */
export type HeaderObject = OpenAPIV3_1.HeaderObject | OpenAPIV3.HeaderObject;

type KnownKeys<T> = keyof {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: unknown;
};

/**
 * Drop `@scalar/openapi-types`'s `[key: string]: any` when a type also has named fields. That index
 * makes every object assignable to `{ $ref: string }`.
 */
type StripAnyIndex<T> = T extends any ? ([KnownKeys<T>] extends [never] ? T : { [K in KnownKeys<T>]: T[K] }) : never;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schema-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#schema-object}
 */
export type SchemaObject = StripAnyIndex<
  {
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

    // `discriminator` comes through in `OpenAPIV3.SchemaObject` but because we also union this type
    // to `JSONSchema` TS gets confused when we narrow types everywhere and doens't pick up valid
    // `discriminator` types when we need them.
    discriminator?: DiscriminatorObject;

    // We add this extension within our dereferencing work to preserve the origin dereferenced
    // schemas.
    'x-readme-ref-name'?: string;
  } & (
      | (OpenAPIV3.SchemaObject & object)
      | (OpenAPIV3_1.SchemaObject & object)
      // Adding `JSONSchema` to this because `json-schema-merge-allof` expects those.
      // `object` drops boolean schemas (`true` / `false`), which stay valid at `SchemaObject | boolean`
      // call sites but are not objects this type reads properties from.
      | JSONSchema
    )
> &
  Record<string, any>;

export interface SchemaWrapper {
  $schema?: string;
  description?: string;
  label?: string;
  schema: SchemaObject;
  type: string;
}

/**
 * Determine if a given JSON Schema object is a valid JSON Schema object and either has a declared
 * `type` or is polymorphic in one form or another.
 *
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
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#security-scheme-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#security-scheme-object}
 */
export type SecuritySchemeObject = OpenAPIV3_1.SecuritySchemeObject | OpenAPIV3.SecuritySchemeObject;

export type SecuritySchemesObject = Record<string, SecuritySchemeObject>;

export type KeyedSecuritySchemeObject = SecuritySchemeObject & {
  /**
   * The key for the given security scheme object
   */
  _key: string;

  /**
   * An array of required scopes for the given security scheme object.
   * Used for `oauth2` security scheme types.
   */
  _requirements?: string[];

  // `x-default` is our custom extension for specifying auth defaults.
  // https://docs.readme.com/docs/openapi-extensions#authentication-defaults
  'x-default'?: SecuritySchemeDefaultAuth;
};

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#security-requirement-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#security-requirement-object}
 */
export type SecurityRequirementObject = OpenAPIV3_1.SecurityRequirementObject | OpenAPIV3.SecurityRequirementObject;

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#discriminator-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#discriminator-object}
 */
export type DiscriminatorObject = OpenAPIV3.DiscriminatorObject | OpenAPIV3_1.DiscriminatorObject;

/**
 * Mapping of discriminator schema names to their child schema names.
 * Used to pass information between the pre-dereference and post-dereference phases.
 */
export type DiscriminatorChildrenMap = Map<string, string[]>;
