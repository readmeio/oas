import type { OpenAPIV3_2, ParserRulesOpenAPI } from '../../types.js';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

import { isOpenAPI30, isOpenAPI31, isOpenAPI32 } from '../../lib/assertions.js';
import { pathParameterTemplateRegExp, supportedHTTPMethods } from '../../lib/index.js';
import { normalizeURL, substituteServerVariables } from '../../lib/urls.js';

import { SpecificationValidator } from './index.js';

type Document = OpenAPIV3_1.Document | OpenAPIV3_2.Document | OpenAPIV3.Document;
type PathItemObject = OpenAPIV3_1.PathItemObject | OpenAPIV3_2.PathItemObject | OpenAPIV3.PathItemObject;
type OperationObject = OpenAPIV3_1.OperationObject | OpenAPIV3_2.OperationObject | OpenAPIV3.OperationObject;
type ParameterObject =
  | (OpenAPIV3_1.ParameterObject | OpenAPIV3_1.ReferenceObject)
  | (OpenAPIV3_2.ParameterObject | OpenAPIV3_2.ReferenceObject)
  | (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject);
type ResponseObject = OpenAPIV3_1.ResponseObject | OpenAPIV3_2.ResponseObject | OpenAPIV3.ResponseObject;
type SchemaObject = OpenAPIV3_1.SchemaObject | OpenAPIV3_2.SchemaObject | OpenAPIV3.SchemaObject;

/**
 * Escape a path name for use within a JSON Pointer, which is what AJV reports instance paths as.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc6901#section-3}
 */
function escapeJSONPointer(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Validates parts of the OpenAPI 3.0, 3.1, and 3.2 specification that aren't covered by their JSON
 * Schema definitions.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.2.0.md}
 */
export class OpenAPISpecificationValidator extends SpecificationValidator {
  api: Document;

  rules: ParserRulesOpenAPI;

  constructor(api: Document, rules: ParserRulesOpenAPI) {
    super();

    this.api = api;
    this.rules = rules;
  }

  runPreSchemaChecks(): void {
    this.checkSecuritySchemes();
    this.checkAdditionalOperations();
    this.checkQuerystringParameters();
  }

  /**
   * `validate()` dereferences before this pass. OAS 3.1 boolean JSON Schemas (`true` / `false`)
   * are valid schema values. Using `in` on a primitive throws `TypeError`.
   */
  private isObject(value: unknown): value is object {
    return typeof value === 'object' && value !== null;
  }

  run(): void {
    this.validateServers(this.api.servers, '');

    const operationIds: string[] = [];
    Object.keys(this.api.paths || {}).forEach(pathName => {
      const path = this.api.paths[pathName];
      const pathId = `/paths${pathName}`;

      if (this.isObject(path) && pathName.startsWith('/')) {
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
     * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.2.0.md#openapi-description-structure}
     */
    if (isOpenAPI31(this.api) || isOpenAPI32(this.api)) {
      if (
        !Object.keys(this.api.paths || {}).length &&
        !Object.keys(this.api.webhooks || {}).length &&
        !Object.keys(this.api.components || {}).length
      ) {
        const version = isOpenAPI32(this.api) ? '3.2' : '3.1';
        this.reportError(
          `OpenAPI ${version} definitions must contain at least one entry in either \`paths\`, \`webhooks\`, or \`components\`.`,
        );
      }
    }
  }

  /**
   * Validates the given path.
   *
   */
  private validatePath(path: PathItemObject, pathId: string, operationIds: string[]) {
    this.validateServers(path.servers, pathId);

    supportedHTTPMethods.forEach(operationName => {
      const operation = (path as OpenAPIV3_2.PathItemObject)[operationName];
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
      const { additionalOperations } = path;
      Object.keys(additionalOperations).forEach(method => {
        const operation = additionalOperations[method];
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
    this.validateServers(operation.servers, operationId);

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
      if (this.isObject(response) && !('$ref' in response)) {
        this.validateResponse(response, responseId);
      }
    });
  }

  private validateServers(servers: OpenAPIV3.ServerObject[] | undefined, parentId: string) {
    servers?.forEach((server, index) => {
      let hasUnresolvedVariables = false;
      const url = substituteServerVariables(server.url, server.variables, () => {
        hasUnresolvedVariables = true;
      });

      // Undeclared variables may come from user data at runtime. Their URL cannot be validated
      // until those values are available, especially when they supply a protocol or port.
      if (hasUnresolvedVariables) return;

      try {
        // Query- and fragment-only references need a base for validation. Normalize other inputs
        // as URL selection does so malformed bare hosts are still checked as hosts.
        const urlForValidation = url.startsWith('?') || url.startsWith('#') ? url : normalizeURL(url);
        // oxlint-disable-next-line no-new -- Parsing the URL is the validation.
        new URL(urlForValidation, 'https://example.com');
      } catch {
        this.reportError(`\`${parentId}/servers/${index}/url\` is not a valid server URL: \`${server.url}\`.`);
      }
    });
  }

  /**
   * Validates the parameters for the given operation.
   *
   */
  private validateParameters(path: PathItemObject, pathId: string, operation: OperationObject, operationId: string) {
    const pathParams: ParameterObject[] = path.parameters || [];
    const operationParams: ParameterObject[] = operation.parameters || [];

    // Check for duplicate path parameters.
    this.checkForDuplicates(pathParams, pathId);

    // Check for duplicate operation parameters.
    this.checkForDuplicates(operationParams, operationId);

    const params = this.combineParameters(pathParams, operationParams);

    this.validatePathParameters(params, pathId, operationId);
    this.validateParameterTypes(params, operationId);
  }

  /**
   * Combine path item and operation parameters, with the operation parameters taking precedence
   * over the path item parameters.
   *
   */
  private combineParameters(pathParams: ParameterObject[], operationParams: ParameterObject[]): ParameterObject[] {
    return pathParams.reduce((combinedParams, value) => {
      const duplicate = combinedParams.some(param => {
        if (!this.isObject(param) || !this.isObject(value) || '$ref' in param || '$ref' in value) {
          return false;
        }

        return param.in === value.in && param.name === value.name;
      });

      if (!duplicate) {
        combinedParams.push(value);
      }

      return combinedParams;
    }, operationParams.slice());
  }

  /**
   * Checks OpenAPI 3.2 `querystring` parameters. An operation may only have a single `querystring`
   * parameter and it cannot be used alongside `query` parameters, including any that are
   * inherited from the path item.
   *
   * The JSON Schema catches these cases when they occur within a single `parameters` list but
   * AJV renders those failures as an inscrutable "must NOT be valid" error, and it can't see
   * conflicts between path item and operation parameters, so this pre-AJV pass surfaces targeted
   * errors instead.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.2.0.md#parameter-locations}
   */
  private checkQuerystringParameters() {
    if (!isOpenAPI32(this.api)) {
      return;
    }

    const paths: OpenAPIV3_2.PathsObject = this.api.paths || {};
    Object.keys(paths).forEach(pathName => {
      const path = paths[pathName];
      if (!path || typeof path !== 'object') {
        return;
      }

      const pathId = `/paths${pathName}`;
      const pathPointer = `/paths/${escapeJSONPointer(pathName)}`;
      const pathParams = this.getWellFormedParameters(path.parameters);

      const pathHasIssues = this.validateQuerystringParameters(pathParams, pathId);
      if (pathHasIssues) {
        this.flagInstancePath(`${pathPointer}/parameters`);
      }

      const operations: [string, OperationObject | undefined][] = [
        ...supportedHTTPMethods.map((method): [string, OperationObject | undefined] => [method, path[method]]),
        ...Object.entries(path.additionalOperations || {}).map(([method, operation]): [string, OperationObject] => [
          `additionalOperations/${method}`,
          operation,
        ]),
      ];

      operations.forEach(([operationName, operation]) => {
        if (!operation || typeof operation !== 'object') {
          return;
        }

        const operationId = `${pathId}/${operationName}`;
        const operationParams = this.getWellFormedParameters(operation.parameters);

        if (this.validateQuerystringParameters(operationParams, operationId)) {
          this.flagInstancePath(`${pathPointer}/${operationName}/parameters`);
        } else if (!pathHasIssues && pathParams.length && operationParams.length) {
          // Neither list has a problem on its own so make sure that they don't conflict with each
          // other once the path item parameters are inherited by the operation.
          this.validateQuerystringParameters(this.combineParameters(pathParams, operationParams), operationId);
        }
      });
    });
  }

  /**
   * Retrieve the parameters from a `parameters` list that are objects. Because this runs before
   * schema validation the list may contain malformed entries (eg. `null` or a string) that we
   * can't inspect; those are left for AJV to report on.
   *
   */
  private getWellFormedParameters(parameters: unknown): ParameterObject[] {
    if (!Array.isArray(parameters)) {
      return [];
    }

    return parameters.filter(
      (param): param is ParameterObject => param !== null && typeof param === 'object' && !Array.isArray(param),
    );
  }

  /**
   * Validates the `querystring` parameters within a list of parameters, reporting an error for
   * each violation.
   *
   * @returns If any errors were reported.
   */
  private validateQuerystringParameters(params: ParameterObject[], id: string): boolean {
    const locations = params.filter(param => 'in' in param).map(param => param.in);
    const querystringParams = locations.filter(location => location === 'querystring').length;
    if (!querystringParams) {
      return false;
    }

    let hasIssues = false;
    if (querystringParams > 1) {
      this.reportError(`\`${id}\` has ${querystringParams} \`querystring\` parameters. Only one is allowed.`);
      hasIssues = true;
    }

    if (locations.includes('query')) {
      this.reportError(`\`${id}\` has \`query\` and \`querystring\` parameters. Only one or the other is allowed.`);
      hasIssues = true;
    }

    return hasIssues;
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
      if (!this.isObject(param) || '$ref' in param) {
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
      } else if (!this.isObject(param.schema) || '$ref' in param.schema) {
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
    content:
      | OpenAPIV3_1.ParameterObject['content']
      | OpenAPIV3_2.ParameterObject['content']
      | OpenAPIV3.ParameterObject['content'],
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
    if (this.isObject(contentSchema) && !('$ref' in contentSchema)) {
      this.validateSchema(contentSchema, `${parameterId}/content/${mediaType}/schema`);
    }
  }

  /**
   * Validates the given response object.
   *
   */
  private validateResponse(response: ResponseObject, responseId: string) {
    Object.keys(response.headers || {}).forEach(headerName => {
      const header = response.headers[headerName];
      const headerId = `${responseId}/headers/${headerName}`;
      if (!this.isObject(header) || '$ref' in header) {
        return;
      }

      if (this.isObject(header.schema) && !('$ref' in header.schema)) {
        this.validateSchema(header.schema, headerId);
      } else if (header.content) {
        Object.keys(header.content).forEach(mediaType => {
          const headerSchema = header.content[mediaType].schema;
          if (this.isObject(headerSchema) && !('$ref' in headerSchema)) {
            this.validateSchema(headerSchema, `${headerId}/content/${mediaType}/schema`);
          }
        });
      }
    });

    if (response.content) {
      Object.keys(response.content).forEach(mediaType => {
        const mediaSchema = response.content[mediaType].schema;
        if (this.isObject(mediaSchema) && !('$ref' in mediaSchema)) {
          this.validateSchema(mediaSchema, `${responseId}/content/${mediaType}/schema`);
        }
      });
    }
  }

  /**
   * Validates the given Swagger schema object.
   *
   */
  private validateSchema(schema: SchemaObject, schemaId: string) {
    if (!this.isObject(schema)) {
      return;
    }

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
        foreign: {
          scheme: 'http',
          bearerFormat: 'http',
          flows: 'oauth2',
          oauth2MetadataUrl: 'oauth2',
          openIdConnectUrl: 'openIdConnect',
        },
      },
      http: {
        required: ['scheme'],
        foreign: {
          name: 'apiKey',
          in: 'apiKey',
          flows: 'oauth2',
          oauth2MetadataUrl: 'oauth2',
          openIdConnectUrl: 'openIdConnect',
        },
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
        foreign: {
          name: 'apiKey',
          in: 'apiKey',
          scheme: 'http',
          bearerFormat: 'http',
          flows: 'oauth2',
          oauth2MetadataUrl: 'oauth2',
        },
      },
      mutualTLS: {
        required: [],
        foreign: {
          name: 'apiKey',
          in: 'apiKey',
          scheme: 'http',
          bearerFormat: 'http',
          flows: 'oauth2',
          oauth2MetadataUrl: 'oauth2',
          openIdConnectUrl: 'openIdConnect',
        },
      },
    };

    Object.keys(securitySchemes).forEach(name => {
      const scheme = securitySchemes[name] as Record<string, unknown>;
      if (!this.isObject(scheme) || '$ref' in scheme) {
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
          // OpenAPI 3.2 added the `deviceAuthorization` grant type.
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
   * that failure as an inscrutable "must NOT be valid" error, so this pre-AJV pass surfaces a
   * targeted error instead.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.2.0.md#path-item-object}
   */
  private checkAdditionalOperations() {
    if (!isOpenAPI32(this.api)) {
      return;
    }

    const fixedFieldMethods: string[] = supportedHTTPMethods.map(method => method.toUpperCase());

    Object.keys(this.api.paths || {}).forEach(pathName => {
      const path = this.api.paths[pathName];
      if (!path || typeof path !== 'object' || !('additionalOperations' in path) || !path.additionalOperations) {
        return;
      }

      Object.keys(path.additionalOperations).forEach(method => {
        if (fixedFieldMethods.includes(method)) {
          this.flagInstancePath(`/paths/${escapeJSONPointer(pathName)}/additionalOperations`);
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
        if (!this.isObject(outer) || !this.isObject(inner) || '$ref' in outer || '$ref' in inner) {
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
