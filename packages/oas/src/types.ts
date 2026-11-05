import type { Document as SwaggerDocument } from '@scalar/openapi-types/2.0';
import type * as OAS30 from '@scalar/openapi-types/3.0';
import type * as OAS31 from '@scalar/openapi-types/3.1';
import type * as OAS32 from '@scalar/openapi-types/3.2';
import type { JSONSchema4, JSONSchema6, JSONSchema7 } from 'json-schema';

import {
  isOpenAPI30 as assertOpenAPI30,
  isOpenAPI31 as assertOpenAPI31,
  isOpenAPI32 as assertOpenAPI32,
  isSwagger as assertSwagger,
} from '@readme/openapi-parser/lib/assertions';

export type JSONSchema = JSONSchema4 | JSONSchema6 | JSONSchema7;

/**
 * @param check Data to determine if it contains a ReferenceObject (`$ref` pointer`).
 * @returns If the supplied data has a `$ref` pointer.
 */
export function isRef(check: unknown): check is ReferenceObject {
  return typeof (check as { $ref?: unknown })?.$ref === 'string';
}

/**
 * Is a given object a Swagger API definition?
 *
 */
export function isSwagger(schema: unknown): schema is SwaggerDocument {
  return assertSwagger(schema);
}

/**
 * Is a given object an OpenAPI 3.0 API definition?
 *
 */
export function isOpenAPI30(schema: OpenAPIDocument): schema is OpenAPI30Document {
  return assertOpenAPI30(schema);
}

/**
 * Is a given object an OpenAPI 3.1 API definition?
 *
 */
export function isOpenAPI31(schema: OpenAPIDocument): schema is OpenAPI31Document {
  return assertOpenAPI31(schema);
}

/**
 * Is a given object an OpenAPI 3.2 API definition?
 *
 */
export function isOpenAPI32(schema: OpenAPIDocument): schema is OpenAPI31Document {
  return assertOpenAPI32(schema);
}

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

export type HttpMethods = 'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put' | 'query' | 'trace';

// The following are custom OpenAPI types that we use throughout this library, sans
// `ReferenceObject` because we assume that the API definition has been dereferenced.
//
// These are organized by how they're defined in the OpenAPI Specification.

export type OpenAPI30Document = OAS30.Document;
export type OpenAPI31Document = OAS31.Document;
export type OpenAPI32Document = OAS32.Document;

/**
 * @see {@link https://spec.openapis.org/oas/v3.0.3.html#openapi-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#openapi-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#openapi-object}
 */
export type OpenAPIDocument = OpenAPI30Document | OpenAPI31Document | OpenAPI32Document;

/** @deprecated Use {@link OpenAPIDocument} instead. This will be removed in a future release. */
export type OASDocument = OpenAPIDocument;

/** @deprecated Use {@link OpenAPI31Document} instead. This will be removed in a future release. */
export type OAS31Document = OpenAPI31Document;

/**
 * OpenAPI 3.1 or 3.2 document with a `webhooks` map. 3.0 documents do not have webhooks.
 */
export type OpenAPIDocumentWithWebhooks = (OpenAPI31Document | OpenAPI32Document) & {
  webhooks: NonNullable<OpenAPI31Document['webhooks'] | OpenAPI32Document['webhooks']>;
};

export function hasWebhooks(document: OASDocument): document is OpenAPIDocumentWithWebhooks {
  return 'webhooks' in document && document.webhooks !== undefined;
}

/**
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#server-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#server-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#server-object}
 */
export type ServerObject = OAS30.ServerObject | OAS31.ServerObject | OAS32.ServerObject;

/**
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#server-variable-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#server-variable-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#server-variable-object}
 */
export type ServerVariableObject = OAS30.ServerVariableObject | OAS31.ServerVariableObject | OAS32.ServerVariableObject;
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
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#components-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#components-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#components-object}
 */
export type ComponentsObject = OAS30.ComponentsObject | OAS31.ComponentsObject | OAS32.ComponentsObject;

/**
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#reference-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#reference-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#reference-object}
 */
export type ReferenceObject = OAS30.ReferenceObject | OAS31.ReferenceObject | OAS32.ReferenceObject;

/**
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#paths-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#paths-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#paths-object}
 */
export type PathsObject = OAS30.PathsObject | OAS31.PathsObject | OAS32.PathsObject;

/**
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#path-item-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#path-item-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#path-item-object}
 */
export type PathItemObject = (OAS30.PathItemObject | OAS31.PathItemObject | OAS32.PathItemObject) & {
  /**
   * OpenAPI 3.2 operation for the HTTP QUERY method. 3.0 and 3.1 path items do not include it.
   *
   * @see {@link https://spec.openapis.org/oas/v3.2.0.html#path-item-object}
   */
  query?: OperationObject;
};

/**
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#operation-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#operation-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#operation-object}
 */
export type OperationObject = OAS30.OperationObject | OAS31.OperationObject | OAS32.OperationObject;

/**
 * Parameter as this library reads it. 3.1 and 3.2 encode `schema` and `content` as mutually
 * exclusive variants; callers see both as optional fields.
 *
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#parameter-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#parameter-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#parameter-object}
 */
export interface ParameterObject {
  allowEmptyValue?: boolean;
  allowReserved?: boolean;
  content?: Record<string, MediaTypeObject>;
  deprecated?: boolean;
  description?: string;
  example?: unknown;
  examples?: Record<string, ExampleObject | ReferenceObject>;
  explode?: boolean;
  in: 'cookie' | 'header' | 'path' | 'query' | 'querystring';
  name: string;
  required?: boolean;
  schema?: SchemaObject | boolean;
  style?: string;
}

/** Copy a spec parameter into the flat shape {@link ParameterObject} describes. */
export function parameterObject(value: object): ParameterObject {
  return value as ParameterObject;
}

/**
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#request-body-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#request-body-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#request-body-object}
 */
export type RequestBodyObject = OAS30.RequestBodyObject | OAS31.RequestBodyObject | OAS32.RequestBodyObject;

/**
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#media-type-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#media-type-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#media-type-object}
 */
export type MediaTypeObject = OAS30.MediaTypeObject | OAS31.MediaTypeObject | OAS32.MediaTypeObject;

/**
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#response-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#response-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#response-object}
 */
export type ResponseObject = OAS30.ResponseObject | OAS31.ResponseObject | OAS32.ResponseObject;

/**
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#callback-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#callback-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#callback-object}
 */
export type CallbackObject = OAS30.CallbackObject | OAS31.CallbacksObject | OAS32.CallbacksObject;

/**
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#example-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#example-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#example-object}
 */
export type ExampleObject = OAS30.ExampleObject | OAS31.ExampleObject | OAS32.ExampleObject;

/**
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#tag-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#tag-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#tag-object}
 */
export type TagObject = OAS30.TagObject | OAS31.TagObject | OAS32.TagObject;

/**
 * Header as this library reads it. The header name is the map key. `schema` and `content` are
 * optional, including when the spec encodes them as mutually exclusive variants.
 *
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#header-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#header-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#header-object}
 */
export interface HeaderObject {
  allowEmptyValue?: boolean;
  content?: Record<string, MediaTypeObject>;
  deprecated?: boolean;
  description?: string;
  example?: unknown;
  examples?: Record<string, ExampleObject | ReferenceObject>;
  explode?: boolean;
  required?: boolean;
  schema?: SchemaObject | boolean;
  style?: string;
}

/** Copy a spec header into the flat shape {@link HeaderObject} describes. */
export function headerObject(value: object): HeaderObject {
  return value as HeaderObject;
}

/**
 * Writable JSON Schema object this library normalizes OpenAPI schemas into.
 *
 * OpenAPI 3.0 and 3.1 keywords are optional so `type`, `properties`, `items`, and `allOf` can be
 * read and updated on one shape. `exclusiveMinimum` and `exclusiveMaximum` accept the 3.0 boolean
 * form and the 3.1 numeric form. `nullable`, `components`, and `x-readme-ref-name` are retained
 * while dereferencing and converting to JSON Schema. Boolean schemas stay at
 * `SchemaObject | boolean` call sites.
 *
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#schema-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#schema-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#schema-object}
 */
export interface SchemaObject {
  $anchor?: string;
  $comment?: string;
  $defs?: Record<string, SchemaObject | boolean>;
  $id?: string;
  $ref?: string;
  $schema?: string;

  additionalItems?: SchemaObject | boolean;
  additionalProperties?: SchemaObject | boolean;
  allOf?: (SchemaObject | boolean)[];
  anyOf?: (SchemaObject | boolean)[];
  components?: ComponentsObject;
  const?: unknown;
  contains?: SchemaObject | boolean;
  default?: unknown;
  dependencies?: Record<string, SchemaObject | boolean | string[]>;
  deprecated?: boolean;
  description?: string;
  discriminator?: DiscriminatorObject;
  else?: SchemaObject | boolean;
  enum?: unknown[];

  example?: unknown;
  examples?: unknown;
  exclusiveMaximum?: boolean | number;
  exclusiveMinimum?: boolean | number;
  format?: string;
  if?: SchemaObject | boolean;
  items?: SchemaObject | SchemaObject[] | boolean;
  maxContains?: number;
  maximum?: number;
  maxItems?: number;
  maxLength?: number;
  maxProperties?: number;
  minContains?: number;

  minimum?: number;
  minItems?: number;
  minLength?: number;
  minProperties?: number;
  multipleOf?: number;
  not?: SchemaObject | boolean;

  nullable?: boolean;
  oneOf?: (SchemaObject | boolean)[];
  pattern?: string;
  patternProperties?: Record<string, SchemaObject | boolean>;
  prefixItems?: (SchemaObject | boolean)[];
  properties?: Record<string, SchemaObject | boolean>;

  propertyNames?: SchemaObject | boolean;
  readOnly?: boolean;
  required?: string[];
  then?: SchemaObject | boolean;
  title?: string;
  type?: string | string[] | null;
  unevaluatedProperties?: SchemaObject | boolean;

  uniqueItems?: boolean;
  writeOnly?: boolean;
  'x-readme-ref-name'?: string;
}

/** Copy a spec schema into the writable {@link SchemaObject} this library edits. */
export function schemaObject(value: object): SchemaObject {
  return { ...(value as SchemaObject) };
}

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
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#security-scheme-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#security-scheme-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#security-scheme-object}
 */
export type SecuritySchemeObject = OAS30.SecuritySchemeObject | OAS31.SecuritySchemeObject | OAS32.SecuritySchemeObject;

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
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#security-requirement-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#security-requirement-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#security-requirement-object}
 */
export type SecurityRequirementObject =
  | OAS30.SecurityRequirementObject
  | OAS31.SecurityRequirementObject
  | OAS32.SecurityRequirementObject;

/**
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#discriminator-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#discriminator-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#discriminator-object}
 */
export type DiscriminatorObject = OAS30.DiscriminatorObject;

/**
 * Mapping of discriminator schema names to their child schema names.
 * Used to pass information between the pre-dereference and post-dereference phases.
 */
export type DiscriminatorChildrenMap = Map<string, string[]>;
