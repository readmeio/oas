import type * as RMOAS from './rmoas.types';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import type { RequestBodyExamples } from './operation/get-requestbody-examples';
import type { CallbackExamples } from './operation/get-callback-examples';
import type { ResponseExamples } from './operation/get-response-examples';

import Oas from '.';
import { isRef } from './rmoas.types';
import findSchemaDefinition from './lib/find-schema-definition';
import getParametersAsJsonSchema from './operation/get-parameters-as-json-schema';
import getResponseAsJsonSchema from './operation/get-response-as-json-schema';
import getRequestBodyExamples from './operation/get-requestbody-examples';
import getCallbackExamples from './operation/get-callback-examples';
import getResponseExamples from './operation/get-response-examples';
import matchesMimeType from './lib/matches-mimetype';

type SecurityType = 'Basic' | 'Bearer' | 'Query' | 'Header' | 'Cookie' | 'OAuth2' | 'http' | 'apiKey';

export default class Operation {
  /**
   * Schema of the operation from the API Definiton.
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
    request: Array<string>;
    response: Array<string>;
  };

  constructor(api: Oas | RMOAS.OASDocument, path: string, method: RMOAS.HttpMethods, operation: RMOAS.OperationObject) {
    this.schema = operation;
    this.api = api instanceof Oas ? api.getDefinition() : api;
    this.path = path;
    this.method = method;

    this.contentType = undefined;
    this.requestBodyExamples = undefined;
    this.responseExamples = undefined;
    this.callbackExamples = undefined;
  }

  getContentType() {
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

  isFormUrlEncoded() {
    return matchesMimeType.formUrlEncoded(this.getContentType());
  }

  isMultipart() {
    return matchesMimeType.multipart(this.getContentType());
  }

  isJson() {
    return matchesMimeType.json(this.getContentType());
  }

  isXml() {
    return matchesMimeType.xml(this.getContentType());
  }

  /**
   * Returns an array of all security requirements associated wtih this operation. If none are defined at the operation
   * level, the securities for the entire API definition are returned (with an empty array as a final fallback).
   *
   * @returns Array of security requirement objects.
   */
  getSecurity() {
    if (!('components' in this.api) || !('securitySchemes' in this.api.components)) {
      return [];
    }

    return this.schema.security || this.api.security || [];
  }

  /**
   * @see {@link https://swagger.io/docs/specification/authentication/#multiple}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#security-requirement-object}
   * @param filterInvalid Optional flag that, when set to `true`, filters out invalid/nonexistent security schemes,
   *    rather than returning `false`.
   * @returns An array of arrays of objects of grouped security schemes. The inner array determines and-grouped
   *    security schemes, the outer array determines or-groups.
   */
  getSecurityWithTypes(filterInvalid = false) {
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
   * @returns An object where the keys are unique scheme types, and the values are arrays containing each security
   *    scheme of that type.
   */
  prepareSecurity() {
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

  getHeaders() {
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
   * @returns If the operation has an `operationId` present in its schema.
   */
  hasOperationId() {
    return 'operationId' in this.schema;
  }

  /**
   * Retrieve an operation ID for this operation. If one is not present (it's not required by the spec!) a hash of the
   * path and method will be returned instead.
   *
   * @returns The found or generated operation ID.
   */
  getOperationId() {
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
   * @returns An array of all tags, and their metadata, that exist on this operation.
   */
  getTags() {
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
   * @returns If the operation is flagged as `deprecated` or not.
   */
  isDeprecated() {
    return 'deprecated' in this.schema ? this.schema.deprecated : false;
  }

  /**
   * @todo This should also pull in common params.
   * @returns The parameters (non-request body) on the operation.
   */
  getParameters() {
    return ('parameters' in this.schema ? this.schema.parameters : []) as Array<RMOAS.ParameterObject>;
  }

  /**
   * Convert the operation into an array of JSON Schema for each available type of parameter available on the operation.
   * `globalDefaults` contains an object of user defined parameter defaults used.
   *
   * @param globalDefaults An object of global defaults to apply as a `default` in the returned JSON Schema.
   * @returns An array of JSON Schema objects.
   */
  getParametersAsJsonSchema(globalDefaults?: unknown) {
    return getParametersAsJsonSchema(this.path, this.schema, this.api, globalDefaults);
  }

  /**
   * Get a single response for this status code, formatted as JSON schema.
   *
   * @param statusCode Status code to pull a JSON Schema object for.
   * @returns A JSON Schema object for the specified response.
   */
  getResponseAsJsonSchema(statusCode: string) {
    return getResponseAsJsonSchema(this, this.api, statusCode);
  }

  /**
   * @returns An array of all valid response status codes for this operation.
   */
  getResponseStatusCodes() {
    return this.schema.responses ? Object.keys(this.schema.responses) : [];
  }

  /**
   * @returns If the operation has a request body.
   */
  hasRequestBody() {
    return !!this.schema.requestBody;
  }

  /**
   * @returns An array of request body examples that this operation has.
   */
  getRequestBodyExamples() {
    if (this.requestBodyExamples) {
      return this.requestBodyExamples;
    }

    this.requestBodyExamples = getRequestBodyExamples(this.schema);
    return this.requestBodyExamples;
  }

  /**
   * @param statusCode HTTP status code to get.
   * @returns A specific response out of the operation by a given HTTP status code.
   */
  getResponseByStatusCode(statusCode: string | number) {
    if (!this.schema.responses) {
      return false;
    }

    if (typeof this.schema.responses[statusCode] === 'undefined') {
      return false;
    }

    const response = this.schema.responses[statusCode];
    if (isRef(response)) {
      return false;
    }

    // Remove the reference from the type, because it will already be dereferenced.
    return response;
  }

  /**
   * @returns An array of response examples that this operation has.
   */
  getResponseExamples() {
    if (this.responseExamples) {
      return this.responseExamples;
    }

    // @todo Remove this `as` once we convert getResponseExamples
    this.responseExamples = getResponseExamples(this.schema) as ResponseExamples;
    return this.responseExamples;
  }

  /**
   * @returns If the operation has callbacks.
   */
  hasCallbacks() {
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
   * @returns The found callback.
   */
  getCallback(identifier: string, expression: string, method: RMOAS.HttpMethods) {
    if (!this.schema.callbacks) return false;

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
   * @returns An array of operations created from each callback.
   */
  getCallbacks() {
    const callbackOperations: Array<false | Callback> = [];
    if (!this.hasCallbacks()) return false;

    Object.keys(this.schema.callbacks).forEach(callback => {
      Object.keys(this.schema.callbacks[callback]).forEach(expression => {
        const cb = this.schema.callbacks[callback];
        if (!isRef(cb)) {
          const exp = cb[expression];

          if (!isRef(exp)) {
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
   * @returns An array of callback examples that this operation has.
   */
  getCallbackExamples() {
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
   * @returns The extension exists.
   */
  hasExtension(extension: string) {
    return extension in this.schema;
  }

  /**
   * Retrieve a custom specification extension off of the operation.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#specificationExtensions}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specificationExtensions}
   * @param extension Specification extension to lookup.
   * @returns The extension contents if it was found.
   */
  getExtension(extension: string) {
    return this.schema?.[extension];
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
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#callback-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#callbackObject}
   * @returns The primary identifier for this callback.
   */
  getIdentifier() {
    return this.identifier;
  }
}

export class Webhook extends Operation {}

module.exports = Operation;
module.exports.Callback = Callback;
module.exports.Webhook = Webhook;
