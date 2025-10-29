import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import type { ParserRulesOpenAPI, ParserRulesSwagger, ValidationResult } from '../types.js';
import type { SpecificationValidator } from './spec/index.js';

import { isOpenAPI } from '../lib/assertions.js';
import { getSpecificationName } from '../lib/index.js';
import { OpenAPISpecificationValidator } from './spec/openapi.js';
import { SwaggerSpecificationValidator } from './spec/swagger.js';

/**
 * Validates either a Swagger 2.0 or OpenAPI 3.x API definition against cases that aren't covered
 * by their respective JSON Schema definitions.
 *
 * Some specification-level cases can be treated as warnings, instead of hard validation erros, by
 * supplying a `rules` configuration to the parsers `validate` option.
 *
 */
export function validateSpec(
  api: OpenAPIV2.Document | OpenAPIV3_1.Document | OpenAPIV3.Document,
  rules: {
    openapi: ParserRulesOpenAPI;
    swagger: ParserRulesSwagger;
  },
): ValidationResult {
  let validator: SpecificationValidator;

  const specificationName = getSpecificationName(api);
  if (isOpenAPI(api)) {
    validator = new OpenAPISpecificationValidator(api, rules.openapi);
  } else {
    validator = new SwaggerSpecificationValidator(api, rules.swagger);
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
