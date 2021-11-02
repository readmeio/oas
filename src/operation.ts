import * as RMOAS from './rmoas.types';
import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

import findSchemaDefinition from './lib/find-schema-definition';
import getParametersAsJsonSchema from './operation/get-parameters-as-json-schema';
import getResponseAsJsonSchema from './operation/get-response-as-json-schema';
import getRequestBodyExamples from './operation/get-requestbody-examples';
import getCallbackExamples from './operation/get-callback-examples';
import getResponseExamples from './operation/get-response-examples';
import matchesMimeType from './lib/matches-mimetype';

type SecurityType = 'Basic' | 'Bearer' | 'Query' | 'Header' | 'Cookie' | 'OAuth2' | 'http' | 'apiKey';
type ResponseExamples = Array<
  | false
  | {
      status: string;
      mediaTypes: Record<string, RMOAS.MediaTypeObject>;
    }
>;
type RequestBodyExamples = Array<
  | false
  | {
      mediaType: string;
      examples: any;
    }
>;

export default class Operation {
  schema: RMOAS.OperationObject;

  api: RMOAS.OASDocument;

  path: string;

  method: RMOAS.HttpMethods;

  contentType: string;

  requestBodyExamples: RequestBodyExamples;

  responseExamples: ResponseExamples;

  callbackExamples: RMOAS.CallbackExamples;

  headers: {
    request: Array<string>;
    response: Array<string>;
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

  getContentType(): string {
    if (this.contentType) {
      return this.contentType;
    }

    let types: Array<string> = [];
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
      if (t.match(/json/)) {
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
   * Returns an array of all security requirements associated wtih this operation. If none are defined at the operation
   * level, the securities for the entire API definition are returned (with an empty array as a final fallback).
   *
   */
  getSecurity(): Array<RMOAS.SecurityRequirementObject> {
    if (!('components' in this.api) || !('securitySchemes' in this.api.components)) {
      return [];
    }

    return this.schema.security || this.api.security || [];
  }

  /**
   * @see {@link https://swagger.io/docs/specification/authentication/#multiple}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#security-requirement-object}
   * @param {boolean} filterInvalid Optional flag that, when set to `true`, filters out invalid/nonexistent security
   *    schemes, rather than returning `false`.
   * @returns {array} An array of arrays of objects of grouped security schemes. The inner array determines and-grouped
   *    security schemes, the outer array determines or-groups.
   */
  getSecurityWithTypes(
    filterInvalid = false
  ): Array<false | Array<false | { security: RMOAS.KeyedSecuritySchemeObject; type: SecurityType }>> {
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

        security._key = key;

        return { type, security };
      });

      if (filterInvalid) return keysWithTypes.filter(key => key !== false);

      return keysWithTypes;
    });
  }

  /**
   * @returns An object where the keys are unique scheme types,
   * and the values are arrays containing each security scheme of that type.
   */
  prepareSecurity(): Record<SecurityType, Array<RMOAS.KeyedSecuritySchemeObject>> {
    const securitiesWithTypes = this.getSecurityWithTypes();

    return securitiesWithTypes.reduce((prev, securities) => {
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
    }, {} as Record<SecurityType, Array<RMOAS.KeyedSecuritySchemeObject>>);
  }

  getHeaders(): Operation['headers'] {
    this.headers = {
      request: [],
      response: [],
    };

    const security = this.prepareSecurity();
    if (security.Header) {
      this.headers.request = (security.Header as Array<OpenAPIV3_1.ApiKeySecurityScheme>).map(h => {
        return h.name;
      });
    }

    if (security.Bearer || security.Basic) {
      this.headers.request.push('Authorization');
    }

    if (security.Cookie) {
      this.headers.request.push('Cookie');
    }

    if (this.schema.parameters) {
      this.headers.request = this.headers.request.concat(
        // Remove the reference object because we will have already dereferenced
        (this.schema.parameters as Array<OpenAPIV3.ParameterObject> | Array<OpenAPIV3_1.ParameterObject>)
          .map(p => {
            if (p.in && p.in === 'header') return p.name;
            return undefined;
          })
          .filter(p => p)
      );
    }

    this.headers.response = Object.keys(this.schema.responses)
      // Remove the reference object because we will have already dereferenced
      .filter(r => (this.schema.responses[r] as RMOAS.ResponseObject).headers)
      .map(r =>
        // Remove the reference object because we will have already dereferenced
        Object.keys((this.schema.responses[r] as RMOAS.ResponseObject).headers)
      )
      .reduce((a, b) => a.concat(b), []);

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
          response => !!(this.schema.responses[response] as RMOAS.ResponseObject).content
        )
      ) {
        if (!this.headers.request.includes('Accept')) this.headers.request.push('Accept');
        if (!this.headers.response.includes('Content-Type')) this.headers.response.push('Content-Type');
      }
    }

    return this.headers;
  }

  /**
   * Determine if the operation has an operation present in its schema.
   *
   */
  hasOperationId(): boolean {
    return 'operationId' in this.schema;
  }

  /**
   * Get an `operationId` for this operation. If one is not present (it's not required by the spec!) a hash of the path
   * and method will be returned instead.
   *
   */
  getOperationId(): string {
    if ('operationId' in this.schema) {
      return this.schema.operationId;
    }

    const url = this.path
      .replace(/[^a-zA-Z0-9]/g, '-') // Remove weird characters
      .replace(/^-|-$/g, '') // Don't start or end with -
      .replace(/--+/g, '-') // Remove double --'s
      .toLowerCase();

    return `${this.method.toLowerCase()}_${url}`;
  }

  /**
   * Return an array of all tags, and their metadata, that exist on this operation.
   *
   */
  getTags(): Array<RMOAS.TagObject> {
    if (!('tags' in this.schema)) {
      return [];
    }

    const oasTags = new Map();
    if ('tags' in this.api) {
      this.api.tags.forEach(tag => {
        oasTags.set(tag.name, tag);
      });
    }

    const tags: Array<RMOAS.TagObject> = [];
    if (Array.isArray(this.schema.tags)) {
      this.schema.tags.forEach(tag => {
        if (oasTags.has(tag)) {
          tags.push(oasTags.get(tag));
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
   * Return the parameters (non-request body) on the operation.
   *
   * @todo This should also pull in common params.
   */
  getParameters(): Array<RMOAS.ParameterObject> {
    return ('parameters' in this.schema ? this.schema.parameters : []) as Array<RMOAS.ParameterObject>;
  }

  /**
   * Convert the operation into an array of JSON Schema for each available type of parameter available on the operation.
   * `globalDefaults` contains an object of user defined parameter defaults used.
   *
   * @param {*} globalDefaults
   * @return {array}
   */
  getParametersAsJsonSchema(globalDefaults?: unknown) {
    return getParametersAsJsonSchema(this.path, this.schema, this.api, globalDefaults);
  }

  /**
   * Get a single response for this status code, formatted as JSON schema.
   *
   * @param {string} statusCode
   * @returns
   */
  getResponseAsJsonSchema(statusCode: string) {
    return getResponseAsJsonSchema(this, this.api, statusCode);
  }

  /**
   * Get an array of all valid response status codes for this operation.
   *
   */
  getResponseStatusCodes(): Array<string> {
    return this.schema.responses ? Object.keys(this.schema.responses) : [];
  }

  /**
   * Determine if the operation has a request body.
   *
   */
  hasRequestBody(): boolean {
    return !!this.schema.requestBody;
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
   * @returns {array}
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
   */
  getCallback(identifier: string, expression: string, method: RMOAS.HttpMethods): false | Callback {
    if (!this.schema.callbacks) return false;

    // const callback = this.schema.callbacks[identifier] ? this.schema.callbacks[identifier][expression] : false;
    // The usage of `as` in the below is to remove the possibility of a ref type, since we've dereferenced.
    const callback = this.schema.callbacks[identifier]
      ? (((this.schema.callbacks as Record<string, RMOAS.CallbackObject>)[identifier] as RMOAS.CallbackObject)[
          expression
        ] as RMOAS.PathItemObject)
      : false;

    if (!callback || !callback[method]) return false;
    return new Callback(this.api, expression, method, callback[method], identifier);
  }

  /**
   * Retrieve an array of operations created from each callback.
   *
   */
  getCallbacks(): false | Array<false | Callback> {
    const callbackOperations: Array<false | Callback> = [];
    if (!this.hasCallbacks()) return false;

    Object.keys(this.schema.callbacks).forEach(callback => {
      Object.keys(this.schema.callbacks[callback]).forEach(expression => {
        const cb = this.schema.callbacks[callback];
        if (!RMOAS.isRef(cb)) {
          const exp = cb[expression];

          if (!RMOAS.isRef(exp)) {
            Object.keys(exp).forEach((method: RMOAS.HttpMethods) => {
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
  getCallbackExamples(): Operation['callbackExamples'] {
    if (this.callbackExamples) {
      return this.callbackExamples;
    }

    this.callbackExamples = getCallbackExamples(this.schema);
    return this.callbackExamples;
  }
}

export class Callback extends Operation {
  identifier: string;

  constructor(
    api: RMOAS.OASDocument,
    path: string,
    method: RMOAS.HttpMethods,
    operation: RMOAS.OperationObject,
    identifier: string
  ) {
    super(api, path, method, operation);

    this.identifier = identifier;
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
}

export class Webhook extends Operation {}

module.exports = Operation;
module.exports.Callback = Callback;
module.exports.Webhook = Webhook;
