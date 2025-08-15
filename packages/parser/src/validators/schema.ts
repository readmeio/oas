import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import type { ParserOptions, ValidationResult } from '../types.js';

import betterAjvErrors from '@readme/better-ajv-errors';
import { openapi } from '@readme/openapi-schemas';
import Ajv from 'ajv/dist/2020.js';
import AjvDraft4 from 'ajv-draft-04';

import { getSpecificationName, isOpenAPI31, isSwagger } from '../lib/index.js';
import { reduceAjvErrors } from '../lib/reduceAjvErrors.js';

/**
 * We've had issues with specs larger than 2MB+ with 1,000+ errors causing memory leaks so if we
 * have a spec with more than `LARGE_SPEC_ERROR_CAP` errors and it's **stringified** length is
 * larger than `LARGE_SPEC_LIMITS` then we will only return the first `LARGE_SPEC_ERROR_CAP` errors.
 *
 * Ideally we'd be looking at the byte size of the spec instead of looking at its stringified
 * length value but the Blob API, which we'd use to get its size with `new Blob([str]).size;`, was
 * only recently introduced in Node 15.
 *
 * w/r/t the 5,000,000 limit here: The spec we found causing these memory leaks had a size of
 * 13,934,323 so 5mil seems like a decent cap to start with.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Blob}
 */
const LARGE_SPEC_ERROR_CAP = 20;
const LARGE_SPEC_SIZE_CAP = 5000000;

/**
 * Determines which version of Ajv to load and prepares it for use.
 *
 */
function initializeAjv(draft04: boolean = true) {
  const opts = {
    allErrors: true,
    strict: false,
    validateFormats: false,
  };

  if (draft04) {
    return new AjvDraft4(opts);
  }

  return new Ajv(opts);
}

/**
 * Validates the given Swagger API against the Swagger 2.0 or OpenAPI 3.0 and 3.1 schemas.
 *
 */
export function validateSchema(
  api: OpenAPIV2.Document | OpenAPIV3_1.Document | OpenAPIV3.Document,
  options: ParserOptions = {},
): ValidationResult {
  let ajv: AjvDraft4 | Ajv;

  // Choose the appropriate schema (Swagger or OpenAPI)
  let schema: typeof openapi.v2 | typeof openapi.v3 | typeof openapi.v31legacy;
  const specificationName = getSpecificationName(api);

  if (isSwagger(api)) {
    schema = openapi.v2;
    ajv = initializeAjv();
  } else if (isOpenAPI31(api)) {
    schema = openapi.v31legacy;

    /**
     * There's a bug with Ajv in how it handles `$dynamicRef` in the way that it's used within the
     * 3.1 schema so we need to do some adhoc workarounds.
     *
     * @see {@link https://github.com/OAI/OpenAPI-Specification/issues/2689}
     * @see {@link https://github.com/ajv-validator/ajv/issues/1573}
     */
    const schemaDynamicRef = schema.$defs.schema;
    if ('$dynamicAnchor' in schemaDynamicRef) {
      delete schemaDynamicRef.$dynamicAnchor;
    }

    // @ts-expect-error Intentionally setting up this funky schema for an AJV bug.
    schema.$defs.components.properties.schemas.additionalProperties = schemaDynamicRef;
    // @ts-expect-error
    schema.$defs.header.dependentSchemas.schema.properties.schema = schemaDynamicRef;
    // @ts-expect-error
    schema.$defs['media-type'].properties.schema = schemaDynamicRef;
    // @ts-expect-error
    schema.$defs.parameter.properties.schema = schemaDynamicRef;

    ajv = initializeAjv(false);
  } else {
    schema = openapi.v3;
    ajv = initializeAjv();
  }

  // Validate against the schema
  const isValid = ajv.validate(schema, api);
  if (isValid) {
    // We don't support warnings in our schema validation, only the **spec** validator.
    return { valid: true, warnings: [], specification: specificationName };
  }

  let additionalErrors = 0;
  let reducedErrors = reduceAjvErrors(ajv.errors);
  if (reducedErrors.length >= LARGE_SPEC_ERROR_CAP) {
    try {
      if (JSON.stringify(api).length >= LARGE_SPEC_SIZE_CAP) {
        additionalErrors = reducedErrors.length - 20;
        reducedErrors = reducedErrors.slice(0, 20);
      }
    } catch {
      // If we failed to stringify the API definition to look at its size then we should process
      // all of its errors as-is.
    }
  }

  try {
    // @ts-expect-error typing on the `ErrorObject` that we use here doesn't match what `better-ajv-errors` uses
    const errors = betterAjvErrors(schema, api, reducedErrors, {
      format: 'cli-array',
      colorize: options?.validate?.errors?.colorize || false,
      indent: 2,
    });

    return {
      valid: false,
      errors,
      warnings: [],
      additionalErrors,
      specification: specificationName,
    };
  } catch (err) {
    // If `better-ajv-errors` fails for whatever reason we should capture and return it. We'll
    // obviously not show the user all of their validation errors but it's better than nothing.
    return {
      valid: false,
      errors: [{ message: err.message }],
      warnings: [],
      additionalErrors,
      specification: specificationName,
    };
  }
}
