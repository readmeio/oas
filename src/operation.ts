import type { CallbackExamples } from './operation/get-callback-examples';
import type { getParametersAsJSONSchemaOptions } from './operation/get-parameters-as-json-schema';
import type { RequestBodyExamples } from './operation/get-requestbody-examples';
import type { ResponseExamples } from './operation/get-response-examples';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

import dedupeCommonParameters from './lib/dedupe-common-parameters';
import findSchemaDefinition from './lib/find-schema-definition';
import matchesMimeType from './lib/matches-mimetype';
import getCallbackExamples from './operation/get-callback-examples';
import getParametersAsJSONSchema from './operation/get-parameters-as-json-schema';
import getRequestBodyExamples from './operation/get-requestbody-examples';
import getResponseAsJSONSchema from './operation/get-response-as-json-schema';
import getResponseExamples from './operation/get-response-examples';
import * as RMOAS from './rmoas.types';
import { supportedMethods } from './utils';

type SecurityType = 'Basic' | 'Bearer' | 'Query' | 'Header' | 'Cookie' | 'OAuth2' | 'http' | 'apiKey';

export default class Operation {
  /**
   * Schema of the operation from the API Definition.
   */
  schema: RMOAS.OperationObject;

  /**
   * OpenAPI API Definition that this operation originated from.
   */
  api: RMOAS.OASDocument;

  /**
   * Path that this operation is targeted towards.
   */
  path: string;

  /**
   * HTTP Method that this operation is targeted towards.
   */
  method: RMOAS.HttpMethods;

  /**
   * The primary Content Type that this operation accepts.
   */
  contentType: string;

  /**
   * Request body examples for this operation.
   */
  requestBodyExamples: RequestBodyExamples;

  /**
   * Response examples for this operation.
   */
  responseExamples: ResponseExamples;

  /**
   * Callback examples for this operation (if it has callbacks).
   */
  callbackExamples: CallbackExamples;

  /**
   * Flattened out arrays of both request and response headers that are utilized on this operation.
   */
  headers: {
    request: string[];
    response: string[];
  };

  constructor(api: RMOAS.OASDocument, path: string, method: RMOAS.HttpMethods, operation: RMOAS.OperationObject) {
    this.schema = operation;
    this.api = api;
    this.path = path;
    this.method = method;

    this.contentType = undefined;
    this.requestBodyExamples = undefined;
    this.responseExamples = undefined;
    this.callbackExamples = undefined;
  }

  getSummary(): string {
    if (this.schema?.summary && typeof this.schema.summary === 'string') {
      return this.schema.summary;
    } else if (this.api.paths[this.path].summary && typeof this.api.paths[this.path].summary === 'string') {
      return this.api.paths[this.path].summary;
    }

    return undefined;
  }

  getDescription(): string {
    if (this.schema?.description && typeof this.schema.description === 'string') {
      return this.schema.description;
    } else if (this.api.paths[this.path].description && typeof this.api.paths[this.path].description === 'string') {
      return this.api.paths[this.path].description;
    }

    return undefined;
  }

  getContentType(): string {
    if (this.contentType) {
      return this.contentType;
    }

    let types: string[] = [];
    if (this.schema.requestBody) {
      if ('$ref' in this.schema.requestBody) {
        this.schema.requestBody = findSchemaDefinition(this.schema.requestBody.$ref, this.api);
      }

      if ('content' in this.schema.requestBody) {
        types = Object.keys(this.schema.requestBody.content);
      }
    }

    this.contentType = 'application/json';
    if (types && types.length) {
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

  isFormUrlEncoded(): boolean {
    return matchesMimeType.formUrlEncoded(this.getContentType());
  }

  isMultipart(): boolean {
    return matchesMimeType.multipart(this.getContentType());
  }

  isJson(): boolean {
    return matchesMimeType.json(this.getContentType());
  }

  isXml(): boolean {
    return matchesMimeType.xml(this.getContentType());
  }

  /**
   * Returns an array of all security requirements associated wtih this operation. If none are
   * defined at the operation level, the securities for the entire API definition are returned
   * (with an empty array as a final fallback).
   *
   */
  getSecurity(): RMOAS.SecurityRequirementObject[] {
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
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#securityRequirementObject}
   * @param filterInvalid Optional flag that, when set to `true`, filters out invalid/nonexistent
   *    security schemes, rather than returning `false`.
   */
  getSecurityWithTypes(
    filterInvalid = false,
  ): (false | (false | { security: RMOAS.KeyedSecuritySchemeObject; type: SecurityType })[])[] {
    const securityRequirements = this.getSecurity();

    return securityRequirements.map(requirement => {
      let keys;
      try {
        keys = Object.keys(requirement);
      } catch (e) {
        return false;
      }

      const keysWithTypes = keys.map(key => {
        let security;
        try {
          // Remove the reference type, because we know this will be dereferenced
          security = this.api.components.securitySchemes[key] as RMOAS.KeyedSecuritySchemeObject;
        } catch (e) {
          return false;
        }

        if (!security) return false;

        let type: SecurityType = null;

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
  prepareSecurity(): Record<SecurityType, RMOAS.KeyedSecuritySchemeObject[]> {
    const securitiesWithTypes = this.getSecurityWithTypes();

    return securitiesWithTypes.reduce(
      (prev, securities) => {
        if (!securities) return prev;

        securities.forEach(security => {
          // Remove non-existent schemes
          if (!security) return;
          if (!prev[security.type]) prev[security.type] = [];

          // Only add schemes we haven't seen yet.
          const exists = prev[security.type].findIndex(sec => sec._key === security.security._key);
          if (exists < 0) {
            prev[security.type].push(security.security);
          }
        });

        return prev;
      },
      {} as Record<SecurityType, RMOAS.KeyedSecuritySchemeObject[]>,
    );
  }

  getHeaders(): Operation['headers'] {
    this.headers = {
      request: [],
      response: [],
    };

    const security = this.prepareSecurity();
    if (security.Header) {
      this.headers.request = (security.Header as OpenAPIV3_1.ApiKeySecurityScheme[]).map(h => {
        return h.name;
      });
    }

    if (security.Bearer || security.Basic || security.OAuth2) {
      this.headers.request.push('Authorization');
    }

    if (security.Cookie) {
      this.headers.request.push('Cookie');
    }

    if (this.schema.parameters) {
      this.headers.request = this.headers.request.concat(
        // Remove the reference object because we will have already dereferenced
        (this.schema.parameters as OpenAPIV3.ParameterObject[] | OpenAPIV3_1.ParameterObject[])
          .map(p => {
            if (p.in && p.in === 'header') return p.name;
            return undefined;
          })
          .filter(p => p),
      );
    }

    if (this.schema.responses) {
      this.headers.response = Object.keys(this.schema.responses)
        // Remove the reference object because we will have already dereferenced
        .filter(r => (this.schema.responses[r] as RMOAS.ResponseObject).headers)
        .map(r =>
          // Remove the reference object because we will have already dereferenced
          Object.keys((this.schema.responses[r] as RMOAS.ResponseObject).headers),
        )
        .reduce((a, b) => a.concat(b), []);
    }

    // If the operation doesn't already specify a 'content-type' request header,
    // we check if the path operation request body contains content, which implies that
    // we should also include the 'content-type' header.
    if (!this.headers.request.includes('Content-Type') && this.schema.requestBody) {
      if (
        (this.schema.requestBody as RMOAS.RequestBodyObject).content &&
        Object.keys((this.schema.requestBody as RMOAS.RequestBodyObject).content)
      ) {
        this.headers.request.push('Content-Type');
      }
    }

    // This is a similar approach, but in this case if we check the response content
    // and prioritize the 'accept' request header and 'content-type' request header
    if (this.schema.responses) {
      if (
        Object.keys(this.schema.responses).some(
          response => !!(this.schema.responses[response] as RMOAS.ResponseObject).content,
        )
      ) {
        if (!this.headers.request.includes('Accept')) this.headers.request.push('Accept');
        if (!this.headers.response.includes('Content-Type')) this.headers.response.push('Content-Type');
      }
    }

    return this.headers;
  }

  /**
   * Determine if the operation has an operation present in its schema. Note that if one is present
   * in the schema but is an empty string then this will return false.
   *
   */
  hasOperationId(): boolean {
    return Boolean('operationId' in this.schema && this.schema.operationId.length);
  }

  /**
   * Get an `operationId` for this operation. If one is not present (it's not required by the spec!)
   * a hash of the path and method will be returned instead.
   *
   */
  getOperationId(opts?: {
    /**
     * Generate a JS method-friendly operation ID when one isn't present.
     */
    camelCase: boolean;
  }): string {
    function sanitize(id: string) {
      // We aren't sanitizing underscores here by default in order to preserve operation IDs that
      // were already generated with this method in the past.
      return id
        .replace(opts?.camelCase ? /[^a-zA-Z0-9_]/g : /[^a-zA-Z0-9]/g, '-') // Remove weird characters
        .replace(/--+/g, '-') // Remove double --'s
        .replace(/^-|-$/g, ''); // Don't start or end with -
    }

    let operationId;
    if (this.hasOperationId()) {
      operationId = this.schema.operationId;
    } else {
      operationId = sanitize(this.path).toLowerCase();
    }

    const method = this.method.toLowerCase();
    if (opts?.camelCase) {
      operationId = operationId.replace(/[^a-zA-Z0-9_]+(.)/g, (_, chr) => chr.toUpperCase());
      if (this.hasOperationId()) {
        operationId = sanitize(operationId);
      }

      // Never start with a number.
      operationId = operationId.replace(/^[0-9]/g, match => `_${match}`);

      // Ensure that the first character of an `operationId` is always lowercase.
      operationId = operationId.charAt(0).toLowerCase() + operationId.slice(1);

      // If the generated `operationId` already starts with the method (eg. `getPets`) we don't want
      // to double it up into `getGetPets`.
      if (operationId.startsWith(method)) {
        return operationId;
      }

      // If this operation already has an `operationId` and we just cleaned it up then we shouldn't
      // prefix it with an HTTP method.
      if (this.hasOperationId()) {
        return operationId;
      }

      // Because we're merging the `operationId` into an HTTP method we need to reset the first
      // character of it back to lowercase so end up with `getBuster`, not `getbuster`.
      operationId = operationId.charAt(0).toUpperCase() + operationId.slice(1);
      return `${method}${operationId}`;
    } else if (this.hasOperationId()) {
      return operationId;
    }

    return `${method}_${operationId}`;
  }

  /**
   * Return an array of all tags, and their metadata, that exist on this operation.
   *
   */
  getTags(): RMOAS.TagObject[] {
    if (!('tags' in this.schema)) {
      return [];
    }

    const oasTagMap: Map<string, RMOAS.TagObject> = new Map();
    if ('tags' in this.api) {
      this.api.tags.forEach((tag: RMOAS.TagObject) => {
        oasTagMap.set(tag.name, tag);
      });
    }

    const oasTags = Object.fromEntries(oasTagMap);

    const tags: RMOAS.TagObject[] = [];
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
   */
  isDeprecated(): boolean {
    return 'deprecated' in this.schema ? this.schema.deprecated : false;
  }

  /**
   * Determine if the operation has any (non-request body) parameters.
   *
   */
  hasParameters() {
    return !!this.getParameters().length;
  }

  /**
   * Return the parameters (non-request body) on the operation.
   *
   */
  getParameters(): RMOAS.ParameterObject[] {
    let parameters = (this.schema?.parameters || []) as RMOAS.ParameterObject[];
    const commonParams = (this.api?.paths?.[this.path]?.parameters || []) as RMOAS.ParameterObject[];
    if (commonParams.length) {
      parameters = parameters.concat(dedupeCommonParameters(parameters, commonParams) || []);
    }

    return parameters;
  }

  /**
   * Determine if this operation has any required parameters.
   *
   */
  hasRequiredParameters() {
    return this.getParameters().some(param => 'required' in param && param.required);
  }

  /**
   * Convert the operation into an array of JSON Schema schemas for each available type of
   * parameter available on the operation.
   *
   */
  getParametersAsJSONSchema(opts: getParametersAsJSONSchemaOptions = {}) {
    return getParametersAsJSONSchema(this, this.api, {
      includeDiscriminatorMappingRefs: true,
      transformer: (s: RMOAS.SchemaObject) => s,
      ...opts,
    });
  }

  /**
   * Get a single response for this status code, formatted as JSON schema.
   *
   * @param statusCode Status code to pull a JSON Schema response for.
   */
  getResponseAsJSONSchema(
    statusCode: string | number,
    opts: {
      /**
       * If you wish to include discriminator mapping `$ref` components alongside your
       * `discriminator` in schemas. Defaults to `true`.
       */
      includeDiscriminatorMappingRefs?: boolean;

      /**
       * With a transformer you can transform any data within a given schema, like say if you want
       * to rewrite a potentially unsafe `title` that might be eventually used as a JS variable
       * name, just make sure to return your transformed schema.
       */
      transformer?: (schema: RMOAS.SchemaObject) => RMOAS.SchemaObject;
    } = {},
  ) {
    return getResponseAsJSONSchema(this, this.api, statusCode, {
      includeDiscriminatorMappingRefs: true,
      transformer: (s: RMOAS.SchemaObject) => s,
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
   */
  hasRequestBody(): boolean {
    return !!this.schema.requestBody;
  }

  /**
   * Retrieve the list of all available media types that the operations request body can accept.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#mediaTypeObject}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#mediaTypeObject}
   */
  getRequestBodyMediaTypes() {
    if (!this.hasRequestBody()) {
      return [];
    }

    const requestBody = this.schema.requestBody;
    if (RMOAS.isRef(requestBody)) {
      // If the request body is still a `$ref` pointer we should return false because this library
      // assumes that you've run dereferencing beforehand.
      return [];
    }

    return Object.keys(requestBody.content);
  }

  /**
   * Determine if this operation has a required request body.
   *
   */
  hasRequiredRequestBody() {
    if (!this.hasRequestBody()) {
      return false;
    }

    const requestBody = this.schema.requestBody;
    if (RMOAS.isRef(requestBody)) {
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
    return !!this.getParametersAsJSONSchema()
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
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#mediaTypeObject}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#mediaTypeObject}
   * @param mediaType Specific request body media type to retrieve if present.
   */
  getRequestBody(mediaType?: string): false | RMOAS.MediaTypeObject | [string, RMOAS.MediaTypeObject, ...string[]] {
    if (!this.hasRequestBody()) {
      return false;
    }

    const requestBody = this.schema.requestBody;
    if (RMOAS.isRef(requestBody)) {
      // If the request body is still a `$ref` pointer we should return false because this library
      // assumes that you've run dereferencing beforehand.
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
    let availableMediaType: string;
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
   */
  getRequestBodyExamples(): RequestBodyExamples {
    if (this.requestBodyExamples) {
      return this.requestBodyExamples;
    }

    this.requestBodyExamples = getRequestBodyExamples(this.schema);
    return this.requestBodyExamples;
  }

  /**
   * Return a specific response out of the operation by a given HTTP status code.
   *
   * @param statusCode Status code to pull a response object for.
   */
  getResponseByStatusCode(statusCode: string | number): boolean | RMOAS.ResponseObject {
    if (!this.schema.responses) {
      return false;
    }

    if (typeof this.schema.responses[statusCode] === 'undefined') {
      return false;
    }

    const response = this.schema.responses[statusCode];

    if (RMOAS.isRef(response)) {
      return false;
    }

    // Remove the reference from the type, because it will already be dereferenced.
    return response;
  }

  /**
   * Retrieve an array of response examples that this operation has.
   *
   */
  getResponseExamples(): ResponseExamples {
    if (this.responseExamples) {
      return this.responseExamples;
    }

    // @todo Remove this `as` once we convert getResponseExamples
    this.responseExamples = getResponseExamples(this.schema) as ResponseExamples;
    return this.responseExamples;
  }

  /**
   * Determine if the operation has callbacks.
   *
   */
  hasCallbacks(): boolean {
    return !!this.schema.callbacks;
  }

  /**
   * Retrieve a specific callback.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#callbackObject}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#callbackObject}
   * @param identifier Callback identifier to look for.
   * @param expression Callback expression to look for.
   * @param method HTTP Method on the callback to look for.
   */
  getCallback(identifier: string, expression: string, method: RMOAS.HttpMethods): false | Callback {
    if (!this.schema.callbacks) return false;

    // The usage of `as` in the below is to remove the possibility of a ref type, since we've
    // dereferenced.
    const callback = this.schema.callbacks[identifier]
      ? (((this.schema.callbacks as Record<string, RMOAS.CallbackObject>)[identifier] as RMOAS.CallbackObject)[
          expression
        ] as RMOAS.PathItemObject)
      : false;

    if (!callback || !callback[method]) return false;
    return new Callback(this.api, expression, method, callback[method], identifier, callback);
  }

  /**
   * Retrieve an array of operations created from each callback.
   *
   */
  getCallbacks(): false | (false | Callback)[] {
    const callbackOperations: (false | Callback)[] = [];
    if (!this.hasCallbacks()) return false;

    Object.keys(this.schema.callbacks).forEach(callback => {
      Object.keys(this.schema.callbacks[callback]).forEach(expression => {
        const cb = this.schema.callbacks[callback];

        if (!RMOAS.isRef(cb)) {
          const exp = cb[expression];

          if (!RMOAS.isRef(exp)) {
            Object.keys(exp).forEach((method: RMOAS.HttpMethods) => {
              if (!supportedMethods.has(method)) return;

              callbackOperations.push(this.getCallback(callback, expression, method));
            });
          }
        }
      });
    });

    return callbackOperations;
  }

  /**
   * Retrieve an array of callback examples that this operation has.
   *
   */
  getCallbackExamples(): CallbackExamples {
    if (this.callbackExamples) {
      return this.callbackExamples;
    }

    this.callbackExamples = getCallbackExamples(this.schema);
    return this.callbackExamples;
  }

  /**
   * Determine if a given a custom specification extension exists within the operation.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#specificationExtensions}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specificationExtensions}
   * @param extension Specification extension to lookup.
   */
  hasExtension(extension: string) {
    return Boolean(this.schema && extension in this.schema);
  }

  /**
   * Retrieve a custom specification extension off of the operation.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#specificationExtensions}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specificationExtensions}
   * @param extension Specification extension to lookup.
   */
  getExtension(extension: string) {
    return this.schema?.[extension];
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
  parentSchema: RMOAS.PathItemObject;

  constructor(
    oas: RMOAS.OASDocument,
    path: string,
    method: RMOAS.HttpMethods,
    operation: RMOAS.OperationObject,
    identifier: string,
    parentPathItem: RMOAS.PathItemObject,
  ) {
    super(oas, path, method, operation);

    this.identifier = identifier;
    this.parentSchema = parentPathItem;
  }

  /**
   * Return the primary identifier for this callback.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#callback-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#callbackObject}
   */
  getIdentifier(): string {
    return this.identifier;
  }

  getSummary(): string {
    if (this.schema?.summary && typeof this.schema.summary === 'string') {
      return this.schema.summary;
    } else if (this.parentSchema.summary && typeof this.parentSchema.summary === 'string') {
      return this.parentSchema.summary;
    }

    return undefined;
  }

  getDescription(): string {
    if (this.schema?.description && typeof this.schema.description === 'string') {
      return this.schema.description;
    } else if (this.parentSchema.description && typeof this.parentSchema.description === 'string') {
      return this.parentSchema.description;
    }

    return undefined;
  }

  getParameters(): RMOAS.ParameterObject[] {
    let parameters = (this.schema?.parameters || []) as RMOAS.ParameterObject[];
    const commonParams = (this.parentSchema.parameters || []) as RMOAS.ParameterObject[];
    if (commonParams.length) {
      parameters = parameters.concat(dedupeCommonParameters(parameters, commonParams) || []);
    }

    return parameters;
  }
}

export class Webhook extends Operation {}
