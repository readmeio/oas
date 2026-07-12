import type { ParserRulesOpenAPI, ParserRulesSwagger, ValidationResult } from '../types.js';
import type { SpecificationValidator } from './spec/index.js';
import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1, OpenAPIV3_2 } from '@scalar/openapi-types';

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
  api: OpenAPIV2.Document | OpenAPIV3_2.Document | OpenAPIV3_1.Document | OpenAPIV3.Document,
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

/**
 * Runs spec-level validation that should happen **before** AJV's JSON Schema validation, so that
 * the user gets clear, actionable errors instead of confusing schema-level noise.
 *
 * @returns The pre-schema validation outcome.
 * @returns return.result - The `ValidationResult` of the pre-schema checks; `valid: false` when
 *   any check reported an error, otherwise `valid: true` (warnings are carried either way).
 * @returns return.flaggedInstancePaths - Instance paths (e.g. `/components/securitySchemes/MyAuth`)
 *   for which the pre-schema validator already emitted an error or warning. Pass these into
 *   `validateSchema` so AJV's redundant `oneOf` errors against the same paths get suppressed.
 */
export function validateSpecPreSchema(
  api: OpenAPIV2.Document | OpenAPIV3_2.Document | OpenAPIV3_1.Document | OpenAPIV3.Document,
  rules: {
    openapi: ParserRulesOpenAPI;
    swagger: ParserRulesSwagger;
  },
): { flaggedInstancePaths: string[]; result: ValidationResult } {
  let validator: SpecificationValidator;

  const specificationName = getSpecificationName(api);
  if (isOpenAPI(api)) {
    validator = new OpenAPISpecificationValidator(api, rules.openapi);
  } else {
    validator = new SwaggerSpecificationValidator(api, rules.swagger);
  }

  validator.runPreSchemaChecks();

  const flaggedInstancePaths = validator.flaggedInstancePaths;

  if (!validator.errors.length) {
    return {
      flaggedInstancePaths,
      result: {
        valid: true,
        warnings: validator.warnings,
        specification: specificationName,
      },
    };
  }

  return {
    flaggedInstancePaths,
    result: {
      valid: false,
      errors: validator.errors,
      warnings: validator.warnings,
      additionalErrors: 0,
      specification: specificationName,
    },
  };
}
