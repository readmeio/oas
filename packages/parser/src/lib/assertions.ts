import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

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
export function isOpenAPI31(schema: any): schema is OpenAPIV3_1.Document {
  return 'openapi' in schema && schema.openapi !== undefined && schema.openapi.startsWith('3.1');
}

/**
 * Is a given object an OpenAPI 3.2 API definition?
 *
 */
export function isOpenAPI32(schema: any): boolean {
  return 'openapi' in schema && schema.openapi !== undefined && schema.openapi.startsWith('3.2');
}
