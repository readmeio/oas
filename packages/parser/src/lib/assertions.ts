import type {
  OpenAPI30Document,
  OpenAPI31Document,
  OpenAPI32Document,
  OpenAPIDocument,
  SwaggerDocument,
} from '../types.js';

/**
 * Is a given object a Swagger API definition?
 *
 */
export function isSwagger(schema: any): schema is SwaggerDocument {
  return 'swagger' in schema && schema.swagger !== undefined;
}

/**
 * Is a given object an OpenAPI API definition?
 *
 */
export function isOpenAPI(schema: any): schema is OpenAPIDocument {
  return 'openapi' in schema && schema.openapi !== undefined;
}

/**
 * Is a given object an OpenAPI 3.0 API definition?
 *
 */
export function isOpenAPI30(schema: any): schema is OpenAPI30Document {
  return 'openapi' in schema && schema.openapi !== undefined && schema.openapi.startsWith('3.0');
}

/**
 * Is a given object an OpenAPI 3.1 API definition?
 *
 */
export function isOpenAPI31(schema: any): schema is OpenAPI31Document {
  return 'openapi' in schema && schema.openapi !== undefined && schema.openapi.startsWith('3.1');
}

/**
 * Is a given object an OpenAPI 3.2 API definition?
 *
 */
export function isOpenAPI32(schema: any): schema is OpenAPI32Document {
  return 'openapi' in schema && schema.openapi !== undefined && schema.openapi.startsWith('3.2');
}
