import type { OpenAPIDocument, ParserRulesOpenAPI } from '../../types.js';
import type * as OAS30 from '@scalar/openapi-types/3.0';
import type * as OAS31 from '@scalar/openapi-types/3.1';
import type * as OAS32 from '@scalar/openapi-types/3.2';

import { isOpenAPI30, isOpenAPI31, isOpenAPI32 } from '../../lib/assertions.js';
import { pathParameterTemplateRegExp, supportedHTTPMethods } from '../../lib/index.js';
import { normalizeURL, substituteServerVariables } from '../../lib/urls.js';

import { SpecificationValidator } from './index.js';

type PathItemObject = OAS30.PathItemObject | OAS31.PathItemObject | OAS32.PathItemObject;
type OperationObject = OAS30.OperationObject | OAS31.OperationObject | OAS32.OperationObject;
type ResponseObject = OAS30.ResponseObject | OAS31.ResponseObject | OAS32.ResponseObject;
type ServerObject = OAS30.ServerObject | OAS31.ServerObject | OAS32.ServerObject;
type ParameterObject =
  | OAS30.ParameterObject
  | OAS31.ParameterObject
  | OAS32.ParameterObject
  | OAS30.ReferenceObject
  | OAS31.ReferenceObject
  | OAS32.ReferenceObject;

/**
 * 3.0, 3.1, and 3.2 each type `parameters` as their own array. A readonly array of the shared
 * element type accepts that union, and copying it gives `reduce` one accumulator.
 */
function parameterList(params: readonly ParameterObject[] | undefined): ParameterObject[] {
  return params ? [...params] : [];
}

/**
 * A Path Item from `paths` or `webhooks`, plus the identifiers used when reporting errors against it.
 */
interface PathItemLocation {
  /** `paths` or `webhooks`. */
  container: 'paths' | 'webhooks';

  /** Error identifier, eg. `/paths/pets` or `/webhooks/newPet`. */
  id: string;

  /** The path or webhook name, as declared. */
  key: string;

  pathItem: PathItemObject;

  /** JSON Pointer to the Path Item, with `key` escaped. */
  pointer: string;
}

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
 * @see {@link https://spec.openapis.org/oas/v3.0.0.html}
 * @see {@link https://spec.openapis.org/oas/v3.1.0.html}
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html}
 */
export class OpenAPISpecificationValidator extends SpecificationValidator {
  api: OpenAPIDocument;

  rules: ParserRulesOpenAPI;

  constructor(api: OpenAPIDocument, rules: ParserRulesOpenAPI) {
    super();

    this.api = api;
    this.rules = rules;
  }

  runPreSchemaChecks(): void {
    this.checkSecuritySchemes();

    // These stay ahead of AJV so a targeted error can suppress the schema's "must NOT be valid"
    // noise. Both checks share the path-item walk below, including webhook Path Items.
    if (!isOpenAPI32(this.api)) {
      return;
    }

    this.eachPathItem(location => {
      this.checkAdditionalOperations(location);
      this.checkQuerystringParameters(location);
    });
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
    this.eachPathItem(({ container, key, id, pathItem }) => {
      // Path-parameter checks treat the key as a URL path. Webhook names are not URL paths, and a
      // path key without a leading slash is rejected before this pass.
      if (container === 'paths' && key.startsWith('/')) {
        this.validatePath(pathItem, id, operationIds);
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
     * @see {@link https://spec.openapis.org/oas/v3.1.0.html#oasWebhooks}
     * @see {@link https://spec.openapis.org/oas/v3.2.0.html#oas-webhooks}
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

    this.eachOperation(path, (operation, operationName) => {
      this.validateOperation(path, pathId, operation, `${pathId}/${operationName}`, operationIds);
    });
  }

  /**
   * Walk every Path Item in `paths` and, when the document has them, `webhooks`.
   *
   */
  private eachPathItem(visit: (location: PathItemLocation) => void): void {
    const containers: {
      entries: Record<string, PathItemObject | undefined> | undefined;
      name: PathItemLocation['container'];
    }[] = [{ entries: this.api.paths, name: 'paths' }];

    if ('webhooks' in this.api && this.api.webhooks) {
      containers.push({ entries: this.api.webhooks, name: 'webhooks' });
    }

    containers.forEach(({ entries, name }) => {
      Object.keys(entries || {}).forEach(key => {
        const pathItem = entries?.[key];
        if (!this.isObject(pathItem)) {
          return;
        }

        visit({
          container: name,
          id: name === 'paths' ? `/paths${key}` : `/webhooks/${key}`,
          key,
          pathItem,
          pointer: `/${name}/${escapeJSONPointer(key)}`,
        });
      });
    });
  }

  /**
   * Walk every operation on a Path Item. `operationName` is the pointer segment after the Path
   * Item: a fixed method like `get`, or `additionalOperations/COPY` for an OpenAPI 3.2 custom
   * method.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.2.0.md#path-item-object}
   */
  private eachOperation(
    pathItem: PathItemObject,
    visit: (operation: OperationObject, operationName: string) => void,
  ): void {
    supportedHTTPMethods.forEach(method => {
      const operation = (pathItem as OAS32.PathItemObject)[method];
      if (operation) {
        visit(operation, method);
      }
    });

    if (!isOpenAPI32(this.api) || !('additionalOperations' in pathItem) || !pathItem.additionalOperations) {
      return;
    }

    Object.entries(pathItem.additionalOperations).forEach(([method, operation]) => {
      if (operation) {
        visit(operation, `additionalOperations/${method}`);
      }
    });
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

  private validateServers(servers: readonly ServerObject[] | undefined, parentId: string) {
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
    const pathParams = parameterList(path.parameters);
    const operationParams = parameterList(operation.parameters);

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
   * Checks OpenAPI 3.2 `querystring` parameters on one Path Item. An operation may only have a
   * single `querystring` parameter and it cannot be used alongside `query` parameters, including
   * any that are inherited from the path item.
   *
   * The JSON Schema catches these cases when they occur within a single `parameters` list but
   * AJV renders those failures as an inscrutable "must NOT be valid" error, and it can't see
   * conflicts between path item and operation parameters, so this pre-AJV pass surfaces targeted
   * errors instead.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.2.0.md#parameter-locations}
   */
  private checkQuerystringParameters({ id, pathItem, pointer }: PathItemLocation): void {
    const pathParams = this.getWellFormedParameters(pathItem.parameters);

    const pathHasIssues = this.validateQuerystringParameters(pathParams, id);
    if (pathHasIssues) {
      this.flagInstancePath(`${pointer}/parameters`);
    }

    this.eachOperation(pathItem, (operation, operationName) => {
      if (!this.isObject(operation)) {
        return;
      }

      const operationId = `${id}/${operationName}`;
      const operationParams = this.getWellFormedParameters(operation.parameters);

      if (this.validateQuerystringParameters(operationParams, operationId)) {
        this.flagInstancePath(`${pointer}/${operationName}/parameters`);
      } else if (!pathHasIssues && pathParams.length && operationParams.length) {
        // Neither list has a problem on its own so make sure that they don't conflict with each
        // other once the path item parameters are inherited by the operation.
        this.validateQuerystringParameters(this.combineParameters(pathParams, operationParams), operationId);
      }
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
       * @see {@link https://spec.openapis.org/oas/v3.0.0.html#fixed-fields-9}
       * @see {@link https://spec.openapis.org/oas/v3.1.0.html#fixed-fields-9}
       * @see {@link https://spec.openapis.org/oas/v3.2.0.html#fixed-fields-9}
       */
      const schema = 'schema' in param ? param.schema : undefined;
      const content = 'content' in param ? param.content : undefined;
      if (!schema && this.isObject(content)) {
        this.validateParameterContent(content, parameterId);
        return;
      } else if (!this.isObject(schema) || '$ref' in schema) {
        return;
      }

      this.validateSchema(schema, parameterId);
    });
  }

  /**
   * Validates parameter content object.
   * Note: The requirement for exactly one media type is already enforced by the OpenAPI JSON schema.
   */
  private validateParameterContent(content: object, parameterId: string) {
    const mediaTypes = Object.keys(content);
    if (mediaTypes.length !== 1) {
      this.reportError(
        `\`${parameterId}\` must have exactly one media type in \`content\`, but found ${mediaTypes.length}.`,
      );
      return;
    }

    const mediaType = mediaTypes[0];
    const entry = Object.getOwnPropertyDescriptor(content, mediaType)?.value;
    const contentSchema = this.isObject(entry) && 'schema' in entry ? entry.schema : undefined;
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

      const headerSchema = 'schema' in header ? header.schema : undefined;
      const headerContent = 'content' in header ? header.content : undefined;
      if (this.isObject(headerSchema) && !('$ref' in headerSchema)) {
        this.validateSchema(headerSchema, headerId);
      } else if (this.isObject(headerContent)) {
        Object.keys(headerContent).forEach(mediaType => {
          const entry = Object.getOwnPropertyDescriptor(headerContent, mediaType)?.value;
          const mediaSchema = this.isObject(entry) && 'schema' in entry ? entry.schema : undefined;
          if (this.isObject(mediaSchema) && !('$ref' in mediaSchema)) {
            this.validateSchema(mediaSchema, `${headerId}/content/${mediaType}/schema`);
          }
        });
      }
    });

    if (response.content) {
      Object.entries(response.content).forEach(([mediaType, mediaTypeObject]) => {
        if (!this.isObject(mediaTypeObject) || !('schema' in mediaTypeObject)) return;
        const mediaSchema = mediaTypeObject.schema;
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
  private validateSchema(schema: object, schemaId: string) {
    if (!this.isObject(schema)) {
      return;
    }

    const type = 'type' in schema ? schema.type : undefined;
    const items = 'items' in schema ? schema.items : undefined;
    if (type === 'array' && !items) {
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
   * @see {@link https://spec.openapis.org/oas/v3.0.0.html#security-scheme-object}
   * @see {@link https://spec.openapis.org/oas/v3.1.0.html#security-scheme-object}
   * @see {@link https://spec.openapis.org/oas/v3.2.0.html#security-scheme-object}
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
   * Checks one OpenAPI 3.2 `additionalOperations` map for keys that duplicate the HTTP methods that
   * already have fixed fields on the path item (`get`, `put`, etc.).
   *
   * The JSON Schema catches this through a `propertyNames.not.enum` constraint but AJV renders
   * that failure as an inscrutable "must NOT be valid" error, so this pre-AJV pass surfaces a
   * targeted error instead.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.2.0.md#path-item-object}
   */
  private checkAdditionalOperations({ id, pathItem, pointer }: PathItemLocation): void {
    if (!('additionalOperations' in pathItem) || !pathItem.additionalOperations) {
      return;
    }

    const fixedFieldMethods: string[] = supportedHTTPMethods.map(method => method.toUpperCase());

    Object.keys(pathItem.additionalOperations).forEach(method => {
      if (fixedFieldMethods.includes(method)) {
        this.flagInstancePath(`${pointer}/additionalOperations`);
        this.reportError(
          `\`${id}/additionalOperations\` must not contain \`${method}\` because it already has a fixed field on the path item. Define this operation within \`${method.toLowerCase()}\` instead.`,
        );
      }
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
