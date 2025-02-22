import type { ParserRulesOpenAPI } from '../types.js';
import type { SpecificationValidator } from './spec/index.js';
import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

import { ValidationError } from '../errors.js';
import { isOpenAPI } from '../lib/index.js';

import { OpenAPISpecificationValidator } from './spec/openapi.js';
import { SwaggerSpecificationValidator } from './spec/swagger.js';

/**
 * Validates either a Swagger 2.0 or OpenAPI 3.x API definition against cases that aren't covered
 * by their JSON Schema definitions.
 *
 */
export function validateSpec(
  api: OpenAPIV2.Document | OpenAPIV3_1.Document | OpenAPIV3.Document,
  rules: {
    openapi: ParserRulesOpenAPI;
  },
): void {
  let validator: SpecificationValidator;

  if (isOpenAPI(api)) {
    validator = new OpenAPISpecificationValidator(api, rules.openapi);
  } else {
    validator = new SwaggerSpecificationValidator(api);
  }

  validator.run();

  if (validator.errors.length) {
    throw new ValidationError(`Validation failed. ${validator.errors[0].message}`);
  }
}
