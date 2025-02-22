import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

import { isOpenAPI } from '../lib/index.js';

import { validateSpec as validateOpenAPI } from './spec/openapi.js';
import { validateSpec as validateSwagger } from './spec/swagger.js';

/**
 * Validates either a Swagger 2.0 or OpenAPI 3.x API definition against cases that aren't covered
 * by their JSON Schema definitions.
 *
 */
export function validateSpec(api: OpenAPIV2.Document | OpenAPIV3_1.Document | OpenAPIV3.Document): void {
  if (isOpenAPI(api)) {
    return validateOpenAPI(api);
  }

  return validateSwagger(api);
}
