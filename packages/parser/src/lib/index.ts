import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

/**
 * Regular expression that matches path parameter templating.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#path-templating}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#path-templating}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#path-templating}
 */
export const pathParameterTemplateRegExp: RegExp = /\{([^/}]+)}/g;

/**
 * List of HTTP verbs used for OperationItem as per the OpenAPI and Swagger specifications
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#path-item-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#path-item-object}
 */
export const supportedHTTPMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'] as const;
export const swaggerHTTPMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'] as const;

/**
 * Is a given object a Swagger API definition?
 *
 */
export function isSwagger(schema: any): schema is OpenAPIV2.Document {
  return 'swagger' in schema && schema.swagger !== undefined;
}

/**
 * Is a given object an OpenAPI API definition?
 *
 */
export function isOpenAPI(schema: any): schema is OpenAPIV3_1.Document | OpenAPIV3.Document {
  return 'openapi' in schema && schema.openapi !== undefined;
}

/**
 * Is a given object an OpenAPI 3.0 API definition?
 *
 */
export function isOpenAPI30(schema: any): schema is OpenAPIV3.Document {
  return 'openapi' in schema && schema.openapi !== undefined && schema.openapi.startsWith('3.0');
}

/**
 * Is a given object an OpenAPI 3.1 API definition?
 *
 */
export function isOpenAPI31(schema: any): schema is OpenAPIV3_1.Document | OpenAPIV3_1.Document {
  return 'openapi' in schema && schema.openapi !== undefined && schema.openapi.startsWith('3.1');
}

/**
 * Determine the proper name for the API specification schema used by a given schema.
 *
 */
export function getSpecificationName(
  api: OpenAPIV2.Document | OpenAPIV3_1.Document | OpenAPIV3.Document,
): 'OpenAPI' | 'Swagger' {
  return isSwagger(api) ? 'Swagger' : 'OpenAPI';
}
