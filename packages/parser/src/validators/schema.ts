import type { ErrorDetails, ParserOptions, ValidationResult } from '../types.js';
import type { ErrorObject } from 'ajv';
import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

import betterAjvErrors from '@readme/better-ajv-errors';
import { openapi } from '@readme/openapi-schemas';
import AjvDraft4 from 'ajv-draft-04';
import Ajv from 'ajv/dist/2020.js';

import { isOpenAPI31, isOpenAPI32, isSwagger } from '../lib/assertions.js';
import { hasInvalidPaths } from '../lib/hasInvalidPaths.js';
import { getSpecificationName } from '../lib/index.js';
import { reduceAjvErrors } from '../lib/reduceAjvErrors.js';

/**
 * Schema errors are formatted with `better-ajv-errors`, which renders a code frame for every error.
 * To do that it pretty-prints the **whole** (dereferenced) API definition and parses that string
 * into a full JSON AST, which needs many times the size of the definition in memory. For large
 * definitions this exhausts the heap and crashes the process; once the pretty-printed string
 * exceeds the maximum string length of the JavaScript engine it instead fails with an
 * `Invalid string length` error that hides every real validation error.
 *
 * So if a spec's **stringified** length reaches `LARGE_SPEC_SIZE_CAP` we skip code frames and
 * report plain messages instead, and if it also has more than `LARGE_SPEC_ERROR_CAP` errors we
 * only return the first `LARGE_SPEC_ERROR_CAP` errors.
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
  suppressedInstancePaths: string[] = [],
): ValidationResult {
  // Pre-validation check for missing leading slashes in paths
  if (hasInvalidPaths(api)) {
    return {
      valid: false,
      errors: [
        {
          message:
            getSpecificationName(api) === 'Swagger'
              ? 'Entries in the Swagger `paths` object must begin with a leading slash.'
              : 'Entries in the OpenAPI `paths` object must begin with a leading slash.',
        },
      ],
      warnings: [],
      additionalErrors: 0,
      specification: getSpecificationName(api),
    };
  }

  let ajv: AjvDraft4 | Ajv;

  // Choose the appropriate schema (Swagger or OpenAPI)
  let schema: typeof openapi.v2 | typeof openapi.v3 | typeof openapi.v31legacy;
  const specificationName = getSpecificationName(api);

  if (isSwagger(api)) {
    schema = openapi.v2;
    ajv = initializeAjv();
  } else if (isOpenAPI32(api)) {
    throw new TypeError('OpenAPI 3.2 is currently unsupported.');
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
    if (typeof schemaDynamicRef === 'object' && '$dynamicAnchor' in schemaDynamicRef) {
      delete schemaDynamicRef.$dynamicAnchor;
    }

    // @ts-expect-error Intentionally setting up this funky schema for an AJV bug.
    schema.$defs.components.properties.schemas.additionalProperties = schemaDynamicRef;
    // @ts-expect-error -- see above
    schema.$defs.header.dependentSchemas.schema.properties.schema = schemaDynamicRef;
    // @ts-expect-error -- see above
    schema.$defs['media-type'].properties.schema = schemaDynamicRef;
    // @ts-expect-error -- see above
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
  let reducedErrors = reduceAjvErrors(ajv.errors).filter(err => {
    return !suppressedInstancePaths.some(path => err.instancePath === path || err.instancePath.startsWith(`${path}/`));
  });

  // If filtering removed every error, the spec is effectively valid from AJV's perspective.
  if (!reducedErrors.length) {
    return { valid: true, warnings: [], specification: specificationName };
  }
  const isLargeSpec = isLargeAPIDefinition(api);
  if (isLargeSpec && reducedErrors.length >= LARGE_SPEC_ERROR_CAP) {
    additionalErrors = reducedErrors.length - LARGE_SPEC_ERROR_CAP;
    reducedErrors = reducedErrors.slice(0, LARGE_SPEC_ERROR_CAP);
  }

  if (isLargeSpec || options?.validate?.errors?.codeFrames === false) {
    return {
      valid: false,
      errors: reducedErrors.map(toPlainError),
      warnings: [],
      additionalErrors,
      specification: specificationName,
    };
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

/**
 * Determines if an API definition is too large for `better-ajv-errors` code frames. A definition
 * that cannot even be stringified (because it exceeds the maximum string length) is large too.
 */
function isLargeAPIDefinition(api: object): boolean {
  try {
    return JSON.stringify(api).length >= LARGE_SPEC_SIZE_CAP;
  } catch {
    return true;
  }
}

/**
 * Formats an Ajv error without a code frame: its JSON pointer, message, and the offending property
 * for errors where Ajv's message doesn't name it (eg. `must NOT have additional properties`).
 */
function toPlainError(err: ErrorObject): ErrorDetails {
  const property = err.params?.additionalProperty ?? err.params?.unevaluatedProperty;
  const suffix = property ? ` (${property})` : '';

  return { message: `${err.instancePath || '/'} ${err.message}${suffix}` };
}
