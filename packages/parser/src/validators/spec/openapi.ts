import type { ParserRulesOpenAPI } from '../../types.js';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

import { supportedHTTPMethods, pathParameterTemplateRegExp, isOpenAPI31, isOpenAPI30 } from '../../lib/index.js';

import { SpecificationValidator } from './index.js';

type ParameterObject =
  | (OpenAPIV3_1.ParameterObject | OpenAPIV3_1.ReferenceObject)
  | (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject);

/**
 * Validates parts of the OpenAPI 3.0 and 3.1 that aren't covered by their JSON Schema definitions.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md}
 */
export class OpenAPISpecificationValidator extends SpecificationValidator {
  api: OpenAPIV3_1.Document | OpenAPIV3.Document;

  rules: ParserRulesOpenAPI;

  constructor(api: OpenAPIV3_1.Document | OpenAPIV3.Document, rules: ParserRulesOpenAPI) {
    super();

    this.api = api;
    this.rules = rules;
  }

  run(): void {
    const operationIds: string[] = [];
    Object.keys(this.api.paths || {}).forEach(pathName => {
      const path = this.api.paths[pathName];
      const pathId = `/paths${pathName}`;

      if (path && pathName.startsWith('/')) {
        this.validatePath(path, pathId, operationIds);
      }
    });

    /**
     * There's a problem with how the 3.0 schema uses `patternProperties` for defining the format of
     * scheme names that it ignores anything that doesn't match, so if you for example have a space
     * in a schema name it'll be seen as valid when it should instead trigger a validation error.
     *
     * @see {@link https://github.com/APIDevTools/swagger-parser/issues/184}
     */
    if (isOpenAPI30(this.api)) {
      if (this.api.components) {
        Object.keys(this.api.components).forEach((componentType: keyof typeof this.api.components) => {
          Object.keys(this.api.components[componentType]).forEach(componentName => {
            if (!/^[a-zA-Z0-9.\-_]+$/.test(componentName)) {
              const componentId = `/components/${componentType}/${componentName}`;

              this.reportError(
                `\`${componentId}\` has an invalid name. Component names should match against: /^[a-zA-Z0-9.-_]+$/`,
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
    if (isOpenAPI31(this.api)) {
      if (!Object.keys(this.api.paths || {}).length && !Object.keys(this.api.webhooks || {}).length) {
        this.reportError('OpenAPI 3.1 definitions must contain at least one entry in either `paths` or `webhook`.');
      }
    }
  }

  /**
   * Validates the given path.
   *
   */
  private validatePath(
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
          } else if (this.rules['duplicate-operation-id'] === 'warning') {
            this.reportWarning(`The operationId \`${declaredOperationId}\` is duplicated and should be made unique.`);
          } else {
            this.reportError(`The operationId \`${declaredOperationId}\` is duplicated and must be made unique.`);
          }
        }

        this.validateParameters(path, pathId, operation, operationId);

        Object.keys(operation.responses || {}).forEach(responseCode => {
          const response = operation.responses[responseCode];
          const responseId = `${operationId}/responses/${responseCode}`;
          if (response && !('$ref' in response)) {
            this.validateResponse(response, responseId);
          }
        });
      }
    });
  }

  /**
   * Validates the parameters for the given operation.
   *
   */
  private validateParameters(
    path: OpenAPIV3_1.PathItemObject | OpenAPIV3.PathItemObject,
    pathId: string,
    operation: OpenAPIV3_1.OperationObject | OpenAPIV3.OperationObject,
    operationId: string,
  ) {
    const pathParams = path.parameters || [];
    const operationParams = operation.parameters || [];

    // Check for duplicate path parameters.
    this.checkForDuplicates(pathParams, pathId);

    // Check for duplicate operation parameters.
    this.checkForDuplicates(operationParams, operationId);

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

    this.validatePathParameters(params, pathId, operationId);
    this.validateParameterTypes(params, operationId);
  }

  /**
   * Validates path parameters for the given path.
   *
   */
  private validatePathParameters(params: ParameterObject[], pathId: string, operationId: string) {
    // Find all `{placeholders}` in the path string. And because paths can have path parameters duped
    // we need to convert this to a unique array so we can eliminate false positives of placeholders
    // that might be duplicated.
    const placeholders = [...new Set(pathId.match(pathParameterTemplateRegExp) || [])];

    params
      .filter(param => 'in' in param)
      .filter(param => param.in === 'path')
      .forEach(param => {
        if (param.required !== true) {
          if (this.rules['non-optional-path-parameters'] === 'warning') {
            this.reportWarning(
              `Path parameters should not be optional. Set \`required=true\` for the \`${param.name}\` parameter at \`${operationId}\`.`,
            );
          } else {
            this.reportError(
              `Path parameters cannot be optional. Set \`required=true\` for the \`${param.name}\` parameter at \`${operationId}\`.`,
            );
          }
        }

        const match = placeholders.indexOf(`{${param.name}}`);
        if (match === -1) {
          const error = `\`${operationId}\` has a path parameter named \`${param.name}\`, but there is no corresponding \`{${param.name}}\` in the path string.`;

          if (this.rules['path-parameters-not-in-path'] === 'warning') {
            this.reportWarning(error);
          } else {
            this.reportError(error);
          }
        }

        placeholders.splice(match, 1);
      });

    if (placeholders.length > 0) {
      const list = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(
        placeholders.map(placeholder => `\`${placeholder}\``),
      );

      const error = `\`${operationId}\` is missing path parameter(s) for ${list}.`;
      if (this.rules['path-parameters-not-in-parameters'] === 'warning') {
        this.reportWarning(error);
      } else {
        this.reportError(error);
      }
    }
  }

  /**
   * Validates data types of parameters for the given operation.
   *
   */
  private validateParameterTypes(params: ParameterObject[], operationId: string) {
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

      this.validateSchema(param.schema, parameterId);
    });
  }

  /**
   * Validates the given response object.
   *
   */
  private validateResponse(response: OpenAPIV3_1.ResponseObject | OpenAPIV3.ResponseObject, responseId: string) {
    Object.keys(response.headers || {}).forEach(headerName => {
      const header = response.headers[headerName];
      const headerId = `${responseId}/headers/${headerName}`;
      if ('$ref' in header) {
        return;
      }

      if (header.schema) {
        if (!('$ref' in header.schema)) {
          this.validateSchema(header.schema, headerId);
        }
      } else if (header.content) {
        Object.keys(header.content).forEach(mediaType => {
          if (header.content[mediaType].schema) {
            if (!('$ref' in header.content[mediaType].schema)) {
              this.validateSchema(header.content[mediaType].schema || {}, `${headerId}/content/${mediaType}/schema`);
            }
          }
        });
      }
    });

    if (response.content) {
      Object.keys(response.content).forEach(mediaType => {
        if (response.content[mediaType].schema) {
          if (!('$ref' in response.content[mediaType].schema)) {
            this.validateSchema(response.content[mediaType].schema || {}, `${responseId}/content/${mediaType}/schema`);
          }
        }
      });
    }
  }

  /**
   * Validates the given Swagger schema object.
   *
   */
  private validateSchema(schema: OpenAPIV3_1.SchemaObject | OpenAPIV3.SchemaObject, schemaId: string) {
    if (schema.type === 'array' && !schema.items) {
      if (this.rules['array-without-items'] === 'warning') {
        this.reportWarning(`\`${schemaId}\` is an array, so it should include an \`items\` schema.`);
      } else {
        this.reportError(`\`${schemaId}\` is an array, so it must include an \`items\` schema.`);
      }
    }
  }

  /**
   * Checks the given parameter list for duplicates.
   *
   */
  private checkForDuplicates(params: ParameterObject[], schemaId: string) {
    for (let i = 0; i < params.length - 1; i++) {
      const outer = params[i];
      for (let j = i + 1; j < params.length; j++) {
        const inner = params[j];
        if ('$ref' in outer || '$ref' in inner) {
          continue;
        }

        if (outer.name === inner.name && outer.in === inner.in) {
          const error = `Found multiple \`${outer.in}\` parameters named \`${outer.name}\` in \`${schemaId}\`.`;

          if (this.rules['duplicate-non-request-body-parameters'] === 'warning') {
            this.reportWarning(error);
          } else {
            this.reportError(error);
          }
        }
      }
    }
  }
}
