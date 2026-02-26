import type { Extensions } from '../extensions.js';
import type {
  HttpMethods,
  JSONSchema,
  KeyedSecuritySchemeObject,
  MediaTypeObject,
  OAS31Document,
  OASDocument,
  OperationObject,
  ParameterObject,
  PathItemObject,
  ResponseObject,
  SchemaObject,
  SecurityRequirementObject,
  SecuritySchemeObject,
  SecurityType,
  TagObject,
} from '../types.js';
import type { CallbackExample } from './lib/get-callback-examples.js';
import type { ExampleGroups } from './lib/get-example-groups.js';
import type { getParametersAsJSONSchemaOptions, SchemaWrapper } from './lib/get-parameters-as-json-schema.js';
import type { RequestBodyExample } from './lib/get-requestbody-examples.js';
import type { ResponseSchemaObject } from './lib/get-response-as-json-schema.js';
import type { ResponseExample } from './lib/get-response-examples.js';
import type { OperationIDGeneratorOptions } from './lib/operationId.js';

import { $RefParser } from '@apidevtools/json-schema-ref-parser';

import { buildDiscriminatorOneOf, findDiscriminatorChildren } from '../lib/build-discriminator-one-of.js';
import { isPrimitive } from '../lib/helpers.js';
import matchesMimeType from '../lib/matches-mimetype.js';
import { dereferenceRef, getDereferencingOptions } from '../lib/refs.js';
import { isRef } from '../types.js';
import { supportedMethods } from '../utils.js';
import { dedupeCommonParameters } from './lib/dedupe-common-parameters.js';
import { getCallbackExamples } from './lib/get-callback-examples.js';
import { getExampleGroups } from './lib/get-example-groups.js';
import { getParametersAsJSONSchema } from './lib/get-parameters-as-json-schema.js';
import { getRequestBodyExamples } from './lib/get-requestbody-examples.js';
import { getResponseAsJSONSchema } from './lib/get-response-as-json-schema.js';
import { getResponseExamples } from './lib/get-response-examples.js';
import { getOperationId, hasOperationId } from './lib/operationId.js';

export class Operation {
  /**
   * Schema of the operation from the API Definition.
   */
  schema: OperationObject;

  /**
   * OpenAPI API Definition that this operation originated from.
   */
  api: OASDocument;

  /**
   * Path that this operation is targeted towards.
   */
  path: string;

  /**
   * HTTP Method that this operation is targeted towards.
   */
  method: HttpMethods;

  /**
   * The primary Content Type that this operation accepts.
   */
  contentType: string | undefined;

  /**
   * An object with groups of all example definitions (body/header/query/path/response/etc.)
   */
  exampleGroups: ExampleGroups | undefined;

  /**
   * Request body examples for this operation.
   */
  requestBodyExamples: RequestBodyExample[] | undefined;

  /**
   * Response examples for this operation.
   */
  responseExamples: ResponseExample[] | undefined;

  /**
   * Callback examples for this operation (if it has callbacks).
   */
  callbackExamples: CallbackExample[] | undefined;

  /**
   * Flattened out arrays of both request and response headers that are utilized on this operation.
   */
  headers: {
    request: string[];
    response: string[];
  };

  /**
   * Internal storage array that the library utilizes to keep track of the times the
   * {@see Operation.dereference} has been called so that if you initiate multiple promises they'll
   * all end up returning the same data set once the initial dereference call completed.
   */
  protected promises: {
    reject: any;
    resolve: any;
  }[];

  /**
   * Internal storage array that the library utilizes to keep track of its `dereferencing` state so
   * it doesn't initiate multiple dereferencing processes.
   */
  protected dereferencing: {
    circularRefs: string[];
    complete: boolean;
    processing: boolean;
  };

  constructor(api: OASDocument, path: string, method: HttpMethods, operation: OperationObject) {
    this.schema = operation;
    this.api = api;
    this.path = path;
    this.method = method;

    this.contentType = undefined;
    this.requestBodyExamples = undefined;
    this.responseExamples = undefined;
    this.callbackExamples = undefined;
    this.exampleGroups = undefined;
    this.headers = {
      request: [],
      response: [],
    };

    this.promises = [];
    this.dereferencing = {
      processing: false,
      complete: false,
      circularRefs: [],
    };
  }

  /**
   * Retrieve the `summary` for this operation.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#user-content-operationsummary}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#user-content-operation-summary}
   */
  getSummary(): string | undefined {
    if (this.schema?.summary && typeof this.schema.summary === 'string') {
      return this.schema.summary;
    }

    const pathItem = this.api.paths?.[this.path];
    if (pathItem?.summary && typeof pathItem.summary === 'string') {
      return pathItem.summary;
    }

    return undefined;
  }

  /**
   * Retrieve the `description` for this operation.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#user-content-operationdescription}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#user-content-operation-description}
   */
  getDescription(): string | undefined {
    if (this.schema?.description && typeof this.schema.description === 'string') {
      return this.schema.description;
    }

    const pathItem = this.api.paths?.[this.path];
    if (pathItem?.description && typeof pathItem.description === 'string') {
      return pathItem.description;
    }

    return undefined;
  }

  /**
   * Retrieve the primary content type for this operation. If multiple exist, the first JSON-like
   * type will be returned.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#user-content-requestbodycontent}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#user-content-request-body-content}
   */
  getContentType(): string {
    if (this.contentType) {
      return this.contentType;
    }

    let types: string[] = [];
    if (this.schema.requestBody) {
      if (isRef(this.schema.requestBody)) {
        this.schema.requestBody = dereferenceRef(this.schema.requestBody, this.api);
      }

      if (this.schema.requestBody && 'content' in this.schema.requestBody) {
        types = Object.keys(this.schema.requestBody.content);
      }
    }

    this.contentType = 'application/json';
    if (types?.length) {
      this.contentType = types[0];
    }

    // Favor JSON if it exists
    types.forEach(t => {
      if (matchesMimeType.json(t)) {
        this.contentType = t;
      }
    });

    return this.contentType;
  }

  /**
   * Checks if the current operation has a `x-www-form-urlencoded` content type payload.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#user-content-requestbodycontent}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#user-content-request-body-content}
   */
  isFormUrlEncoded(): boolean {
    return matchesMimeType.formUrlEncoded(this.getContentType());
  }

  /**
   * Checks if the current operation has a mutipart content type payload.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#user-content-requestbodycontent}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#user-content-request-body-content}
   */
  isMultipart(): boolean {
    return matchesMimeType.multipart(this.getContentType());
  }

  /**
   * Checks if the current operation has a JSON-like content type payload.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#user-content-requestbodycontent}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#user-content-request-body-content}
   */
  isJson(): boolean {
    return matchesMimeType.json(this.getContentType());
  }

  /**
   * Checks if the current operation has an XML content type payload.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#user-content-requestbodycontent}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#user-content-request-body-content}
   */
  isXml(): boolean {
    return matchesMimeType.xml(this.getContentType());
  }

  /**
   * Checks if the current operation is a webhook or not.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#oas-webhooks}
   */
  isWebhook(): boolean {
    return this instanceof Webhook;
  }

  /**
   * Returns an array of all security requirements associated wtih this operation. If none are
   * defined at the operation level, the securities for the entire API definition are returned
   * (with an empty array as a final fallback).
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#security-requirement-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#security-requirement-object}
   */
  getSecurity(): SecurityRequirementObject[] {
    if (!this.api?.components?.securitySchemes || !Object.keys(this.api.components.securitySchemes).length) {
      return [];
    }

    return this.schema.security || this.api.security || [];
  }

  /**
   * Retrieve a collection of grouped security schemes. The inner array determines AND-grouped
   * security schemes, the outer array determines OR-groups.
   *
   * @see {@link https://swagger.io/docs/specification/authentication/#multiple}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#security-requirement-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#security-requirement-object}
   * @param filterInvalid Optional flag that, when set to `true`, filters out invalid/nonexistent
   *    security schemes, rather than returning `false`.
   */
  getSecurityWithTypes(
    filterInvalid = false,
  ): ((false | { security: KeyedSecuritySchemeObject; type: SecurityType })[] | false)[] {
    return this.getSecurity().map(requirement => {
      let keys: string[];
      try {
        keys = Object.keys(requirement);
      } catch {
        return false;
      }

      const keysWithTypes = keys.map(key => {
        let security: SecuritySchemeObject | undefined;
        try {
          if (!this.api.components?.securitySchemes?.[key] || isRef(this.api.components.securitySchemes[key])) {
            /** @todo Add support for `ReferenceObject` */
            return false;
          }

          // Remove the reference type, because we know this will be dereferenced
          security = this.api.components.securitySchemes[key];
        } catch {
          return false;
        }

        if (!security) return false;

        let type: SecurityType | null = null;

        if (security.type === 'http') {
          if (security.scheme === 'basic') type = 'Basic';
          else if (security.scheme === 'bearer') type = 'Bearer';
          else type = security.type;
        } else if (security.type === 'oauth2') {
          type = 'OAuth2';
        } else if (security.type === 'apiKey') {
          if (security.in === 'query') type = 'Query';
          else if (security.in === 'header') type = 'Header';
          else if (security.in === 'cookie') type = 'Cookie';
          else type = security.type;
        } else {
          return false;
        }

        return {
          type,
          security: {
            ...security,
            _key: key,
            _requirements: requirement[key],
          },
        };
      });

      if (filterInvalid) return keysWithTypes.filter(key => key !== false);

      return keysWithTypes;
    });
  }

  /**
   * Retrieve an object where the keys are unique scheme types, and the values are arrays
   * containing each security scheme of that type.
   *
   */
  prepareSecurity(): Record<SecurityType, KeyedSecuritySchemeObject[]> {
    return this.getSecurityWithTypes().reduce(
      (prev, securities) => {
        if (!securities) return prev;

        securities.forEach(security => {
          // Remove non-existent schemes
          if (!security) return;
          if (!prev[security.type]) prev[security.type] = [];

          // Only add schemes we haven't seen yet.
          const exists = prev[security.type].some(sec => sec._key === security.security._key);
          if (!exists) {
            // Since an operation can require the same security scheme several times (each with
            // different scope requirements), including the `_requirements` in this object would be
            // misleading since we dedupe the security schemes.
            if (security.security?._requirements) delete security.security._requirements;
            prev[security.type].push(security.security);
          }
        });

        return prev;
      },
      {} as Record<SecurityType, KeyedSecuritySchemeObject[]>,
    );
  }

  /**
   * Retrieve all of the headers, request and response, that are associated with this operation.
   *
   */
  getHeaders(): Operation['headers'] {
    const security = this.prepareSecurity();
    if (security.Header) {
      this.headers.request = security.Header.map((h: KeyedSecuritySchemeObject) => {
        // Only `apiKey` security schemes contain headers.
        if (!('name' in h)) return false;
        return h.name;
      }).filter((item): item is string => item !== false);
    }

    if (security.Bearer || security.Basic || security.OAuth2) {
      this.headers.request.push('Authorization');
    }

    if (security.Cookie) {
      this.headers.request.push('Cookie');
    }

    if (this.schema.parameters) {
      this.headers.request = this.headers.request.concat(
        this.schema.parameters
          .map(p => {
            if (isRef(p)) {
              /** @todo Add support for `ReferenceObject` */
              return undefined;
            }

            if (p.in && p.in === 'header') return p.name;
            return undefined;
          })
          .filter((item): item is string => item !== undefined),
      );
    }

    if (this.schema.responses) {
      this.headers.response = Object.keys(this.schema.responses)
        .map(r => {
          const response = this.schema.responses?.[r];
          if (!response || isRef(response)) {
            /** @todo Add support for `ReferenceObject` */
            return [];
          }

          return response?.headers ? Object.keys(response.headers) : [];
        })
        .reduce((a, b) => a.concat(b), []);
    }

    // If the operation doesn't already specify a `content-type` request header, we check if the
    // path operation request body contains content, which implies that we should also include the
    // `content-type` header.
    if (!this.headers.request.includes('Content-Type') && this.schema.requestBody) {
      const requestBody = this.schema.requestBody;

      /** @todo Add support for `ReferenceObject` */
      if (requestBody && !isRef(requestBody) && 'content' in requestBody && Object.keys(requestBody.content)) {
        this.headers.request.push('Content-Type');
      }
    }

    // This is a similar approach, but in this case if we check the response content and prioritize
    // the `accept` request header and `content-type` request header.
    if (this.schema.responses) {
      if (
        Object.keys(this.schema.responses).some(r => {
          const response = this.schema.responses?.[r];
          if (!response || isRef(response)) {
            /** @todo Add support for `ReferenceObject` */
            return false;
          }

          return response?.content && Object.keys(response.content).length > 0;
        })
      ) {
        if (!this.headers.request.includes('Accept')) this.headers.request.push('Accept');
        if (!this.headers.response.includes('Content-Type')) this.headers.response.push('Content-Type');
      }
    }

    return this.headers;
  }

  /**
   * Determine if this operation has an `operationId` present in its schema. Note that if one is
   * present in the schema but is an empty string then this will return `false`.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#user-content-operationid}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#user-content-operation-id}
   */
  hasOperationId(): boolean {
    return hasOperationId(this.schema);
  }

  /**
   * Determine if an operation has an `operationId` present in its schema. Note that if one is
   * present in the schema but is an empty string then this will return `false`.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#user-content-operationid}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#user-content-operation-id}
   */
  static hasOperationId(schema: OperationObject): boolean {
    return hasOperationId(schema);
  }

  /**
   * Get an `operationId` for this operation. If one is not present (it's not required by the spec!)
   * a hash of the path and method will be returned instead.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#user-content-operationid}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#user-content-operation-id}
   */
  getOperationId(opts: OperationIDGeneratorOptions = {}): string {
    return getOperationId(this.path, this.method, this.schema, opts);
  }

  /**
   * Get an `operationId` for an operation. If one is not present (it's not required by the spec!)
   * a hash of the path and method will be returned instead.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#user-content-operationid}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#user-content-operation-id}
   */
  static getOperationId(
    path: string,
    method: string,
    schema: OperationObject,
    opts: OperationIDGeneratorOptions = {},
  ): string {
    return getOperationId(path, method, schema, opts);
  }

  /**
   * Return an array of all tags, and their metadata, that exist on this operation.
   *
   */
  getTags(): TagObject[] {
    if (!('tags' in this.schema)) {
      return [];
    }

    const oasTagMap: Map<string, TagObject> = new Map();
    if (Array.isArray(this.api?.tags)) {
      this.api.tags.forEach(tag => {
        oasTagMap.set(tag.name, tag);
      });
    }

    const oasTags = Object.fromEntries(oasTagMap);

    const tags: TagObject[] = [];
    if (Array.isArray(this.schema.tags)) {
      this.schema.tags.forEach(tag => {
        if (tag in oasTags) {
          tags.push(oasTags[tag]);
        } else {
          tags.push({
            name: tag,
          });
        }
      });
    }

    return tags;
  }

  /**
   * Return is the operation is flagged as `deprecated` or not.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#user-content-operationdeprecated}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#user-content-operation-deprecated}
   */
  isDeprecated(): boolean {
    return Boolean('deprecated' in this.schema ? this.schema.deprecated : false);
  }

  /**
   * Determine if the operation has any (non-request body) parameters.
   *
   */
  hasParameters(): boolean {
    return !!this.getParameters().length;
  }

  /**
   * Return the parameters (non-request body) on the operation.
   *
   * @todo Add support for `ReferenceObject`
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#user-content-operationparameters}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#user-content-operation-parameters}
   */
  getParameters(): ParameterObject[] {
    let parameters = (this.schema?.parameters || []).filter(
      (param): param is ParameterObject => param && !isRef(param),
    );

    const commonParams = (this.api?.paths?.[this.path]?.parameters || []).filter(
      (param): param is ParameterObject => param && !isRef(param),
    );

    if (commonParams.length) {
      parameters = parameters.concat(dedupeCommonParameters(parameters, commonParams) || []);
    }

    return parameters;
  }

  /**
   * Determine if this operation has any required parameters.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#user-content-operationparameters}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#user-content-operation-parameters}
   */
  hasRequiredParameters(): boolean {
    return this.getParameters().some(param => 'required' in param && param.required);
  }

  /**
   * Convert the operation into an array of JSON Schema schemas for each available type of
   * parameter available on the operation.
   *
   */
  getParametersAsJSONSchema(opts: getParametersAsJSONSchemaOptions = {}): SchemaWrapper[] | null {
    return getParametersAsJSONSchema(this, this.api, {
      includeDiscriminatorMappingRefs: true,
      transformer: (s: SchemaObject) => s,
      ...opts,
    });
  }

  /**
   * Get a single response for this status code, formatted as JSON schema.
   *
   * @param statusCode Status code to pull a JSON Schema response for.
   * @param opts Options for schema generation.
   * @param opts.contentType Optional content-type to use. If specified and the response doesn't have
   *   this content-type, the function will return null.
   */
  getResponseAsJSONSchema(
    statusCode: number | string,
    opts: {
      /**
       * If you wish to include discriminator mapping `$ref` components alongside your
       * `discriminator` in schemas. Defaults to `true`.
       */
      includeDiscriminatorMappingRefs?: boolean;

      /**
       * Optional content-type to use. If specified and the response doesn't have this content-type,
       * the function will return null.
       */
      contentType?: string;

      /**
       * With a transformer you can transform any data within a given schema, like say if you want
       * to rewrite a potentially unsafe `title` that might be eventually used as a JS variable
       * name, just make sure to return your transformed schema.
       */
      transformer?: (schema: SchemaObject) => SchemaObject;
    } = {},
  ): ResponseSchemaObject[] | null {
    return getResponseAsJSONSchema(this, this.api, statusCode, {
      includeDiscriminatorMappingRefs: true,
      transformer: (s: SchemaObject) => s,
      ...opts,
    });
  }

  /**
   * Get an array of all valid response status codes for this operation.
   *
   */
  getResponseStatusCodes(): string[] {
    return this.schema.responses ? Object.keys(this.schema.responses) : [];
  }

  /**
   * Determine if the operation has any request bodies.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#user-content-operationrequestbody}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#user-content-operation-request-body}
   */
  hasRequestBody(): boolean {
    return !!this.schema.requestBody;
  }

  /**
   * Retrieve the list of all available media types that the operations request body can accept.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#media-type-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#media-type-object}
   */
  getRequestBodyMediaTypes(): string[] {
    if (!this.hasRequestBody()) {
      return [];
    }

    const requestBody = this.schema.requestBody;
    if (!requestBody || isRef(requestBody)) {
      /** @todo Add support for `ReferenceObject` */
      return [];
    }

    return Object.keys(requestBody.content);
  }

  /**
   * Determine if this operation has a required request body.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#media-type-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#media-type-object}
   */
  hasRequiredRequestBody(): boolean {
    if (!this.hasRequestBody()) {
      return false;
    }

    const requestBody = this.schema.requestBody;
    if (!requestBody || isRef(requestBody)) {
      /** @todo Add support for `ReferenceObject` */
      return false;
    }

    if (requestBody.required) {
      return true;
    }

    // The OpenAPI spec isn't clear on the differentiation between schema `required` and
    // `requestBody.required` because you can have required top-level schema properties but a
    // non-required requestBody that negates each other.
    //
    // To kind of work ourselves around this and present a better QOL for this accessor, if at this
    // final point where we don't have a required request body, but the underlying Media Type Object
    // schema says that it has required properties then we should ultimately recognize that this
    // request body is required -- even as the request body description says otherwise.
    const parameters = this.getParametersAsJSONSchema();
    if (parameters === null) {
      return false;
    }

    return !!parameters
      .filter(js => ['body', 'formData'].includes(js.type))
      .find(js => js.schema && Array.isArray(js.schema.required) && js.schema.required.length);
  }

  /**
   * Retrieve a specific request body content schema off this operation.
   *
   * If no media type is supplied this will return either the first available JSON-like request
   * body, or the first available if there are no JSON-like media types present. When this return
   * comes back it's in the form of an array with the first key being the selected media type,
   * followed by the media type object in question.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#media-type-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#media-type-object}
   * @param mediaType Specific request body media type to retrieve if present.
   */
  getRequestBody(mediaType?: string): MediaTypeObject | false | [string, MediaTypeObject, ...string[]] {
    if (!this.hasRequestBody()) {
      return false;
    }

    const requestBody = this.schema.requestBody;
    if (!requestBody || isRef(requestBody)) {
      /** @todo Add support for `ReferenceObject` */
      return false;
    }

    if (mediaType) {
      if (!(mediaType in requestBody.content)) {
        return false;
      }

      return requestBody.content[mediaType];
    }

    // Since no media type was supplied we need to find either the first JSON-like media type that
    // we've got, or the first available of anything else if no JSON-like media types are present.
    let availableMediaType: string | undefined;
    const mediaTypes = this.getRequestBodyMediaTypes();
    mediaTypes.forEach((mt: string) => {
      if (!availableMediaType && matchesMimeType.json(mt)) {
        availableMediaType = mt;
      }
    });

    if (!availableMediaType) {
      mediaTypes.forEach((mt: string) => {
        if (!availableMediaType) {
          availableMediaType = mt;
        }
      });
    }

    if (availableMediaType) {
      return [
        availableMediaType,
        requestBody.content[availableMediaType],
        ...(requestBody.description ? [requestBody.description] : []),
      ];
    }

    return false;
  }

  /**
   * Retrieve an array of request body examples that this operation has.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#request-body-examples}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#request-body-examples}
   */
  getRequestBodyExamples(): RequestBodyExample[] {
    const isRequestExampleValueDefined = typeof this.requestBodyExamples?.[0]?.examples?.[0].value !== 'undefined';

    if (this.requestBodyExamples && isRequestExampleValueDefined) {
      return this.requestBodyExamples;
    }

    this.requestBodyExamples = getRequestBodyExamples(this.schema);
    return this.requestBodyExamples;
  }

  /**
   * Return a specific response out of the operation by a given HTTP status code.
   *
   * @param statusCode Status code to pull a response object for.
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#response-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#response-object}
   */
  getResponseByStatusCode(statusCode: number | string): ResponseObject | false {
    if (!this.schema.responses) {
      return false;
    }

    const response = this.schema.responses[statusCode];
    if (!response || isRef(response)) {
      /** @todo Add support for `ReferenceObject` */
      return false;
    }

    return response;
  }

  /**
   * Retrieve an array of response examples that this operation has.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#response-object-examples}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.2.md#response-object-examples}
   */
  getResponseExamples(): ResponseExample[] {
    if (this.responseExamples) {
      return this.responseExamples;
    }

    this.responseExamples = getResponseExamples(this.schema);
    return this.responseExamples;
  }

  /**
   * Determine if the operation has callbacks.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#callback-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#callback-object}
   */
  hasCallbacks(): boolean {
    return Boolean(this.schema.callbacks);
  }

  /**
   * Retrieve a specific callback.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#callback-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#callback-object}
   * @param identifier Callback identifier to look for.
   * @param expression Callback expression to look for.
   * @param method HTTP Method on the callback to look for.
   */
  getCallback(identifier: string, expression: string, method: HttpMethods): Callback | false {
    if (!this.schema.callbacks) return false;

    // The usage of `as` in the below is to remove the possibility of a ref type, since we've
    // dereferenced.
    const callbackObj = this.schema.callbacks[identifier];
    if (!callbackObj || isRef(callbackObj)) {
      /** @todo Add support for `ReferenceObject` */
      return false;
    }

    const callback = callbackObj[expression];
    if (!callback || isRef(callback) || !callback[method]) {
      /** @todo Add support for `ReferenceObject` */
      return false;
    }

    return new Callback(this.api, expression, method, callback[method], identifier, callback);
  }

  /**
   * Retrieve an array of operations created from each callback.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#callback-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#callback-object}
   */
  getCallbacks(): Callback[] {
    if (!this.hasCallbacks()) return [];

    const callbacks: Callback[] = [];
    Object.keys(this.schema.callbacks || {}).forEach(callback => {
      const cb = this.schema.callbacks?.[callback];
      if (!cb || isRef(cb)) {
        /** @todo Add support for `ReferenceObject` */
        return;
      }

      Object.keys(cb).forEach(expression => {
        const exp = cb[expression];
        if (!exp || isRef(exp)) {
          /** @todo Add support for `ReferenceObject` */
          return;
        }

        Object.keys(exp).forEach(method => {
          if (!supportedMethods.includes(method as HttpMethods)) return;

          const found = this.getCallback(callback, expression, method as HttpMethods);
          if (found) {
            callbacks.push(found);
          }
        });
      });
    });

    return callbacks;
  }

  /**
   * Retrieve an array of callback examples that this operation has.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#callback-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#callback-object}
   */
  getCallbackExamples(): CallbackExample[] {
    if (this.callbackExamples) {
      return this.callbackExamples;
    }

    this.callbackExamples = getCallbackExamples(this.schema);
    return this.callbackExamples;
  }

  /**
   * Determine if a given a custom specification extension exists within the operation.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#specification-extensions}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specification-extensions}
   * @param extension Specification extension to lookup.
   */
  hasExtension(extension: string): boolean {
    return Boolean(this.schema && extension in this.schema);
  }

  /**
   * Retrieve a custom specification extension off of the operation.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#specification-extensions}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specification-extensions}
   * @param extension Specification extension to lookup.
   *
   * @deprecated Use `oas.getExtension(extension, operation)` instead.
   */
  getExtension(extension: string | keyof Extensions): any {
    return this.schema?.[extension];
  }

  /**
   * Returns an object with groups of all example definitions (body/header/query/path/response/etc.).
   * The examples are grouped by their key when defined via the `examples` map.
   *
   * Any custom code samples defined via the `x-readme.code-samples` extension are returned,
   * regardless of if they have a matching response example.
   *
   * For standard OAS request parameter (e.g., body/header/query/path/etc.) examples,
   * they are only present in the return object if they have a corresponding response example
   * (i.e., a response example with the same key in the `examples` map).
   */
  getExampleGroups(): ExampleGroups {
    if (this.exampleGroups) return this.exampleGroups;

    const groups = getExampleGroups(this);

    this.exampleGroups = groups;

    return groups;
  }

  /**
   * Dereference the current operation schema so it can be parsed free of worries of `$ref` schemas
   * and circular structures.
   *
   */
  async dereference(opts?: {
    /**
     * A callback method can be supplied to be called when dereferencing is complete. Used for
     * debugging that the multi-promise handling within this method works.
     *
     * @private
     */
    cb?: () => void;
  }): Promise<(typeof this.promises)[] | boolean> {
    if (this.dereferencing.complete) {
      return Promise.resolve(true);
    }

    if (this.dereferencing.processing) {
      return new Promise((resolve, reject) => {
        this.promises.push({ resolve, reject });
      });
    }

    this.dereferencing.processing = true;

    /**
     * Find `discriminator` schemas and their children before dereferencing (`allOf` `$ref` pointers
     * are resolved during dereferencing). For schemas with a `discriminator` using `allOf`
     * inheritance we build a `oneOf` array from the discovered child schemas so consumers can see
     * the full set of polymorphic options.
     *
     * @see {@link https://spec.openapis.org/oas/v3.0.0.html#fixed-fields-20}
     */
    const { children: discriminatorChildrenMap, inverted: discriminatorChildrenMapInverted } =
      findDiscriminatorChildren(this.api);

    const { api, schema, promises } = this;

    // Because referencing will eliminate any lineage back to the original `$ref`, information that
    // we might need at some point, we should run through all available component schemas and denote
    // what their name is so that when dereferencing happens below those names will be preserved.
    //
    // Note: this mutates `this.api.components.schemas` in-place. Ideally we'd clone `components`
    // to avoid the side effect but `json-schema-ref-parser` relies on object identity for reference
    // resolution, so cloning breaks $ref handling. The mutation is idempotent (same key/value each
    // time) so it's safe in practice.
    if (api?.components?.schemas && typeof api.components.schemas === 'object') {
      Object.keys(api.components.schemas).forEach(schemaName => {
        // As of OpenAPI 3.1 component schemas can be primitives or arrays. If this happens then we
        // shouldn't try to add `title` or `x-readme-ref-name` properties because we can't. We'll
        // have some data loss on these schemas but as they aren't objects they likely won't be used
        // in ways that would require needing a `title` or `x-readme-ref-name` anyways.
        if (
          isPrimitive(api.components?.schemas?.[schemaName]) ||
          Array.isArray(api.components?.schemas?.[schemaName]) ||
          api.components?.schemas?.[schemaName] === null
        ) {
          return;
        }

        (api.components?.schemas?.[schemaName] as SchemaObject)['x-readme-ref-name'] = schemaName;
      });
    }

    const circularRefs: Set<string> = new Set();
    const dereferencingOptions = getDereferencingOptions(circularRefs);

    const parser = new $RefParser();
    return parser
      .dereference(
        '#/__INTERNAL__',
        {
          // Because `json-schema-ref-parser` will dereference this entire object as we only want
          // to dereference this operation schema we're attaching it to the `__INTERNAL__` key, and
          // later using that to extract our dereferenced schema. If we didn't do this then we run
          // the risk of any keyword in `schema` being overriden by `paths` and `components`.
          //
          // This solution isn't the best and still requires us to send `json-schema-ref-parser`
          // basically the entire API defintiion but because we don't know what `$ref` pointers in
          // `schema` reference, we can't know which parts of full API definition we could safely
          // exclude from this process.
          __INTERNAL__: structuredClone(schema),
          paths: api.paths ?? undefined,
          components: api.components ?? undefined,
        },
        {
          ...dereferencingOptions,
          dereference: {
            ...dereferencingOptions.dereference,

            /**
             * Because we only want to dereference our `__INTERNAL__` schema, not the **entire**
             * API definition if the parser attemps to dereference anything but that then we
             * should bail out of that crawler.
             *
             * @fixme this may cause issues where a path references a schema within itself to be ignored.
             */
            excludedPathMatcher: (path: string) => {
              if (path === '#/paths' || path.startsWith('#/paths/')) {
                return true;
              }

              // In order to support not dereferencing the entire schema but also maintaining the
              // reconstruction of discriminator `oneOf` arrays we need to ensure that the
              // discriminators `$ref` pointers that we're aware of are fully dereferenced. If we
              // don't do this then because they aren't explicitly used in the schemas they will be
              // fully dereferenced into their containers before we're able to toss them into a
              // `oneOf`.
              if (discriminatorChildrenMap.size > 0 || discriminatorChildrenMapInverted.size > 0) {
                // As we only care about component schemas for this discriminator construction
                // functionality we shouldn't expressly dereference anything else in `#/components`.
                if (
                  path.startsWith('#/components/') &&
                  path !== '#/components/schemas' &&
                  !path.startsWith('#/components/schemas/')
                ) {
                  return true;
                }

                if (path.startsWith('#/components/schemas/')) {
                  const schemaName = path.split('/').pop();

                  // If this schema we're looking at has a discriminator children mapping, or is the
                  // child of one, then we should ensure it's fully dereferenced.
                  if (
                    schemaName &&
                    (discriminatorChildrenMap.has(schemaName) || discriminatorChildrenMapInverted.has(schemaName))
                  ) {
                    if (
                      path === `#/components/schemas/${schemaName}` ||
                      path.startsWith(`#/components/schemas/${schemaName}/`)
                    ) {
                      return false;
                    }

                    // Because this component schema isn't part of a discriminator we will be using
                    // later we can exclude it from dereferencing.
                    return true;
                  }
                }

                return false;
              }

              // If the path we're looking at isn't part of our discriminator children mappings
              // then we should exclude it from dereferencing.
              return path === '#/components' || path.startsWith('#/components/');
            },
          },
        },
      )
      .then(res => {
        const dereferenced = res as JSONSchema & {
          __INTERNAL__: OperationObject;
          components?: OASDocument['components'];
        };

        // Construct `oneOf` arrays for `discriminator` schemas using their dereferenced child
        // schemas. This must be done **after** dereferencing so we have the fully resolved child
        // schemas.
        if (dereferenced?.components?.schemas && discriminatorChildrenMap.size > 0) {
          buildDiscriminatorOneOf({ components: dereferenced.components }, discriminatorChildrenMap);
        }

        // Refresh the current schema with the newly dereferenced one.
        this.schema = dereferenced.__INTERNAL__;

        this.promises = promises;
        this.dereferencing = {
          processing: false,
          complete: true,
          // We need to convert our `Set` to an array in order to match the typings.
          circularRefs: [...circularRefs],
        };

        // Used for debugging that dereferencing promise awaiting works.
        if (opts?.cb) {
          opts.cb();
        }
      })
      .then(() => {
        return this.promises.map(deferred => deferred.resolve());
      })
      .catch(err => {
        this.dereferencing.processing = false;
        this.promises.map(deferred => deferred.reject(err));
        throw err;
      });
  }

  /**
   * Retrieve any circular `$ref` pointers that maybe present within operation schema.
   *
   * This method requires that you first dereference the definition.
   *
   * @see Operation.dereference
   */
  getCircularReferences(): string[] {
    if (!this.dereferencing.complete) {
      throw new Error('.dereference() must be called first in order for this method to obtain circular references.');
    }

    return this.dereferencing.circularRefs;
  }
}

export class Callback extends Operation {
  /**
   * The identifier that this callback is set to.
   */
  identifier: string;

  /**
   * The parent path item object that this Callback exists within.
   */
  parentSchema: PathItemObject;

  constructor(
    oas: OASDocument,
    path: string,
    method: HttpMethods,
    operation: OperationObject,
    identifier: string,
    parentPathItem: PathItemObject,
  ) {
    super(oas, path, method, operation);

    this.identifier = identifier;
    this.parentSchema = parentPathItem;
  }

  /**
   * Return the primary identifier for this callback.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#callback-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#callback-object}
   */
  getIdentifier(): string {
    return this.identifier;
  }

  getSummary(): string | undefined {
    if (this.schema?.summary && typeof this.schema.summary === 'string') {
      return this.schema.summary;
    } else if (this.parentSchema.summary && typeof this.parentSchema.summary === 'string') {
      return this.parentSchema.summary;
    }

    return undefined;
  }

  getDescription(): string | undefined {
    if (this.schema?.description && typeof this.schema.description === 'string') {
      return this.schema.description;
    } else if (this.parentSchema.description && typeof this.parentSchema.description === 'string') {
      return this.parentSchema.description;
    }

    return undefined;
  }

  getParameters(): ParameterObject[] {
    let parameters = (this.schema?.parameters || []) as ParameterObject[];
    const commonParams = (this.parentSchema.parameters || []) as ParameterObject[];
    if (commonParams.length) {
      parameters = parameters.concat(dedupeCommonParameters(parameters, commonParams) || []);
    }

    return parameters;
  }
}

export class Webhook extends Operation {
  /**
   * OpenAPI API Definition that this webhook originated from.
   */
  declare api: OAS31Document;

  getSummary(): string | undefined {
    if (this.schema?.summary && typeof this.schema.summary === 'string') {
      return this.schema.summary;
    }

    const webhookPath = this.api.webhooks?.[this.path];
    if (webhookPath && !isRef(webhookPath)) {
      /** @todo Add support for `ReferenceObject` */
      if (webhookPath?.summary && typeof webhookPath.summary === 'string') {
        return webhookPath.summary;
      }
    }

    return undefined;
  }

  getDescription(): string | undefined {
    if (this.schema?.description && typeof this.schema.description === 'string') {
      return this.schema.description;
    }

    const webhookPath = this.api.webhooks?.[this.path];
    if (webhookPath && !isRef(webhookPath)) {
      /** @todo Add support for `ReferenceObject` */
      if (webhookPath?.description && typeof webhookPath.description === 'string') {
        return webhookPath.description;
      }
    }

    return undefined;
  }
}
