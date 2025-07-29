import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import type { ParserRulesOpenAPI, ValidationResult } from '../types.js';
import type { SpecificationValidator } from './spec/index.js';

import { getSpecificationName, isOpenAPI } from '../lib/index.js';
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
): ValidationResult {
  let validator: SpecificationValidator;

  const specificationName = getSpecificationName(api);
  if (isOpenAPI(api)) {
    validator = new OpenAPISpecificationValidator(api, rules.openapi);
  } else {
    validator = new SwaggerSpecificationValidator(api);
  }

  validator.run();

  if (!validator.errors.length) {
    return {
      valid: true,
      warnings: validator.warnings,
      specification: specificationName,
    };
  }

  return {
    valid: false,
    errors: validator.errors,
    warnings: validator.warnings,
    additionalErrors: 0,
    specification: specificationName,
  };
}
