import type { OpenAPI, OpenAPIV2 } from 'openapi-types';

import { format as utilFormat, inherits as utilInherits } from 'node:util';

import * as url from '@apidevtools/json-schema-ref-parser/lib/util/url';
import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

import ServerObject = OpenAPIV3.ServerObject;
import ParameterObject = OpenAPIV3.ParameterObject;
import ReferenceObject = OpenAPIV3_1.ReferenceObject;

export const format = utilFormat;
export const inherits = utilInherits;

/**
 * Regular expression that matches path parameter templating.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#path-templating}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#path-templating}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#path-templating}
 */
export const pathParameterTemplateRegExp = /\{([^/}]+)}/g;

/**
 * List of HTTP verbs used for OperationItem as per the OpenAPI and Swagger specifications
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#path-item-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#path-item-object}
 */
export const supportedHTTPMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'] as const;
export const swaggerHTTPMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'] as const;

/**
 * This function takes in a `ServerObject`, checks if it has relative path and then fixes it as per
 * the path URL.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#server-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#server-object}
 *
 * @param server - The server object to be fixed.
 * @param path - The path (an HTTP(S) url) from where the file was downloaded.
 * @returns The fixed server object
 */
function fixServers(server: ParameterObject | ReferenceObject | ServerObject, path: string) {
  // A erver URL starting with "/" tells that it is not an HTTP(s) URL.
  if (server && 'url' in server && server.url && server.url.startsWith('/')) {
    const inUrl = url.parse(path);

    // eslint-disable-next-line no-param-reassign
    server.url = `${inUrl.protocol}//${inUrl.hostname}${server.url}`;
  }
}

/**
 * This function helps fix the relative servers in the API definition file be at root, path or
 * operation's level.
 *
 * From the OpenAPI v3 specification for the `ServerObject` `url` property:
 *
 *    REQUIRED. A URL to the target host. This URL supports Server Variables and MAY be relative,
 *    to indicate that the host location is relative to the location where the OpenAPI document is
 *    being served. Variable substitutions will be made when a variable is named in `{brackets}`.
 *
 * Further the spec says that `servers` property can show up at root level, in `PathItemObject` or
 * in `OperationObject`. However interpretation of the spec says that relative paths for servers
 * should take into account the hostname that serves the OpenAPI file.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#server-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#server-object}
 */
export function fixOasRelativeServers(schema: OpenAPI.Document, filePath?: string) {
  if (!schema || !isOpenAPI(schema) || !filePath || (!filePath.startsWith('http:') && !filePath.startsWith('https:'))) {
    return;
  }

  if (schema.servers) {
    schema.servers.map(server => fixServers(server, filePath)); // Root level servers array's fixup
  }

  (['paths', 'webhooks'] as const).forEach(component => {
    if (component in schema) {
      const schemaElement = schema.paths || {};
      Object.keys(schemaElement).forEach(path => {
        const pathItem = schemaElement[path] || {};
        Object.keys(pathItem).forEach((opItem: keyof typeof pathItem) => {
          const pathItemElement = pathItem[opItem];
          if (!pathItemElement) {
            return;
          }

          /**
           * Servers are at the `PathItemObject` level.
           *
           * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#path-item-object}
           * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#path-item-object}
           */
          if (opItem === 'servers' && Array.isArray(pathItemElement)) {
            pathItemElement.forEach(server => fixServers(server, filePath));
            return;
          }

          /**
           * Servers are at the `OperationObject` level.
           *
           * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#operation-object}
           * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#operation-object}
           */
          if (
            supportedHTTPMethods.includes(opItem as unknown as (typeof supportedHTTPMethods)[number]) &&
            typeof pathItemElement === 'object' &&
            'servers' in pathItemElement &&
            Array.isArray(pathItemElement.servers)
          ) {
            pathItemElement.servers.forEach(server => fixServers(server, filePath));
          }
        });
      });
    }
  });
}

/**
 * Is a given object a Swagger API definition?
 *
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isSwagger(schema: any): schema is OpenAPIV2.Document {
  return 'swagger' in schema && schema.swagger !== undefined;
}

/**
 * Is a given object an OpenAPI API definition?
 *
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isOpenAPI(schema: any): schema is OpenAPIV3_1.Document | OpenAPIV3.Document {
  return 'openapi' in schema && schema.openapi !== undefined;
}

/**
 * Determine the proper name for the API specification schema used by a given schema.
 *
 */
export function getSpecificationName(api: OpenAPIV2.Document | OpenAPIV3_1.Document | OpenAPIV3.Document) {
  return isSwagger(api) ? 'Swagger' : 'OpenAPI';
}
