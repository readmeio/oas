import type { OpenAPI, OpenAPIV2 } from 'openapi-types';

import { format as utilFormat, inherits as utilInherits } from 'util';

import * as url from '@apidevtools/json-schema-ref-parser/lib/util/url';
import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

import ServerObject = OpenAPIV3.ServerObject;
import ParameterObject = OpenAPIV3.ParameterObject;
import ReferenceObject = OpenAPIV3_1.ReferenceObject;

import file from '@apidevtools/json-schema-ref-parser/lib/resolvers/file';

export const format = utilFormat;
export const inherits = utilInherits;

/**
 * Regular Expression that matches Swagger path params.
 */
export const swaggerParamRegExp = /\{([^/}]+)}/g;

/**
 * List of HTTP verbs used for OperationItem as per the OpenAPI and Swagger specifications
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#path-item-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#path-item-object}
 */
export const supportedHTTPMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'] as const;
export const swaggerHTTPMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'] as const;

/**
 * This function takes in a Server object, checks if it has relative path
 * and then fixes it as per the path url
 *
 * @param {object} server - The server object to be fixed
 * @param {string} path - The path (an http/https url) from where the file was downloaded
 * @returns {object} - The fixed server object
 */
function fixServers(server: ParameterObject | ReferenceObject | ServerObject, path: string) {
  // Server url starting with "/" tells that it is not an http(s) url
  if (server && 'url' in server && server.url && server.url.startsWith('/')) {
    const inUrl = url.parse(path);
    server.url = `${inUrl.protocol}//${inUrl.hostname}${server.url}`;
    return server;
  }
}

/**
 * This function helps fix the relative servers in the API definition file
 * be at root, path or operation's level
 */
export function fixOasRelativeServers(schema: OpenAPI.Document, filePath?: string) {
  if (
    schema &&
    'openapi' in schema &&
    schema.openapi &&
    filePath &&
    (filePath.startsWith('http:') || filePath.startsWith('https:'))
  ) {
    /**
     * From OpenAPI v3 spec for Server object's url property: "REQUIRED. A URL to the target host.
     * This URL supports Server Variables and MAY be relative, to indicate that the host location is relative to the location where
     * the OpenAPI document is being served."
     * Further, the spec says that "servers" property can show up at root level, in 'Path Item' object or in 'Operation' object.
     * However, interpretation of the spec says that relative paths for servers should take into account the hostname that
     * serves the OpenAPI file.
     */
    if (schema.servers) {
      schema.servers.map(server => fixServers(server, filePath)); // Root level servers array's fixup
    }

    // Path, Operation, or Webhook level servers array's fixup
    for (const component of ['paths', 'webhooks'] as const) {
      if (component in schema) {
        const schemaElement = schema.paths || {};
        for (const path of Object.keys(schemaElement)) {
          const pathItem = schemaElement[path] || {};
          for (const opItem of Object.keys(pathItem) as unknown as (keyof typeof pathItem)[]) {
            const pathItemElement = pathItem[opItem];
            if (!pathItemElement) {
              continue;
            }
            if (opItem === 'servers' && Array.isArray(pathItemElement)) {
              // servers at pathitem level
              for (const server of pathItemElement) {
                fixServers(server, filePath);
              }
            } else if (supportedHTTPMethods.includes(opItem as any) && typeof pathItemElement === 'object') {
              // servers at operation level
              if ('servers' in pathItemElement && pathItemElement.servers) {
                for (const server of pathItemElement.servers) {
                  fixServers(server, filePath);
                }
              }
            }
          }
        }
      }
    }
  } else {
    // Do nothing and return
  }
}

export function isSwagger(schema: any): schema is OpenAPIV2.Document {
  return 'swagger' in schema && schema.swagger !== undefined;
}

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
