/**
 * TypeScript definitions for OpenAPI 3.2 API definitions.
 *
 * `openapi-types` does not describe OpenAPI 3.2 so these types layer the additions that 3.2 made
 * on top of its 3.1 definitions. Anything that 3.2 did not change is re-exported from 3.1 as-is.
 *
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html}
 */
import type { OpenAPIV3_1 } from 'openapi-types';

type Modify<T, R> = Omit<T, keyof R> & R;

interface PathsWebhooksComponents<T extends object = NonNullable<unknown>> {
  components: ComponentsObject;
  paths: PathsObject<T>;
  webhooks: Record<string, PathItemObject<T> | ReferenceObject>;
}

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#openapi-object}
 */
export type Document<T extends object = NonNullable<unknown>> = {
  openapi: string;
  $self?: string;
  info: InfoObject;
  jsonSchemaDialect?: string;
  servers?: ServerObject[];
  security?: SecurityRequirementObject[];
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
} & (
  | (Pick<PathsWebhooksComponents<T>, 'paths'> & Omit<Partial<PathsWebhooksComponents<T>>, 'paths'>)
  | (Pick<PathsWebhooksComponents<T>, 'webhooks'> & Omit<Partial<PathsWebhooksComponents<T>>, 'webhooks'>)
  | (Pick<PathsWebhooksComponents<T>, 'components'> & Omit<Partial<PathsWebhooksComponents<T>>, 'components'>)
);

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#info-object}
 */
export type InfoObject = OpenAPIV3_1.InfoObject;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#contact-object}
 */
export type ContactObject = OpenAPIV3_1.ContactObject;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#license-object}
 */
export type LicenseObject = OpenAPIV3_1.LicenseObject;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#server-object}
 */
export type ServerObject = Modify<
  OpenAPIV3_1.ServerObject,
  {
    name?: string;
    variables?: Record<string, ServerVariableObject>;
  }
>;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#server-variable-object}
 */
export type ServerVariableObject = OpenAPIV3_1.ServerVariableObject;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#paths-object}
 */
export type PathsObject<T extends object = NonNullable<unknown>, P extends object = NonNullable<unknown>> = Record<
  string,
  (PathItemObject<T> & P) | undefined
>;

/**
 * HTTP methods that have a fixed field on the Path Item Object. OpenAPI 3.2 added `query` for the
 * HTTP QUERY method; any other method is documented within `additionalOperations`.
 *
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#path-item-object}
 */
export type HttpMethods = OpenAPIV3_1.HttpMethods | 'query';

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#path-item-object}
 */
export interface PathItemObject<T extends object = NonNullable<unknown>> {
  $ref?: string;
  /**
   * A map of additional operations on this path. The map key is the HTTP method with the same
   * capitalization that is to be sent in the request. This map must not contain any entry for the
   * methods that can be defined by the fixed fields (eg. no `POST` entry, as `post` is used for
   * that method).
   */
  additionalOperations?: Record<string, OperationObject<T>>;
  delete?: OperationObject<T>;
  description?: string;
  get?: OperationObject<T>;

  head?: OperationObject<T>;

  options?: OperationObject<T>;
  parameters?: (ReferenceObject | ParameterObject)[];
  patch?: OperationObject<T>;
  post?: OperationObject<T>;
  put?: OperationObject<T>;
  query?: OperationObject<T>;
  servers?: ServerObject[];
  summary?: string;
  trace?: OperationObject<T>;
}

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#operation-object}
 */
export type OperationObject<T extends object = NonNullable<unknown>> = Modify<
  OpenAPIV3_1.OperationObject,
  {
    parameters?: (ReferenceObject | ParameterObject)[];
    requestBody?: ReferenceObject | RequestBodyObject;
    responses?: ResponsesObject;
    callbacks?: Record<string, ReferenceObject | CallbackObject>;
    servers?: ServerObject[];
  }
> &
  T;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#external-documentation-object}
 */
export type ExternalDocumentationObject = OpenAPIV3_1.ExternalDocumentationObject;

/**
 * Possible values for the `in` field on a Parameter Object. OpenAPI 3.2 added `querystring` for
 * parameters that describe the entire URL query string.
 *
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#parameter-locations}
 */
export type ParameterLocation = 'cookie' | 'header' | 'path' | 'query' | 'querystring';

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#parameter-object}
 */
export type ParameterObject = Modify<
  OpenAPIV3_1.ParameterObject,
  {
    in: ParameterLocation;
    schema?: ReferenceObject | SchemaObject;
    examples?: Record<string, ReferenceObject | ExampleObject>;
    content?: Record<string, MediaTypeObject>;
  }
>;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#header-object}
 */
export type HeaderObject = Modify<
  OpenAPIV3_1.HeaderObject,
  {
    schema?: ReferenceObject | SchemaObject;
    examples?: Record<string, ReferenceObject | ExampleObject>;
    content?: Record<string, MediaTypeObject>;
  }
>;

export type NonArraySchemaObjectType = OpenAPIV3_1.NonArraySchemaObjectType;
export type ArraySchemaObjectType = OpenAPIV3_1.ArraySchemaObjectType;

/**
 * OpenAPI 3.2 uses the same JSON Schema 2020-12 dialect as 3.1 but extended the Discriminator and
 * XML objects.
 *
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#schema-object}
 */
export type SchemaObject = OpenAPIV3_1.SchemaObject & {
  discriminator?: DiscriminatorObject;
  xml?: XMLObject;
};

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#discriminator-object}
 */
export type DiscriminatorObject = OpenAPIV3_1.DiscriminatorObject & {
  /**
   * The schema name or URI reference to a schema that is expected to validate the structure of
   * the model when the discriminating property value does not match any of the `mapping` keys.
   */
  defaultMapping?: string;
};

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#xml-object}
 */
export type XMLObject = OpenAPIV3_1.XMLObject & {
  nodeType?: 'attribute' | 'cdata' | 'element' | 'none' | 'text';
};

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#reference-object}
 */
export type ReferenceObject = OpenAPIV3_1.ReferenceObject;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#example-object}
 */
export type ExampleObject = OpenAPIV3_1.ExampleObject & {
  /**
   * An example of the data structure that must be valid according to the relevant Schema Object.
   * OpenAPI 3.2 deprecated `value` in favor of this and the two are mutually exclusive.
   */
  dataValue?: any;

  /**
   * An example of the serialized form of the value, including encoding and escaping as described
   * under Validating Examples. Mutually exclusive with `value` and `externalValue`.
   */
  serializedValue?: string;
};

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#media-type-object}
 */
export type MediaTypeObject = Modify<
  OpenAPIV3_1.MediaTypeObject,
  {
    schema?: ReferenceObject | SchemaObject;

    /**
     * A schema describing each item within a sequential media type (eg. `text/event-stream` or
     * `application/jsonl`).
     */
    itemSchema?: ReferenceObject | SchemaObject;
    examples?: Record<string, ReferenceObject | ExampleObject>;
    encoding?: Record<string, EncodingObject>;
    prefixEncoding?: EncodingObject[];
    itemEncoding?: EncodingObject;
  }
>;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#encoding-object}
 */
export type EncodingObject = Modify<
  OpenAPIV3_1.EncodingObject,
  {
    headers?: Record<string, ReferenceObject | HeaderObject>;
    encoding?: Record<string, EncodingObject>;
    prefixEncoding?: EncodingObject[];
    itemEncoding?: EncodingObject;
  }
>;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#request-body-object}
 */
export type RequestBodyObject = Modify<
  OpenAPIV3_1.RequestBodyObject,
  {
    content: Record<string, MediaTypeObject>;
  }
>;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#responses-object}
 */
export type ResponsesObject = Record<string, ReferenceObject | ResponseObject>;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#response-object}
 */
export type ResponseObject = Modify<
  OpenAPIV3_1.ResponseObject,
  {
    summary?: string;
    headers?: Record<string, ReferenceObject | HeaderObject>;
    content?: Record<string, MediaTypeObject>;
    links?: Record<string, ReferenceObject | LinkObject>;
  }
>;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#link-object}
 */
export type LinkObject = Modify<
  OpenAPIV3_1.LinkObject,
  {
    server?: ServerObject;
  }
>;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#callback-object}
 */
export type CallbackObject<T extends object = NonNullable<unknown>> = Record<
  string,
  PathItemObject<T> | ReferenceObject
>;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#security-requirement-object}
 */
export type SecurityRequirementObject = OpenAPIV3_1.SecurityRequirementObject;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#components-object}
 */
export type ComponentsObject = Modify<
  OpenAPIV3_1.ComponentsObject,
  {
    schemas?: Record<string, SchemaObject>;
    responses?: Record<string, ReferenceObject | ResponseObject>;
    parameters?: Record<string, ReferenceObject | ParameterObject>;
    examples?: Record<string, ReferenceObject | ExampleObject>;
    requestBodies?: Record<string, ReferenceObject | RequestBodyObject>;
    headers?: Record<string, ReferenceObject | HeaderObject>;
    securitySchemes?: Record<string, ReferenceObject | SecuritySchemeObject>;
    links?: Record<string, ReferenceObject | LinkObject>;
    callbacks?: Record<string, ReferenceObject | CallbackObject>;
    pathItems?: Record<string, ReferenceObject | PathItemObject>;
    mediaTypes?: Record<string, ReferenceObject | MediaTypeObject>;
  }
>;

/**
 * Fields that OpenAPI 3.2 added to every type of Security Scheme Object.
 *
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#security-scheme-object}
 */
interface SecuritySchemeBase {
  deprecated?: boolean;
}

export type HttpSecurityScheme = OpenAPIV3_1.HttpSecurityScheme & SecuritySchemeBase;
export type ApiKeySecurityScheme = OpenAPIV3_1.ApiKeySecurityScheme & SecuritySchemeBase;
export type OAuth2SecurityScheme = Modify<
  OpenAPIV3_1.OAuth2SecurityScheme,
  {
    flows: OAuthFlowsObject;

    /**
     * URL to the OAuth2 authorization server metadata (RFC 8414).
     */
    oauth2MetadataUrl?: string;
  }
> &
  SecuritySchemeBase;
export type OpenIdSecurityScheme = OpenAPIV3_1.OpenIdSecurityScheme & SecuritySchemeBase;
export type MutualTLSSecurityScheme = {
  type: 'mutualTLS';
  description?: string;
} & SecuritySchemeBase;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#security-scheme-object}
 */
export type SecuritySchemeObject =
  | ApiKeySecurityScheme
  | HttpSecurityScheme
  | MutualTLSSecurityScheme
  | OAuth2SecurityScheme
  | OpenIdSecurityScheme;

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#oauth-flows-object}
 */
export type OAuthFlowsObject = OpenAPIV3_1.OAuth2SecurityScheme['flows'] & {
  /**
   * Configuration for the OAuth Device Authorization flow (RFC 8628).
   */
  deviceAuthorization?: {
    deviceAuthorizationUrl: string;
    tokenUrl: string;
    refreshUrl?: string;
    scopes: Record<string, string>;
  };
};

/**
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#tag-object}
 */
export type TagObject = Modify<
  OpenAPIV3_1.TagObject,
  {
    summary?: string;

    /**
     * The `name` of a tag that this tag is nested under.
     */
    parent?: string;

    /**
     * A machine-readable string to categorize what sort of tag it is (eg. `nav`, `badge`, or
     * `audience`).
     */
    kind?: string;
  }
>;
