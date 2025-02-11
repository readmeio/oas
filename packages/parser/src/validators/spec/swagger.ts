import type { IJsonSchema, OpenAPIV2 } from 'openapi-types';

import { ono } from '@jsdevtools/ono';

import { swaggerHTTPMethods, pathParameterTemplateRegExp } from '../../util.js';

/**
 * Validates parts of the Swagger 2.0 specification that aren't covered by its JSON Schema
 * definition.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md}
 */
export function validateSpec(api: OpenAPIV2.Document) {
  const operationIds: string[] = [];
  Object.keys(api.paths || {}).forEach(pathName => {
    const path = api.paths[pathName];
    const pathId = `/paths${pathName}`;

    if (path && pathName.startsWith('/')) {
      validatePath(api, path, pathId, operationIds);
    }
  });

  Object.keys(api.definitions || {}).forEach(definitionName => {
    const definition = api.definitions[definitionName];
    const definitionId = `/definitions/${definitionName}`;

    if (!/^[a-zA-Z0-9.\-_]+$/.test(definitionName)) {
      throw ono.syntax(
        `Validation failed. ${definitionId} has an invalid name. Definition names should match against: /^[a-zA-Z0-9.-_]+$/`,
      );
    }

    validateRequiredPropertiesExist(definition, definitionId);
  });
}

/**
 * Validates the given path.
 *
 */
function validatePath(api: OpenAPIV2.Document, path: OpenAPIV2.PathItemObject, pathId: string, operationIds: string[]) {
  swaggerHTTPMethods.forEach(operationName => {
    const operation = path[operationName];
    const operationId = `${pathId}/${operationName}`;

    if (operation) {
      const declaredOperationId = operation.operationId;
      if (declaredOperationId) {
        if (!operationIds.includes(declaredOperationId)) {
          operationIds.push(declaredOperationId);
        } else {
          throw ono.syntax(`Validation failed. Duplicate operation id '${declaredOperationId}'`);
        }
      }
      validateParameters(api, path, pathId, operation, operationId);

      Object.keys(operation.responses || {}).forEach(responseName => {
        const response = operation.responses[responseName];
        if ('$ref' in response || !response) {
          return;
        }

        const responseId = `${operationId}/responses/${responseName}`;
        validateResponse(responseName, response, responseId);
      });
    }
  });
}

/**
 * Validates the parameters for the given operation.
 *
 */
function validateParameters(
  api: OpenAPIV2.Document,
  path: OpenAPIV2.PathItemObject,
  pathId: string,
  operation: OpenAPIV2.OperationObject,
  operationId: string,
) {
  const pathParams = (path.parameters || []).filter(param => !('$ref' in param)) as OpenAPIV2.ParameterObject[];
  const operationParams = (operation.parameters || []).filter(
    param => !('$ref' in param),
  ) as OpenAPIV2.ParameterObject[];

  // Check for duplicate path parameters
  try {
    checkForDuplicates(pathParams);
  } catch (e) {
    throw ono.syntax(e, `Validation failed. ${pathId} has duplicate parameters`);
  }

  // Check for duplicate operation parameters
  try {
    checkForDuplicates(operationParams);
  } catch (e) {
    throw ono.syntax(e, `Validation failed. ${operationId} has duplicate parameters`);
  }

  // Combine the path and operation parameters,
  // with the operation params taking precedence over the path params
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

  validateBodyParameters(params, operationId);
  validatePathParameters(params, pathId, operationId);
  validateParameterTypes(params, api, operation, operationId);
}

/**
 * Validates body and formData parameters for the given operation.
 *
 */
function validateBodyParameters(params: OpenAPIV2.ParameterObject[], operationId: string) {
  const bodyParams = params.filter(param => {
    return param.in === 'body';
  });
  const formParams = params.filter(param => {
    return param.in === 'formData';
  });

  // There can only be one "body" parameter
  if (bodyParams.length > 1) {
    throw ono.syntax(
      `Validation failed. ${operationId} has ${bodyParams.length} body parameters. Only one is allowed.`,
    );
  } else if (bodyParams.length > 0 && formParams.length > 0) {
    // "body" params and "formData" params are mutually exclusive
    throw ono.syntax(
      `Validation failed. ${operationId} has body parameters and formData parameters. Only one or the other is allowed.`,
    );
  }
}

/**
 * Validates path parameters for the given path.
 *
 */
function validatePathParameters(params: OpenAPIV2.ParameterObject[], pathId: string, operationId: string) {
  // Find all {placeholders} in the path string
  const placeholders: string[] = pathId.match(pathParameterTemplateRegExp) || [];

  // Check for duplicates
  for (let i = 0; i < placeholders.length; i++) {
    for (let j = i + 1; j < placeholders.length; j++) {
      if (placeholders[i] === placeholders[j]) {
        throw ono.syntax(`Validation failed. ${operationId} has multiple path placeholders named ${placeholders[i]}`);
      }
    }
  }

  params
    .filter(param => param.in === 'path')
    .forEach(param => {
      if (param.required !== true) {
        throw ono.syntax(
          'Validation failed. Path parameters cannot be optional. ' +
            `Set required=true for the "${param.name}" parameter at ${operationId}`,
        );
      }

      const match = placeholders.indexOf(`{${param.name}}`);
      if (match === -1) {
        throw ono.syntax(
          `Validation failed. ${operationId} has a path parameter named "${param.name}", ` +
            `but there is no corresponding {${param.name}} in the path string`,
        );
      }

      placeholders.splice(match, 1);
    });

  if (placeholders.length > 0) {
    throw ono.syntax(`Validation failed. ${operationId} is missing path parameter(s) for ${placeholders}`);
  }
}

/**
 * Validates data types of parameters for the given operation.
 *
 */
function validateParameterTypes(
  params: OpenAPIV2.ParameterObject[],
  api: OpenAPIV2.Document,
  operation: OpenAPIV2.OperationObject,
  operationId: string,
) {
  params.forEach(param => {
    const parameterId = `${operationId}/parameters/${param.name}`;
    let schema;

    switch (param.in) {
      case 'body':
        schema = param.schema;
        break;
      case 'formData':
        schema = param;
        break;
      default:
        schema = param;
    }

    validateSchema(schema, parameterId);
    validateRequiredPropertiesExist(schema, parameterId);

    if (schema.type === 'file') {
      // "file" params must consume at least one of these MIME types
      const formData = /multipart\/(.*\+)?form-data/;
      const urlEncoded = /application\/(.*\+)?x-www-form-urlencoded/;

      const consumes = operation.consumes || api.consumes || [];

      const hasValidMimeType = consumes.some(consume => {
        return formData.test(consume) || urlEncoded.test(consume);
      });

      if (!hasValidMimeType) {
        throw ono.syntax(
          `Validation failed. ${operationId} has a file parameter, so it must consume multipart/form-data ` +
            'or application/x-www-form-urlencoded',
        );
      }
    }
  });
}

/**
 * Checks the given parameter list for duplicates.
 *
 */
function checkForDuplicates(params: OpenAPIV2.ParameterObject[]) {
  for (let i = 0; i < params.length - 1; i++) {
    const outer = params[i];
    for (let j = i + 1; j < params.length; j++) {
      const inner = params[j];
      if (outer.name === inner.name && outer.in === inner.in) {
        throw ono.syntax(`Validation failed. Found multiple ${outer.in} parameters named "${outer.name}"`);
      }
    }
  }
}

/**
 * Validates the given response object.
 *
 */
function validateResponse(code: number | string, response: OpenAPIV2.ResponseObject, responseId: string) {
  if (code !== 'default') {
    if (
      (typeof code === 'number' && (code < 100 || code > 599)) ||
      (typeof code === 'string' && (Number(code) < 100 || Number(code) > 599))
    ) {
      throw ono.syntax(`Validation failed. ${responseId} has an invalid response code (${code})`);
    }
  }

  Object.keys(response.headers || {}).forEach(headerName => {
    const header = response.headers[headerName];
    const headerId = `${responseId}/headers/${headerName}`;
    validateSchema(header, headerId);
  });

  if (response.schema) {
    if ('$ref' in response.schema) {
      return;
    }

    validateSchema(response.schema, `${responseId}/schema`);
  }
}

/**
 * Validates the given Swagger schema object.
 *
 */
function validateSchema(schema: OpenAPIV2.SchemaObject, schemaId: string) {
  if (schema.type === 'array' && !schema.items) {
    throw ono.syntax(`Validation failed. ${schemaId} is an array, so it must include an "items" schema`);
  }
}

/**
 * Validates that the declared properties of the given Swagger schema object actually exist.
 *
 */
function validateRequiredPropertiesExist(schema: IJsonSchema, schemaId: string) {
  // Recursively collects all properties of the schema and its ancestors. They are added to the props object.
  function collectProperties(schemaObj: IJsonSchema, props: Record<string, IJsonSchema>) {
    if (schemaObj.properties) {
      Object.keys(schemaObj.properties).forEach(property => {
        // eslint-disable-next-line no-prototype-builtins
        if (schemaObj.properties.hasOwnProperty(property)) {
          // eslint-disable-next-line no-param-reassign
          props[property] = schemaObj.properties[property];
        }
      });
    }

    if (schemaObj.allOf) {
      schemaObj.allOf.forEach(parent => {
        collectProperties(parent, props);
      });
    }
  }

  if (schema.required && Array.isArray(schema.required)) {
    const props: Record<string, IJsonSchema> = {};
    collectProperties(schema, props);
    schema.required.forEach(requiredProperty => {
      if (!props[requiredProperty]) {
        throw ono.syntax(
          `Validation failed. Property '${requiredProperty}' listed as required but does not exist in '${schemaId}'`,
        );
      }
    });
  }
}
