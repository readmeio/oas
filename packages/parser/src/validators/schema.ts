import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

import { ono } from '@jsdevtools/ono';
import betterAjvErrors from '@readme/better-ajv-errors';
import { openapi } from '@readme/openapi-schemas';
import Ajv from 'ajv/dist/2020';
import AjvDraft4 from 'ajv-draft-04';

import { getSpecificationName, isSwagger } from '../lib/index.js';
import { reduceAjvErrors } from '../lib/reduceAjvErrors.js';

export type SchemaValidator = (
  api: OpenAPIV2.Document | OpenAPIV3_1.Document | OpenAPIV3.Document,
  options?: { colorizeErrors?: boolean },
) => void;

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
 * @param {SwaggerObject} api
 * @param {Object} options
 */
export const validateSchema: SchemaValidator = (
  api: OpenAPIV2.Document | OpenAPIV3_1.Document | OpenAPIV3.Document,
  options: { colorizeErrors?: boolean } = {},
) => {
  let ajv;

  // Choose the appropriate schema (Swagger or OpenAPI)
  let schema;

  if (isSwagger(api)) {
    schema = openapi.v2;
    ajv = initializeAjv();
  } else if (api.openapi.startsWith('3.1')) {
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

    /* eslint-disable @typescript-eslint/ban-ts-comment */
    // @ts-expect-error Intentionally setting up this funky schema for an AJV bug.
    schema.$defs.components.properties.schemas.additionalProperties = schemaDynamicRef;
    // @ts-expect-error
    schema.$defs.header.dependentSchemas.schema.properties.schema = schemaDynamicRef;
    // @ts-expect-error
    schema.$defs['media-type'].properties.schema = schemaDynamicRef;
    // @ts-expect-error
    schema.$defs.parameter.properties.schema = schemaDynamicRef;
    /* eslint-enable @typescript-eslint/ban-ts-comment */

    ajv = initializeAjv(false);
  } else {
    schema = openapi.v3;
    ajv = initializeAjv();
  }

  // Validate against the schema
  const isValid = ajv.validate(schema, api);
  if (!isValid) {
    const err = ajv.errors;

    let additionalErrors = 0;
    let reducedErrors = reduceAjvErrors(err);
    const totalErrors = reducedErrors.length;
    if (reducedErrors.length >= LARGE_SPEC_ERROR_CAP) {
      try {
        if (JSON.stringify(api).length >= LARGE_SPEC_SIZE_CAP) {
          additionalErrors = reducedErrors.length - 20;
          reducedErrors = reducedErrors.slice(0, 20);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // If we failed to stringify the API definition to look at its size then we should process
        // all of its errors as-is.
      }
    }

    let message = `${getSpecificationName(api)} schema validation failed.\n`;
    message += '\n';
    message += betterAjvErrors(schema, api, reducedErrors, {
      colorize: options.colorizeErrors,
      indent: 2,
    });

    if (additionalErrors) {
      message += '\n\n';
      message += `Plus an additional ${additionalErrors} errors. Please resolve the above and re-run validation to see more.`;
    }

    // @ts-expect-error `ono` doens't like the types on this but good news! we're going to get rid of `ono`.
    throw ono.syntax(err, { details: err, totalErrors }, message);
  }
};
