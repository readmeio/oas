import type { IJsonSchema, OpenAPIV2 } from 'openapi-types';

import { pathParameterTemplateRegExp, swaggerHTTPMethods } from '../../lib/index.js';
import { SpecificationValidator } from './index.js';

/**
 * Validates parts of the Swagger 2.0 specification that aren't covered by its JSON Schema
 * definitions.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md}
 */
export class SwaggerSpecificationValidator extends SpecificationValidator {
  api: OpenAPIV2.Document;

  constructor(api: OpenAPIV2.Document) {
    super();

    this.api = api;
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

    Object.keys(this.api.definitions || {}).forEach(definitionName => {
      const definition = this.api.definitions[definitionName];
      const definitionId = `/definitions/${definitionName}`;

      if (!/^[a-zA-Z0-9.\-_]+$/.test(definitionName)) {
        this.reportError(
          `\`${definitionId}\` has an invalid name. Definition names should match against: /^[a-zA-Z0-9.-_]+$/`,
        );
      }

      this.validateRequiredPropertiesExist(definition, definitionId);
    });
  }

  /**
   * Validates the given path.
   *
   */
  private validatePath(path: OpenAPIV2.PathItemObject, pathId: string, operationIds: string[]) {
    swaggerHTTPMethods.forEach(operationName => {
      const operation = path[operationName];
      const operationId = `${pathId}/${operationName}`;

      if (operation) {
        const declaredOperationId = operation.operationId;
        if (declaredOperationId) {
          if (!operationIds.includes(declaredOperationId)) {
            operationIds.push(declaredOperationId);
          } else {
            this.reportError(`The operationId \`${declaredOperationId}\` is duplicated and must be made unique.`);
          }
        }

        this.validateParameters(path, pathId, operation, operationId);

        Object.keys(operation.responses || {}).forEach(responseName => {
          const response = operation.responses[responseName];
          if ('$ref' in response || !response) {
            return;
          }

          const responseId = `${operationId}/responses/${responseName}`;
          this.validateResponse(responseName, response, responseId);
        });
      }
    });
  }

  /**
   * Validates the parameters for the given operation.
   *
   */
  private validateParameters(
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
    this.checkForDuplicates(pathParams, pathId);

    // Check for duplicate operation parameters
    this.checkForDuplicates(operationParams, operationId);

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

    this.validateBodyParameters(params, operationId);
    this.validatePathParameters(params, pathId, operationId);
    this.validateParameterTypes(params, operation, operationId);
  }

  /**
   * Validates body and formData parameters for the given operation.
   *
   */
  private validateBodyParameters(params: OpenAPIV2.ParameterObject[], operationId: string) {
    const bodyParams = params.filter(param => param.in === 'body');
    const formParams = params.filter(param => param.in === 'formData');

    // There can only be one "body" parameter
    if (bodyParams.length > 1) {
      this.reportError(`\`${operationId}\` has ${bodyParams.length} body parameters. Only one is allowed.`);
    } else if (bodyParams.length > 0 && formParams.length > 0) {
      // "body" params and "formData" params are mutually exclusive
      this.reportError(
        `\`${operationId}\` has \`body\` and \`formData\` parameters. Only one or the other is allowed.`,
      );
    }
  }

  /**
   * Validates path parameters for the given path.
   *
   */
  private validatePathParameters(params: OpenAPIV2.ParameterObject[], pathId: string, operationId: string) {
    // Find all {placeholders} in the path string
    const placeholders: string[] = pathId.match(pathParameterTemplateRegExp) || [];

    // Check for duplicates
    for (let i = 0; i < placeholders.length; i++) {
      for (let j = i + 1; j < placeholders.length; j++) {
        if (placeholders[i] === placeholders[j]) {
          this.reportError(`\`${operationId}\` has multiple path placeholders named \`${placeholders[i]}\`.`);
        }
      }
    }

    params
      .filter(param => param.in === 'path')
      .forEach(param => {
        if (param.required !== true) {
          this.reportError(
            `Path parameters cannot be optional. Set \`required=true\` for the \`${param.name}\` parameter at \`${operationId}\`.`,
          );
        }

        const match = placeholders.indexOf(`{${param.name}}`);
        if (match === -1) {
          this.reportError(
            `\`${operationId}\` has a path parameter named \`${param.name}\`, but there is no corresponding \`{${param.name}}\` in the path string.`,
          );
        }

        placeholders.splice(match, 1);
      });

    if (placeholders.length > 0) {
      const list = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(
        placeholders.map(placeholder => `\`${placeholder}\``),
      );

      this.reportError(`\`${operationId}\` is missing path parameter(s) for ${list}.`);
    }
  }

  /**
   * Validates data types of parameters for the given operation.
   *
   */
  private validateParameterTypes(
    params: OpenAPIV2.ParameterObject[],
    operation: OpenAPIV2.OperationObject,
    operationId: string,
  ) {
    params.forEach(param => {
      const parameterId = `${operationId}/parameters/${param.name}`;
      let schema: any;

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

      this.validateSchema(schema, parameterId);
      this.validateRequiredPropertiesExist(schema, parameterId);

      if (schema.type === 'file') {
        // "file" params must consume at least one of these MIME types
        const formData = /multipart\/(.*\+)?form-data/;
        const urlEncoded = /application\/(.*\+)?x-www-form-urlencoded/;

        const consumes = operation.consumes || this.api.consumes || [];

        const hasValidMimeType = consumes.some(consume => {
          return formData.test(consume) || urlEncoded.test(consume);
        });

        if (!hasValidMimeType) {
          this.reportError(
            `\`${operationId}\` has a file parameter, so it must consume \`multipart/form-data\` or \`application/x-www-form-urlencoded\`.`,
          );
        }
      }
    });
  }

  /**
   * Validates the given response object.
   *
   */
  private validateResponse(code: number | string, response: OpenAPIV2.ResponseObject, responseId: string) {
    /**
     * The Swagger JSON Schema allows for any HTTP code between `000` and `999`, where as the OpenAPI
     * JSON Schema fixed this to require it to be a _known_ code between 100 and 599.
     *
     * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/f9a2302ee6707cb65f4aaf180fdce9b0a906701e/schemas/v2.0/schema.json#L350}
     */
    if (code !== 'default') {
      if (
        (typeof code === 'number' && (code < 100 || code > 599)) ||
        (typeof code === 'string' && (Number(code) < 100 || Number(code) > 599))
      ) {
        this.reportError(`\`${responseId}\` has an invalid response code: ${code}`);
      }
    }

    Object.keys(response.headers || {}).forEach(headerName => {
      const header = response.headers[headerName];
      const headerId = `${responseId}/headers/${headerName}`;
      this.validateSchema(header, headerId);
    });

    if (response.schema) {
      if ('$ref' in response.schema) {
        return;
      }

      this.validateSchema(response.schema, `${responseId}/schema`);
    }
  }

  /**
   * Validates the given Swagger schema object.
   *
   */
  private validateSchema(schema: OpenAPIV2.SchemaObject, schemaId: string) {
    if (schema.type === 'array' && !schema.items) {
      this.reportError(`\`${schemaId}\` is an array, so it must include an \`items\` schema.`);
    }
  }

  /**
   * Validates that the declared properties of the given Swagger schema object actually exist.
   *
   */
  private validateRequiredPropertiesExist(schema: IJsonSchema, schemaId: string) {
    // Recursively collects all properties of the schema and its ancestors. They are added to the props object.
    function collectProperties(schemaObj: IJsonSchema, props: Record<string, IJsonSchema>) {
      if (schemaObj.properties) {
        Object.keys(schemaObj.properties).forEach(property => {
          // biome-ignore lint/suspicious/noPrototypeBuiltins: Intentional
          if (schemaObj.properties.hasOwnProperty(property)) {
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
          this.reportError(
            `Property \`${requiredProperty}\` is listed as required but does not exist in \`${schemaId}\`.`,
          );
        }
      });
    }
  }

  /**
   * Checks the given parameter list for duplicates.
   *
   */
  private checkForDuplicates(params: OpenAPIV2.ParameterObject[], schemaId: string) {
    for (let i = 0; i < params.length - 1; i++) {
      const outer = params[i];
      for (let j = i + 1; j < params.length; j++) {
        const inner = params[j];
        if (outer.name === inner.name && outer.in === inner.in) {
          this.reportError(`Found multiple \`${outer.in}\` parameters named \`${outer.name}\` in \`${schemaId}\`.`);
        }
      }
    }
  }
}
