import findSchemaDefinition from './lib/find-schema-definition';
import getParametersAsJsonSchema from './operation/get-parameters-as-json-schema';
import getResponseAsJsonSchema from './operation/get-response-as-json-schema';
import getRequestBodyExamples from './operation/get-requestbody-examples';
import getCallbackExamples from './operation/get-callback-examples';
import getResponseExamples from './operation/get-response-examples';
import matchesMimeType from './lib/matches-mimetype';
import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

import Oas = require('./index');

type SecurityType = 'Basic' | 'Bearer' | 'Query' | 'Header' | 'Cookie' | 'OAuth2' | 'http' | 'apiKey';
type KeyedSecuritySchemeObject =
  | (OpenAPIV3.SecuritySchemeObject & { _key?: string })
  | (OpenAPIV3_1.SecuritySchemeObject & { _key?: string });

export default class Operation {
  /**
   *
   */
  schema: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;

  /**
   *
   */
  oas: (Oas & OpenAPIV3.Document) | (Oas & OpenAPIV3_1.Document); // TODO: When we convert OAS, we shouldn't have to do this

  /**
   *
   */
  path: string;

  /**
   *
   */
  method: OpenAPIV3.HttpMethods | OpenAPIV3_1.HttpMethods;

  /**
   *
   */
  contentType: string;

  /**
   *
   */
  requestBodyExamples: unknown;

  /**
   *
   */
  responseExamples: unknown;

  /**
   *
   */
  callbackExamples: unknown;

  /**
   *
   */
  headers: {
    request: Array<string>;
    response: Array<string>;
  };

  constructor(
    oas: (Oas & OpenAPIV3.Document) | (Oas & OpenAPIV3_1.Document),
    path: string,
    method: OpenAPIV3.HttpMethods | OpenAPIV3_1.HttpMethods,
    operation: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject
  ) {
    this.schema = operation;
    this.oas = oas;
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
        this.schema.requestBody = findSchemaDefinition(this.schema.requestBody.$ref, this.oas);
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
   * @returns {array}
   */
  getSecurity(): Array<OpenAPIV3.SecurityRequirementObject | OpenAPIV3_1.SecurityRequirementObject> {
    if (!('components' in this.oas) || !('securitySchemes' in this.oas.components)) {
      return [];
    }

    return this.schema.security || this.oas.security || [];
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
  ): Array<false | Array<false | { security: KeyedSecuritySchemeObject; type: SecurityType }>> {
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
          security = this.oas.components.securitySchemes[key] as KeyedSecuritySchemeObject;
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
  prepareSecurity(): Record<SecurityType, Array<KeyedSecuritySchemeObject>> {
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
    }, {} as Record<SecurityType, Array<KeyedSecuritySchemeObject>>);
  }

  getHeaders() {
    this.headers = {
      request: [],
      response: [],
    };

    const security = this.prepareSecurity();
    if (security.Header) {
      this.headers.request = security.Header.map(h => {
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
      .filter(r => (this.schema.responses[r] as OpenAPIV3.ResponseObject | OpenAPIV3_1.ResponseObject).headers)
      .map(r =>
        // Remove the reference object because we will have already dereferenced
        Object.keys((this.schema.responses[r] as OpenAPIV3.ResponseObject | OpenAPIV3_1.ResponseObject).headers)
      )
      .reduce((a, b) => a.concat(b), []);

    // If the operation doesn't already specify a 'content-type' request header,
    // we check if the path operation request body contains content, which implies that
    // we should also include the 'content-type' header.
    if (!this.headers.request.includes('Content-Type') && this.schema.requestBody) {
      if (
        (this.schema.requestBody as OpenAPIV3.RequestBodyObject | OpenAPIV3_1.RequestBodyObject).content &&
        Object.keys((this.schema.requestBody as OpenAPIV3.RequestBodyObject | OpenAPIV3_1.RequestBodyObject).content)
      )
        this.headers.request.push('Content-Type');
    }

    // This is a similar approach, but in this case if we check the response content
    // and prioritize the 'accept' request header and 'content-type' request header
    if (this.schema.responses) {
      if (
        Object.keys(this.schema.responses).some(
          response =>
            !!(this.schema.responses[response] as OpenAPIV3.ResponseObject | OpenAPIV3_1.ResponseObject).content
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
   * @return {boolean}
   */
  hasOperationId(): boolean {
    return 'operationId' in this.schema;
  }

  /**
   * Get an `operationId` for this operation. If one is not present (it's not required by the spec!) a hash of the path
   * and method will be returned instead.
   *
   * @return {string}
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
   * @returns {array}
   */
  getTags(): Array<OpenAPIV3.TagObject | OpenAPIV3_1.TagObject> {
    if (!('tags' in this.schema)) {
      return [];
    }

    const oasTagMap: Map<string, OpenAPIV3.TagObject | OpenAPIV3_1.TagObject> = new Map();
    if ('tags' in this.oas) {
      this.oas.tags.forEach(tag => {
        oasTagMap.set(tag.name, tag);
      });
    }

    const oasTags = Object.fromEntries(oasTagMap);

    const tags: Array<OpenAPIV3.TagObject | OpenAPIV3_1.TagObject> = [];
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
   * @returns {boolean}
   */
  isDeprecated(): boolean {
    return 'deprecated' in this.schema ? this.schema.deprecated : false;
  }

  /**
   * Return the parameters (non-request body) on the operation.
   *
   * @todo This should also pull in common params.
   * @return {array}
   */
  getParameters(): Array<OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject> {
    return ('parameters' in this.schema ? this.schema.parameters : []) as Array<
      OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject
    >;
  }

  /**
   * Convert the operation into an array of JSON Schema for each available type of parameter available on the operation.
   * `globalDefaults` contains an object of user defined parameter defaults used in constructSchema
   *
   * @param {Object} globalDefaults
   * @return {array}
   */
  getParametersAsJsonSchema(globalDefaults) {
    return getParametersAsJsonSchema(this.path, this.schema, this.oas, globalDefaults);
  }

  /**
   * Get a single response for this status code, formatted as JSON schema
   * @param {*} statusCode
   * @returns
   */
  getResponseAsJsonSchema(statusCode) {
    return getResponseAsJsonSchema(this, this.oas, statusCode);
  }

  /**
   * Get an array of all valid response status codes for this operation
   * @param {*} statusCode
   * @returns
   */
  getResponseStatusCodes() {
    return this.schema.responses ? Object.keys(this.schema.responses) : [];
  }

  /**
   * Determine if the operation has a request body.
   *
   * @return {boolean}
   */
  hasRequestBody() {
    return !!this.schema.requestBody;
  }

  /**
   * Retrieve an array of request body examples that this operation has.
   *
   * @returns {array}
   */
  getRequestBodyExamples() {
    if (this.requestBodyExamples) {
      return this.requestBodyExamples;
    }

    this.requestBodyExamples = getRequestBodyExamples(this.schema);
    return this.requestBodyExamples;
  }

  /**
   * Return a specific response out of the operation by a given HTTP status code.
   *
   * @param {integer} statusCode
   * @return {(boolean|object)}
   */
  getResponseByStatusCode(statusCode) {
    if (!this.schema.responses) {
      return false;
    }

    if (typeof this.schema.responses[statusCode] === 'undefined') {
      return false;
    }

    return this.schema.responses[statusCode];
  }

  /**
   * Retrieve an array of response examples that this operation has.
   *
   * @returns {array}
   */
  getResponseExamples() {
    if (this.responseExamples) {
      return this.responseExamples;
    }

    this.responseExamples = getResponseExamples(this.schema);
    return this.responseExamples;
  }

  /**
   * Determine if the operation has callbacks.
   *
   * @return {boolean}
   */
  hasCallbacks() {
    return !!this.schema.callbacks;
  }

  /**
   * Retrieve a specific callback
   *
   * @returns {Operation}
   */
  getCallback(identifier, expression, method) {
    if (!this.schema.callbacks) return false;

    const callback = this.schema.callbacks[identifier] ? this.schema.callbacks[identifier][expression] : false;
    if (!callback || !callback[method]) return false;
    // eslint-disable-next-line no-use-before-define
    return new Callback(this.oas, expression, method, callback[method], identifier);
  }

  /**
   * Retrieve an array of operations created from each callback.
   *
   * @returns {array}
   */
  getCallbacks() {
    const callbackOperations = [];
    if (!this.hasCallbacks()) return false;

    Object.keys(this.schema.callbacks).forEach(callback => {
      Object.keys(this.schema.callbacks[callback]).forEach(expression => {
        Object.keys(this.schema.callbacks[callback][expression]).forEach(method => {
          callbackOperations.push(this.getCallback(callback, expression, method));
        });
      });
    });

    return callbackOperations;
  }

  /**
   * Retrieve an array of callback examples that this operation has.
   *
   * @returns {array}
   */
  getCallbackExamples() {
    if (this.callbackExamples) {
      return this.callbackExamples;
    }

    this.callbackExamples = getCallbackExamples(this.schema);
    return this.callbackExamples;
  }
}

export class Callback extends Operation {
  constructor(oas, path, method, operation, identifier) {
    super(oas, path, method, operation);

    this.identifier = identifier;
  }

  /**
   * Return the primary identifier for this callback.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#callback-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#callbackObject}
   *
   * @returns {string}
   */
  getIdentifier() {
    return this.identifier;
  }
}

export class Webhook extends Operation {}
