import type { ParserRulesOpenAPI } from '../../types.js';
import type { OpenAPIV3, OpenAPIV3_1, OpenAPIV3_2 } from '@scalar/openapi-types';

import { isOpenAPI30, isOpenAPI31, isOpenAPI32 } from '../../lib/assertions.js';
import { pathParameterTemplateRegExp, supportedHTTPMethods } from '../../lib/index.js';

import { SpecificationValidator } from './index.js';

type ParameterObject =
  | (OpenAPIV3_1.ParameterObject | OpenAPIV3_1.ReferenceObject)
  | (OpenAPIV3_2.ParameterObject | OpenAPIV3_2.ReferenceObject)
  | (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject);

type PathItemObject = OpenAPIV3_1.PathItemObject | OpenAPIV3_2.PathItemObject | OpenAPIV3.PathItemObject;
type OperationObject = OpenAPIV3_1.OperationObject | OpenAPIV3_2.OperationObject | OpenAPIV3.OperationObject;

/**
 * Validates parts of the OpenAPI 3.0, 3.1, and 3.2 specification that aren't covered by their
 * JSON Schema definitions.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.2.0.md}
 */
export class OpenAPISpecificationValidator extends SpecificationValidator {
  api: OpenAPIV3_2.Document | OpenAPIV3_1.Document | OpenAPIV3.Document;

  rules: ParserRulesOpenAPI;

  constructor(api: OpenAPIV3_2.Document | OpenAPIV3_1.Document | OpenAPIV3.Document, rules: ParserRulesOpenAPI) {
    super();

    this.api = api;
    this.rules = rules;
  }

  runPreSchemaChecks(): void {
    this.checkSecuritySchemes();
    this.checkAdditionalOperations();
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
     * OpenAPI 3.1 brought the addition of `webhooks` and made `paths` optional in the process. The
     * specification now requires that either `components`, `webhooks`, or `paths` be present and
     * not empty. Unfortunately the JSON Schema for the specification is unable to specify this.
     *
     * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#openapi-document}
     */
    if (isOpenAPI31(this.api) || isOpenAPI32(this.api)) {
      if (
        !Object.keys(this.api.paths || {}).length &&
        !Object.keys(this.api.webhooks || {}).length &&
        !Object.keys(this.api.components || {}).length
      ) {
        this.reportError(
          'OpenAPI 3.1 and 3.2 definitions must contain at least one entry in either `paths`, `webhooks`, or `components`.',
        );
      }
    }
  }

  /**
   * Validates the given path.
   *
   */
  private validatePath(path: PathItemObject, pathId: string, operationIds: string[]) {
    supportedHTTPMethods.forEach(operationName => {
      const operation = path[operationName];
      if (operation) {
        this.validateOperation(path, pathId, operation, `${pathId}/${operationName}`, operationIds);
      }
    });

    /**
     * OpenAPI 3.2 allows path items to document operations for HTTP methods that don't have a
     * fixed field of their own within the `additionalOperations` map.
     *
     * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.2.0.md#path-item-object}
     */
    if (isOpenAPI32(this.api) && 'additionalOperations' in path && path.additionalOperations) {
      Object.keys(path.additionalOperations).forEach(method => {
        const operation = path.additionalOperations[method];
        if (operation) {
          this.validateOperation(path, pathId, operation, `${pathId}/additionalOperations/${method}`, operationIds);
        }
      });
    }
  }

  /**
   * Validates the given operation.
   *
   */
  private validateOperation(
    path: PathItemObject,
    pathId: string,
    operation: OperationObject,
    operationId: string,
    operationIds: string[],
  ) {
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

  /**
   * Validates the parameters for the given operation.
   *
   */
  private validateParameters(path: PathItemObject, pathId: string, operation: OperationObject, operationId: string) {
    const pathParams = path.parameters || [];
    const operationParams = operation.parameters || [];

    // Check for duplicate path parameters.
    this.checkForDuplicates(pathParams, pathId);

    // Check for duplicate operation parameters.
    this.checkForDuplicates(operationParams, operationId);

    // Combine the path and operation parameters, with the operation params taking precedence over
    // the path params.
    const params = pathParams.reduce<ParameterObject[]>((combinedParams, value) => {
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

      const parameterId = `${operationId}/parameters/${param.name}`;

      /**
       * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#fixed-fields-10}
       * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#fixed-fields-10}
       */
      if (!param.schema && param.content) {
        this.validateParameterContent(param.content, parameterId);
        return;
      } else if ('$ref' in param.schema) {
        return;
      }

      this.validateSchema(param.schema, parameterId);
    });
  }

  /**
   * Validates parameter content object.
   * Note: The requirement for exactly one media type is already enforced by the OpenAPI JSON schema.
   */
  private validateParameterContent(
    content: OpenAPIV3_1.ParameterObject['content'] | OpenAPIV3_2.ParameterObject['content'] | OpenAPIV3.ParameterObject['content'],
    parameterId: string,
  ) {
    const mediaTypes = Object.keys(content);
    if (mediaTypes.length !== 1) {
      this.reportError(
        `\`${parameterId}\` must have exactly one media type in \`content\`, but found ${mediaTypes.length}.`,
      );
      return;
    }

    const mediaType = mediaTypes[0];
    const contentSchema = content[mediaType].schema;
    if (contentSchema) {
      if ('$ref' in contentSchema) {
        return;
      }
      this.validateSchema(contentSchema, `${parameterId}/content/${mediaType}/schema`);
    }
  }

  /**
   * Validates the given response object.
   *
   */
  private validateResponse(
    response: OpenAPIV3_1.ResponseObject | OpenAPIV3_2.ResponseObject | OpenAPIV3.ResponseObject,
    responseId: string,
  ) {
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
  private validateSchema(
    schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_2.SchemaObject | OpenAPIV3.SchemaObject,
    schemaId: string,
  ) {
    if (schema.type === 'array' && !schema.items) {
      if (this.rules['array-without-items'] === 'warning') {
        this.reportWarning(`\`${schemaId}\` is an array, so it should include an \`items\` schema.`);
      } else {
        this.reportError(`\`${schemaId}\` is an array, so it must include an \`items\` schema.`);
      }
    }
  }

  /**
   * Validates security schemes in `components.securitySchemes` against their declared `type`.
   *
   * AJV uses a `oneOf` schema to validate security schemes, so when a scheme is malformed AJV
   * fails every branch and produces overwhelming, unhelpful errors. This pre-AJV pass surfaces
   * a single targeted error per problem.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#security-scheme-object}
   */
  private checkSecuritySchemes() {
    const securitySchemes = this.api.components?.securitySchemes;
    if (!securitySchemes) {
      return;
    }

    const schemeTypeProps: Record<string, { foreign: Record<string, string>; required: string[] }> = {
      apiKey: {
        required: ['name', 'in'],
        foreign: { scheme: 'http', bearerFormat: 'http', flows: 'oauth2', openIdConnectUrl: 'openIdConnect' },
      },
      http: {
        required: ['scheme'],
        foreign: { name: 'apiKey', in: 'apiKey', flows: 'oauth2', openIdConnectUrl: 'openIdConnect' },
      },
      oauth2: {
        required: ['flows'],
        foreign: {
          name: 'apiKey',
          in: 'apiKey',
          scheme: 'http',
          bearerFormat: 'http',
          openIdConnectUrl: 'openIdConnect',
        },
      },
      openIdConnect: {
        required: ['openIdConnectUrl'],
        foreign: { name: 'apiKey', in: 'apiKey', scheme: 'http', bearerFormat: 'http', flows: 'oauth2' },
      },
      mutualTLS: {
        required: [],
        foreign: {
          name: 'apiKey',
          in: 'apiKey',
          scheme: 'http',
          bearerFormat: 'http',
          flows: 'oauth2',
          openIdConnectUrl: 'openIdConnect',
        },
      },
    };

    Object.keys(securitySchemes).forEach(name => {
      const scheme = securitySchemes[name] as Record<string, unknown>;
      if ('$ref' in scheme) {
        return;
      }

      const schemeId = `/components/securitySchemes/${name}`;
      const reportIssue = (message: string) => this.reportSecuritySchemeIssue(message, schemeId);

      // Rule: every scheme must declare a `type`. Without it we can't run any other check.
      if (!('type' in scheme) || !scheme.type) {
        reportIssue(
          `\`${schemeId}\` is missing required property \`type\`. Must be one of: \`apiKey\`, \`http\`, \`oauth2\`, \`openIdConnect\`, \`mutualTLS\`.`,
        );
        return;
      }

      const type = scheme.type as string;

      // Rule: `type: basic` is Swagger 2.0 syntax, produce a migration hint instead of a
      // generic "invalid type" so users porting from 2.0 know what to change.
      if (type === 'basic') {
        reportIssue(
          `\`${schemeId}\` uses \`type: basic\`, which is a Swagger 2.0 value. In OpenAPI 3.x use \`type: http\` with \`scheme: basic\` instead.`,
        );
        return;
      }

      // Rule: `type` must be one of the recognized OAS 3.x scheme types.
      if (!(type in schemeTypeProps)) {
        reportIssue(
          `\`${schemeId}\` has an invalid \`type\`: \`${type}\`. Must be one of: \`apiKey\`, \`http\`, \`oauth2\`, \`openIdConnect\`, \`mutualTLS\`.`,
        );
        return;
      }

      const config = schemeTypeProps[type];

      // Rule: each `type` has properties it must declare (apiKey needs name+in, http needs
      // scheme, oauth2 needs flows, etc.). Report each missing required property separately.
      config.required.forEach(prop => {
        if (!(prop in scheme)) {
          reportIssue(`\`${schemeId}\` (\`type: ${type}\`) is missing required property \`${prop}\`.`);
        }
      });

      // Rule: cross-type contamination, e.g. an `http` scheme with a `name` field (which
      // belongs to `apiKey`). The error names the type that *does* own the property to nudge
      // the user toward the fix.
      Object.entries(config.foreign).forEach(([prop, ownerType]) => {
        if (prop in scheme) {
          reportIssue(
            `\`${schemeId}\` (\`type: ${type}\`) includes \`${prop}\`, which is only valid for \`type: ${ownerType}\` schemes.`,
          );
        }
      });

      // Rule: `apiKey.in` must be one of `query`, `header`, `cookie` (per OAS 3.0+).
      if (type === 'apiKey' && typeof scheme.in === 'string') {
        const validIn = ['query', 'header', 'cookie'];
        if (!validIn.includes(scheme.in)) {
          reportIssue(
            `\`${schemeId}\` has an invalid \`in\` value: \`${scheme.in}\`. Must be one of: \`query\`, \`header\`, \`cookie\`.`,
          );
        }
      }

      // Rule: `oauth2.flows` is structurally present but empty (`flows: {}`), the `required`
      // check passes, but the spec demands at least one grant type inside.
      if (type === 'oauth2' && scheme.flows && typeof scheme.flows === 'object') {
        if (Object.keys(scheme.flows as object).length === 0) {
          const grantTypes = isOpenAPI32(this.api)
            ? '`implicit`, `password`, `clientCredentials`, `authorizationCode`, or `deviceAuthorization`'
            : '`implicit`, `password`, `clientCredentials`, or `authorizationCode`';

          reportIssue(`\`${schemeId}\` has empty \`flows\`. At least one grant type is required: ${grantTypes}.`);
        }
      }
    });
  }

  /**
   * Checks OpenAPI 3.2 `additionalOperations` maps for keys that duplicate the HTTP methods that
   * already have fixed fields on the path item (`get`, `put`, etc.).
   *
   * The JSON Schema catches this through a `propertyNames.not.enum` constraint but AJV renders
   * that failure as an inscrutable "NOT must NOT be valid" error, so this pre-AJV pass surfaces
   * a targeted error instead.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.2.0.md#path-item-object}
   */
  private checkAdditionalOperations() {
    if (!isOpenAPI32(this.api)) {
      return;
    }

    const fixedFieldMethods = supportedHTTPMethods.map(method => method.toUpperCase());

    Object.keys(this.api.paths || {}).forEach(pathName => {
      const path = this.api.paths[pathName];
      if (!path || typeof path !== 'object' || !('additionalOperations' in path) || !path.additionalOperations) {
        return;
      }

      Object.keys(path.additionalOperations).forEach(method => {
        if (fixedFieldMethods.includes(method)) {
          // AJV instance paths are JSON Pointers, so the slashes within the path name itself
          // need to be escaped for the flagged path to match.
          this.flagInstancePath(`/paths/${pathName.replace(/~/g, '~0').replace(/\//g, '~1')}/additionalOperations`);
          this.reportError(
            `\`/paths${pathName}/additionalOperations\` must not contain \`${method}\` because it already has a fixed field on the path item. Define this operation within \`${method.toLowerCase()}\` instead.`,
          );
        }
      });
    });
  }

  private reportSecuritySchemeIssue(message: string, schemeId: string) {
    this.flagInstancePath(schemeId);
    if (this.rules['invalid-security-scheme-properties'] === 'warning') {
      this.reportWarning(message);
    } else {
      this.reportError(message);
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
