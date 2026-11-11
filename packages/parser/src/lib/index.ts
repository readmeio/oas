import type { APIDocument } from '../types.js';

import { isSwagger } from './assertions.js';

/**
 * Regular expression that matches path parameter templating.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#path-templating}
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#path-templating}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#path-templating}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#path-templating}
 */
export const pathParameterTemplateRegExp: RegExp = /\{([^/}]+)}/g;

/**
 * List of HTTP verbs used for OperationItem as per the OpenAPI specifications. OpenAPI 3.2 added
 * `query` for the HTTP QUERY method.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#path-item-object}
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html#path-item-object}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html#path-item-object}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#path-item-object}
 */
export const supportedHTTPMethods = [
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'options',
  'head',
  'trace',
  'query',
] as const;

/**
 * List of HTTP verbs used for OperationItem as per Swagger specification.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#path-item-object}
 */
export const swaggerHTTPMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'] as const;

/**
 * Determine the proper name for the API specification schema used by a given schema.
 *
 */
export function getSpecificationName(api: APIDocument): 'OpenAPI' | 'Swagger' {
  return isSwagger(api) ? 'Swagger' : 'OpenAPI';
}
