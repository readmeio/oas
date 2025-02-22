import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

import { ValidationError } from '../../errors.js';
import { supportedHTTPMethods, pathParameterTemplateRegExp, isOpenAPI31, isOpenAPI30 } from '../../lib/index.js';

type ParameterObject =
  | (OpenAPIV3_1.ParameterObject | OpenAPIV3_1.ReferenceObject)
  | (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject);

/**
 * Checks the given parameter list for duplicates.
 *
 */
function checkForDuplicates(params: ParameterObject[], schemaId: string) {
  for (let i = 0; i < params.length - 1; i++) {
    const outer = params[i];
    for (let j = i + 1; j < params.length; j++) {
      const inner = params[j];
      if ('$ref' in outer || '$ref' in inner) {
        continue;
      }

      if (outer.name === inner.name && outer.in === inner.in) {
        throw new ValidationError(
          `Validation failed. Found multiple \`${outer.in}\` parameters named \`${outer.name}\` in \`${schemaId}\`.`,
        );
      }
    }
  }
}

/**
 * Validates the given Swagger schema object.
 *
 */
function validateSchema(schema: OpenAPIV3_1.SchemaObject | OpenAPIV3.SchemaObject, schemaId: string) {
  if (schema.type === 'array' && !schema.items) {
    throw new ValidationError(
      `Validation failed. \`${schemaId}\` is an array, so it must include an \`items\` schema.`,
    );
  }
}

/**
 * Validates path parameters for the given path.
 *
 */
function validatePathParameters(params: ParameterObject[], pathId: string, operationId: string) {
  // Find all `{placeholders}` in the path string. And because paths can have path parameters duped
  // we need to convert this to a unique array so we can eliminate false positives of placeholders
  // that might be duplicated.
  const placeholders = [...new Set(pathId.match(pathParameterTemplateRegExp) || [])];

  params
    .filter(param => 'in' in param)
    .filter(param => param.in === 'path')
    .forEach(param => {
      if (param.required !== true) {
        throw new ValidationError(
          `Validation failed. Path parameters cannot be optional. Set \`required=true\` for the \`${param.name}\` parameter at \`${operationId}\`.`,
        );
      }

      const match = placeholders.indexOf(`{${param.name}}`);
      if (match === -1) {
        throw new ValidationError(
          `Validation failed. \`${operationId}\` has a path parameter named \`${param.name}\`, but there is no corresponding \`{${param.name}}\` in the path string.`,
        );
      }

      placeholders.splice(match, 1);
    });

  if (placeholders.length > 0) {
    const list = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(
      placeholders.map(placeholder => `\`${placeholder}\``),
    );

    throw new ValidationError(`Validation failed. \`${operationId}\` is missing path parameter(s) for ${list}.`);
  }
}

/**
 * Validates data types of parameters for the given operation.
 *
 */
function validateParameterTypes(params: ParameterObject[], operationId: string) {
  params.forEach(param => {
    if ('$ref' in param) {
      return;
    }

    /**
     * @todo add better handling when `content` is present instead of `schema`.
     * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#fixed-fields-10}
     * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#fixed-fields-10}
     */
    if (!param.schema && param.content) {
      return;
    } else if ('$ref' in param.schema) {
      return;
    }

    const parameterId = `${operationId}/parameters/${param.name}`;

    validateSchema(param.schema, parameterId);
  });
}

/**
 * Validates the parameters for the given operation.
 *
 */
function validateParameters(
  path: OpenAPIV3_1.PathItemObject | OpenAPIV3.PathItemObject,
  pathId: string,
  operation: OpenAPIV3_1.OperationObject | OpenAPIV3.OperationObject,
  operationId: string,
) {
  const pathParams = path.parameters || [];
  const operationParams = operation.parameters || [];

  // Check for duplicate path parameters.
  checkForDuplicates(pathParams, pathId);

  // Check for duplicate operation parameters.
  checkForDuplicates(operationParams, operationId);

  // Combine the path and operation parameters, with the operation params taking precedence over
  // the path params.
  const params = pathParams.reduce((combinedParams, value) => {
    const duplicate = combinedParams.some(param => {
      if ('$ref' in param || '$ref' in value) {
        return false;
      }

      return param.in === value.in && param.name === value.name;
    });

    if (!duplicate) {
      combinedParams.push(value);
    }

    return combinedParams;
  }, operationParams.slice());

  validatePathParameters(params, pathId, operationId);
  validateParameterTypes(params, operationId);
}

/**
 * Validates the given response object.
 *
 */
function validateResponse(response: OpenAPIV3_1.ResponseObject | OpenAPIV3.ResponseObject, responseId: string) {
  Object.keys(response.headers || {}).forEach(headerName => {
    const header = response.headers[headerName];
    const headerId = `${responseId}/headers/${headerName}`;
    if ('$ref' in header) {
      return;
    }

    if (header.schema) {
      if (!('$ref' in header.schema)) {
        validateSchema(header.schema, headerId);
      }
    } else if (header.content) {
      Object.keys(header.content).forEach(mediaType => {
        if (header.content[mediaType].schema) {
          if (!('$ref' in header.content[mediaType].schema)) {
            validateSchema(header.content[mediaType].schema || {}, `${headerId}/content/${mediaType}/schema`);
          }
        }
      });
    }
  });

  if (response.content) {
    Object.keys(response.content).forEach(mediaType => {
      if (response.content[mediaType].schema) {
        if (!('$ref' in response.content[mediaType].schema)) {
          validateSchema(response.content[mediaType].schema || {}, `${responseId}/content/${mediaType}/schema`);
        }
      }
    });
  }
}

/**
 * Validates the given path.
 *
 */
function validatePath(
  path: OpenAPIV3_1.PathItemObject | OpenAPIV3.PathItemObject,
  pathId: string,
  operationIds: string[],
) {
  supportedHTTPMethods.forEach(operationName => {
    const operation = path[operationName];
    const operationId = `${pathId}/${operationName}`;

    if (operation) {
      const declaredOperationId = operation.operationId;
      if (declaredOperationId) {
        if (!operationIds.includes(declaredOperationId)) {
          operationIds.push(declaredOperationId);
        } else {
          throw new ValidationError(
            `Validation failed. The operationId \`${declaredOperationId}\` is duplicated and must be made unique.`,
          );
        }
      }

      validateParameters(path, pathId, operation, operationId);

      Object.keys(operation.responses || {}).forEach(responseCode => {
        const response = operation.responses[responseCode];
        const responseId = `${operationId}/responses/${responseCode}`;
        if (response && !('$ref' in response)) {
          validateResponse(response, responseId);
        }
      });
    }
  });
}

/**
 * Validates parts of the OpenAPI 3.0 and 3.1 that aren't covered by their JSON Schema definitions.
 *
 * @todo This library currently does not validate required properties like the Swagger validator
 * does due to some gnarly quirks with cases where a required property exists within a `oneOf` or
 * `anyOf` (and within a child `allOf` of one of those). See
 * https://api.apis.guru/v2/specs/twitter.com/labs/2.13/openapi.yaml for a good example.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md}
 */
export function validateSpec(api: OpenAPIV3_1.Document | OpenAPIV3.Document): void {
  const operationIds: string[] = [];
  Object.keys(api.paths || {}).forEach(pathName => {
    const path = api.paths[pathName];
    const pathId = `/paths${pathName}`;

    if (path && pathName.startsWith('/')) {
      validatePath(path, pathId, operationIds);
    }
  });

  /**
   * There's a problem with how the 3.0 schema uses `patternProperties` for defining the format of
   * scheme names that it ignores anything that doesn't match, so if you for example have a space
   * in a schema name it'll be seen as valid when it should instead trigger a validation error.
   *
   * @see {@link https://github.com/APIDevTools/swagger-parser/issues/184}
   */
  if (isOpenAPI30(api)) {
    if (api.components) {
      Object.keys(api.components).forEach((componentType: keyof typeof api.components) => {
        Object.keys(api.components[componentType]).forEach(componentName => {
          const componentId = `/components/${componentType}/${componentName}`;

          if (!/^[a-zA-Z0-9.\-_]+$/.test(componentName)) {
            throw new ValidationError(
              `Validation failed. \`${componentId}\` has an invalid name. Component names should match against: /^[a-zA-Z0-9.-_]+$/`,
            );
          }
        });
      });
    }
  }

  /**
   * OpenAPI 3.1 brought the addition of `webhooks` and made `paths` optional however the
   * specification requires that one or the other be present, and not be empty. Unfortunately the
   * JSON Schema for the specification is unable to specify this.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#openapi-document}
   */
  if (isOpenAPI31(api)) {
    if (!Object.keys(api.paths || {}).length && !Object.keys(api.webhooks || {}).length) {
      throw new ValidationError(
        'Validation failed. OpenAPI 3.1 definitions must contain at least one entry in either `paths` or `webhook`.',
      );
    }
  }
}
