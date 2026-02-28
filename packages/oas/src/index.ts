import type { OpenAPIV3_1 } from 'openapi-types';
import type { Extensions } from './extensions.js';
import type { PathMatch, PathMatches } from './lib/urls.js';
import type {
  AuthForHAR,
  HttpMethods,
  OASDocument,
  OperationObject,
  SchemaObject,
  ServerObject,
  Servers,
  ServerVariable,
  ServerVariablesObject,
  User,
} from './types.js';

import { dereference } from '@readme/openapi-parser';

import {
  CODE_SAMPLES,
  extensionDefaults,
  getExtension,
  HEADERS,
  hasRootExtension,
  OAUTH_OPTIONS,
  PARAMETER_ORDERING,
  SAMPLES_LANGUAGES,
  validateParameterOrdering,
} from './extensions.js';
import { buildDiscriminatorOneOf, findDiscriminatorChildren } from './lib/build-discriminator-one-of.js';
import { getAuth } from './lib/get-auth.js';
import getUserVariable from './lib/get-user-variable.js';
import { isPrimitive } from './lib/helpers.js';
import { dereferenceRef, getDereferencingOptions } from './lib/refs.js';
import {
  filterPathMethods,
  findTargetPath,
  generatePathMatches,
  normalizedURL,
  stripTrailingSlash,
  transformURLIntoRegex,
} from './lib/urls.js';
import { Operation, Webhook } from './operation/index.js';
import { isOpenAPI31, isRef } from './types.js';
import { SERVER_VARIABLE_REGEX, supportedMethods } from './utils.js';

// biome-ignore lint/style/noDefaultExport: This file doesn't have any other exports so this is fine.
export default class Oas {
  /**
   * An OpenAPI API Definition.
   */
  api: OASDocument;

  /**
   * The current user that we should use when pulling auth tokens from security schemes.
   */
  user: User;

  /**
   * Internal storage array that the library utilizes to keep track of the times the
   * {@see Oas.dereference} has been called so that if you initiate multiple promises they'll all
   * end up returning the same data set once the initial dereference call completed.
   */
  protected promises: {
    reject: any;
    resolve: any;
  }[];

  /**
   * Internal storage array that the library utilizes to keep track of its `dereferencing` state so
   * it doesn't initiate multiple dereferencing processes.
   */
  protected dereferencing: {
    circularRefs: string[];
    complete: boolean;
    processing: boolean;
  };

  /**
   * @param oas An OpenAPI definition.
   * @param user The information about a user that we should use when pulling auth tokens from
   *    security schemes.
   */
  constructor(oas: OASDocument | string, user?: User) {
    if (typeof oas === 'string') {
      this.api = (JSON.parse(oas) || {}) as OASDocument;
    } else {
      this.api = oas || ({} as OASDocument);
    }

    this.user = user || {};

    this.promises = [];
    this.dereferencing = {
      processing: false,
      complete: false,
      circularRefs: [],
    };
  }

  /**
   * This will initialize a new instance of the `Oas` class. This method is useful if you're using
   * Typescript and are attempting to supply an untyped JSON object into `Oas` as it will force-type
   * that object to an `OASDocument` for you.
   *
   * @param oas An OpenAPI definition.
   * @param user The information about a user that we should use when pulling auth tokens from
   *    security schemes.
   */
  static init(oas: OASDocument | Record<string, unknown>, user?: User): Oas {
    return new Oas(oas as OASDocument, user);
  }

  /**
   * Retrieve the OpenAPI version that this API definition is targeted for.
   */
  getVersion(): string {
    if (this.api.openapi) {
      return this.api.openapi;
    }

    throw new Error('Unable to recognize what specification version this API definition conforms to.');
  }

  /**
   * Retrieve the current OpenAPI API Definition.
   *
   */
  getDefinition(): OASDocument {
    return this.api;
  }

  url(selected = 0, variables?: ServerVariable): string {
    const url = normalizedURL(this.api, selected);
    return this.replaceUrl(url, variables || this.defaultVariables(selected)).trim();
  }

  variables(selected = 0): ServerVariablesObject {
    return this.api.servers?.[selected]?.variables || {};
  }

  defaultVariables(selected = 0): ServerVariable {
    const variables = this.variables(selected);
    const defaults: ServerVariable = {};

    Object.keys(variables).forEach(key => {
      defaults[key] = getUserVariable(this.user, key) || variables[key].default || '';
    });

    return defaults;
  }

  splitUrl(selected = 0): (
    | {
        /**
         * A unique key, where the `value` is concatenated to its index
         */
        key: string;
        type: 'text';
        value: string;
      }
    | {
        /**
         * An optional description for the server variable.
         *
         * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-4}
         */
        description?: string;

        /**
         * An enumeration of string values to be used if the substitution options are from a limited set.
         *
         * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-4}
         */
        enum?: string[];

        /**
         * A unique key, where the `value` is concatenated to its index
         */
        key: string;
        type: 'variable';
        value: string;
      }
  )[] {
    const url = normalizedURL(this.api, selected);
    const variables = this.variables(selected);

    return url
      .split(/({.+?})/)
      .filter(Boolean)
      .map((part, i) => {
        const isVariable = part.match(/[{}]/);
        const value = part.replace(/[{}]/g, '');
        // To ensure unique keys, we're going to create a key
        // with the value concatenated to its index.
        const key = `${value}-${i}`;

        if (!isVariable) {
          return {
            type: 'text',
            value,
            key,
          };
        }

        const variable = variables?.[value];

        return {
          type: 'variable',
          value,
          key,
          description: variable?.description,
          enum: variable?.enum,
        };
      });
  }

  /**
   * With a fully composed server URL, run through our list of known OAS servers and return back
   * which server URL was selected along with any contained server variables split out.
   *
   * For example, if you have an OAS server URL of `https://{name}.example.com:{port}/{basePath}`,
   * and pass in `https://buster.example.com:3000/pet` to this function, you'll get back the
   * following:
   *
   *    { selected: 0, variables: { name: 'buster', port: 3000, basePath: 'pet' } }
   *
   * Re-supplying this data to `oas.url()` should return the same URL you passed into this method.
   *
   * @param baseUrl A given URL to extract server variables out of.
   */
  splitVariables(baseUrl: string): Servers | false {
    const matchedServer = (this.api.servers || [])
      .map((server, i) => {
        const rgx = transformURLIntoRegex(server.url);
        const found = new RegExp(rgx).exec(baseUrl);
        if (!found) {
          return false;
        }

        // While it'd be nice to use named regex groups to extract path parameters from the URL and
        // match them up with the variables that we have present in it, JS unfortunately doesn't
        // support having the groups duplicated. So instead of doing that we need to re-regex the
        // server URL, this time splitting on the path parameters -- this way we'll be able to
        // extract the parameter names and match them up with the matched server that we obtained
        // above.
        const variables: Record<string, number | string> = {};
        Array.from(server.url.matchAll(SERVER_VARIABLE_REGEX)).forEach((variable, y) => {
          variables[variable[1]] = found[y + 1];
        });

        return {
          selected: i,
          variables,
        };
      })
      .filter(item => item !== false);

    return matchedServer.length ? matchedServer[0] : false;
  }

  /**
   * Replace templated variables with supplied data in a given URL.
   *
   * There are a couple ways that this will utilize variable data:
   *
   *  - Supplying a `variables` object. If this is supplied, this data will always take priority.
   *    This incoming `variables` object can be two formats:
   *    `{ variableName: { default: 'value' } }` and `{ variableName: 'value' }`. If the former is
   *    present, that will take precedence over the latter.
   *  - If the supplied `variables` object is empty or does not match the current template name,
   *    we fallback to the data stored in `this.user` and attempt to match against that.
   *    See `getUserVariable` for some more information on how this data is pulled from `this.user`.
   *
   * If no variables supplied match up with the template name, the template name will instead be
   * used as the variable data.
   *
   * @param url A URL to swap variables into.
   * @param variables An object containing variables to swap into the URL.
   */
  replaceUrl(url: string, variables: ServerVariable = {}): string {
    // When we're constructing URLs, server URLs with trailing slashes cause problems with doing
    // lookups, so if we have one here on, slice it off.
    return stripTrailingSlash(
      url.replace(SERVER_VARIABLE_REGEX, (original: string, key: string) => {
        if (key in variables) {
          const data = variables[key];
          if (typeof data === 'object') {
            if (!Array.isArray(data) && data !== null && 'default' in data) {
              return String(data.default);
            }
          } else {
            return String(data);
          }
        }

        const userVariable = getUserVariable(this.user, key);
        if (userVariable) {
          return String(userVariable);
        }

        return original;
      }),
    );
  }

  /**
   * Retrieve an Operation of Webhook class instance for a given path and method.
   *
   * @param path Path to lookup and retrieve.
   * @param method HTTP Method to retrieve on the path.
   */
  operation(
    path: string,
    method: HttpMethods,
    opts: {
      /**
       * If you prefer to first look for a webhook with this path and method.
       */
      isWebhook?: boolean;
    } = {},
  ): Operation {
    // If we're unable to locate an operation for this path+method combination within the API
    // definition, we should still set an empty schema on the operation in the `Operation` class
    // because if we don't trying to use any of the accessors on that class are going to fail as
    // `schema` will be `undefined`.
    let operation: OperationObject = {
      parameters: [],
    };

    if (opts.isWebhook) {
      if (isOpenAPI31(this.api)) {
        const webhookPath = dereferenceRef(this.api?.webhooks?.[path], this.api);
        if (webhookPath && !isRef(webhookPath)) {
          if (webhookPath?.[method]) {
            operation = webhookPath[method];
            return new Webhook(this.api, path, method, operation);
          }
        }
      }
    }

    if (this?.api?.paths?.[path]) {
      const pathItem = dereferenceRef(this.api.paths[path], this.api);
      if (pathItem?.[method]) {
        operation = dereferenceRef(pathItem[method], this.api);
      }
    }

    return new Operation(this.api, path, method, operation);
  }

  findOperationMatches(url: string): PathMatches | undefined {
    const { origin, hostname } = new URL(url);
    const originRegExp = new RegExp(origin, 'i');
    const { servers, paths } = this.api;

    let pathName: string | undefined;
    let targetServer: ServerObject | undefined;
    let matchedServer: ServerObject | undefined;

    if (!servers || !servers.length) {
      // If this API definition doesn't have any servers set up let's treat it as if it were
      // https://example.com because that's the default origin we add in `normalizedUrl` under the
      // same circumstances. Without this we won't be able to match paths within what is otherwise
      // a valid OpenAPI definition.
      matchedServer = {
        url: 'https://example.com',
      };
    } else {
      matchedServer = servers.find(s => originRegExp.exec(this.replaceUrl(s.url, s.variables || {})));
      if (!matchedServer) {
        const hostnameRegExp = new RegExp(hostname);
        matchedServer = servers.find(s => hostnameRegExp.exec(this.replaceUrl(s.url, s.variables || {})));
      }
    }

    if (matchedServer) {
      // Instead of setting `url` directly against `matchedServer` we need to set it to an
      // intermediary object as directly modifying `matchedServer.url` will in turn update
      // `this.servers[idx].url` which we absolutely do not want to happen.
      targetServer = {
        ...matchedServer,
        url: this.replaceUrl(matchedServer.url, matchedServer.variables || {}),
      };

      [, pathName] = url.split(new RegExp(targetServer.url, 'i'));
    }

    // If we **still** haven't found a matching server, then the OAS server URL might have server
    // variables and we should loosen it up with regex to try to discover a matching path.
    //
    // For example if an OAS has `https://{region}.node.example.com/v14` set as its server URL, and
    // the `this.user` object has a `region` value of `us`, if we're trying to locate an operation
    // for https://eu.node.example.com/v14/api/esm we won't be able to because normally the users
    // `region` of `us` will be transposed in and we'll be trying to locate `eu.node.example.com`
    // in `us.node.example.com` -- which won't work.
    //
    // So what this does is transform `https://{region}.node.example.com/v14` into
    // `https://([-_a-zA-Z0-9[\\]]+).node.example.com/v14`, and from there we'll be able to match
    // https://eu.node.example.com/v14/api/esm and ultimately find the operation matches for
    // `/api/esm`.
    if (!matchedServer || !pathName) {
      const matchedServerAndPath = (servers || [])
        .map(server => {
          const rgx = transformURLIntoRegex(server.url);
          const found = new RegExp(rgx).exec(url);
          if (!found) {
            return undefined;
          }

          return {
            matchedServer: server,
            pathName: url.split(new RegExp(rgx)).slice(-1).pop(),
          };
        })
        .filter((item): item is { matchedServer: ServerObject; pathName: string | undefined } => item !== undefined);

      if (!matchedServerAndPath.length) {
        return undefined;
      }

      pathName = matchedServerAndPath[0].pathName;
      targetServer = {
        ...matchedServerAndPath[0].matchedServer,
      };
    }

    if (pathName === undefined) return undefined;
    if (pathName === '') pathName = '/';
    if (!paths || !targetServer) return undefined;
    const annotatedPaths = generatePathMatches(paths, pathName, targetServer.url);
    if (!annotatedPaths.length) return undefined;

    return annotatedPaths;
  }

  /**
   * Discover an operation in an OAS from a fully-formed URL and HTTP method. Will return an object
   * containing a `url` object and another one for `operation`. This differs from `getOperation()`
   * in that it does not return an instance of the `Operation` class.
   *
   * @param url A full URL to look up.
   * @param method The cooresponding HTTP method to look up.
   */
  findOperation(url: string, method: HttpMethods): PathMatch | undefined {
    const annotatedPaths = this.findOperationMatches(url);
    if (!annotatedPaths) {
      return undefined;
    }

    const matches = filterPathMethods(annotatedPaths, method);
    if (!matches.length) return undefined;
    return findTargetPath(matches);
  }

  /**
   * Discover an operation in an OAS from a fully-formed URL without an HTTP method. Will return an
   * object containing a `url` object and another one for `operation`.
   *
   * @param url A full URL to look up.
   */
  findOperationWithoutMethod(url: string): PathMatch | undefined {
    const annotatedPaths = this.findOperationMatches(url);
    if (!annotatedPaths) {
      return undefined;
    }

    return findTargetPath(annotatedPaths);
  }

  /**
   * Retrieve an operation in an OAS from a fully-formed URL and HTTP method. Differs from
   * `findOperation` in that while this method will return an `Operation` instance,
   * `findOperation()` does not.
   *
   * @param url A full URL to look up.
   * @param method The cooresponding HTTP method to look up.
   */
  getOperation(url: string, method: HttpMethods): Operation | undefined {
    const op = this.findOperation(url, method);
    if (op === undefined) {
      return undefined;
    }

    return this.operation(op.url.nonNormalizedPath, method);
  }

  /**
   * Retrieve an operation in an OAS by an `operationId`.
   *
   * If an operation does not have an `operationId` one will be generated in place, using the
   * default behavior of `Operation.getOperationId()`, and then asserted against your query.
   *
   * Note that because `operationId`s are unique that uniqueness does include casing so the ID
   * you are looking for will be asserted as an exact match.
   *
   * @see {Operation.getOperationId()}
   * @param id The `operationId` to look up.
   */
  getOperationById(id: string): Operation | Webhook | undefined {
    let found: Operation | Webhook | undefined;

    Object.values(this.getPaths()).forEach(operations => {
      if (found) return;
      found = Object.values(operations).find(operation => operation.getOperationId() === id);
    });

    if (found) {
      return found;
    }

    Object.entries(this.getWebhooks()).forEach(([, webhooks]) => {
      if (found) return;
      found = Object.values(webhooks).find(webhook => webhook.getOperationId() === id);
    });

    return found;
  }

  /**
   * With an object of user information, retrieve the appropriate API auth keys from the current
   * OAS definition.
   *
   * @see {@link https://docs.readme.com/docs/passing-data-to-jwt}
   * @param user User
   * @param selectedApp The user app to retrieve an auth key for.
   */
  getAuth(user: User, selectedApp?: number | string): AuthForHAR {
    if (!this.api?.components?.securitySchemes) {
      return {};
    }

    return getAuth(this.api, user, selectedApp);
  }

  /**
   * Returns the `paths` object that exists in this API definition but with every `method` mapped
   * to an instance of the `Operation` class.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#openapi-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#openapi-object}
   */
  getPaths(): Record<string, Record<HttpMethods, Operation | Webhook>> {
    const paths: Record<string, Record<HttpMethods, Operation | Webhook>> = {};
    if (!this.api.paths) {
      return paths;
    }

    Object.keys(this.api.paths).forEach(path => {
      // If this is a specification extension then we should ignore it.
      if (path.startsWith('x-')) {
        return;
      }

      paths[path] = {} as Record<HttpMethods, Operation | Webhook>;

      // biome-ignore-start lint/style/noNonNullAssertion: We're guaranteed to have `api.paths[path]` from the `.keys()` loop.
      const pathItem = this.api.paths![path];
      if (!pathItem) {
        return;
      } else if (isRef(pathItem)) {
        // Though this library is generally unaware of `$ref` pointers we're making a singular
        // exception with this accessor out of convenience.
        this.api.paths![path] = dereferenceRef(pathItem, this.api);
      }

      Object.keys(pathItem).forEach(method => {
        /**
         * Because a path doesn't need to contain a keyed-object of HTTP methods, we should exclude
         * anything from within the paths object that isn't a known HTTP method.
         *
         * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#fixed-fields-7}
         * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#fixed-fields-7}
         */
        if (!supportedMethods.includes(method as HttpMethods)) {
          return;
        }

        paths[path][method as HttpMethods] = this.operation(path, method as HttpMethods);
      });
      // biome-ignore-end lint/style/noNonNullAssertion: --end--
    });

    return paths;
  }

  /**
   * Returns the `webhooks` object that exists in this API definition but with every `method`
   * mapped to an instance of the `Webhook` class.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#openapi-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#openapi-object}
   */
  getWebhooks(): Record<string, Record<HttpMethods, Webhook>> {
    const webhooks: Record<string, Record<HttpMethods, Webhook>> = {};
    if (!isOpenAPI31(this.api) || !this.api.webhooks) {
      return webhooks;
    }

    Object.keys(this.api.webhooks).forEach(id => {
      webhooks[id] = {} as Record<HttpMethods, Webhook>;

      const webhookPath = dereferenceRef((this.api as OpenAPIV3_1.Document).webhooks?.[id], this.api);
      if (webhookPath) {
        Object.keys(webhookPath).forEach(method => {
          if (!supportedMethods.includes(method as HttpMethods)) {
            return;
          }

          webhooks[id][method as HttpMethods] = this.operation(id, method as HttpMethods, {
            isWebhook: true,
          }) as Webhook;
        });
      }
    });

    return webhooks;
  }

  /**
   * Return an array of all tag names that exist on this API definition.
   *
   * If the API definition uses the `x-disable-tag-sorting` extension then tags will be returned in
   * the order they're defined.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#openapi-object}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#openapi-object}
   * @param setIfMissing If a tag is not present on an operation that operations path will be added
   *    into the list of tags returned.
   */
  getTags(setIfMissing = false): string[] {
    const allTags = new Set<string>();

    const oasTags = this.api.tags?.map(tag => tag.name) || [];

    const disableTagSorting = getExtension('disable-tag-sorting', this.api);

    Object.entries(this.getPaths()).forEach(([path, operations]) => {
      Object.values(operations).forEach(operation => {
        const tags = operation.getTags();
        if (setIfMissing && !tags.length) {
          allTags.add(path);
          return;
        }

        tags.forEach(tag => {
          allTags.add(tag.name);
        });
      });
    });

    Object.entries(this.getWebhooks()).forEach(([path, webhooks]) => {
      Object.values(webhooks).forEach(webhook => {
        const tags = webhook.getTags();
        if (setIfMissing && !tags.length) {
          allTags.add(path);
          return;
        }

        tags.forEach(tag => {
          allTags.add(tag.name);
        });
      });
    });

    // Tags that exist only on the endpoint
    const endpointTags: string[] = [];
    // Tags that the user has defined in the `tags` array
    const tagsArray: string[] = [];

    // Distinguish between which tags exist in the `tags` array and which tags
    // exist only at the endpoint level. For tags that exist only at the
    // endpoint level, we'll just tack that on to the end of the sorted tags.
    if (disableTagSorting) {
      return Array.from(allTags);
    }

    Array.from(allTags).forEach(tag => {
      if (oasTags.includes(tag)) {
        tagsArray.push(tag);
      } else {
        endpointTags.push(tag);
      }
    });

    let sortedTags = tagsArray.sort((a, b) => {
      return oasTags.indexOf(a) - oasTags.indexOf(b);
    });

    sortedTags = sortedTags.concat(endpointTags);

    return sortedTags;
  }

  /**
   * Determine if a given a custom specification extension exists within the API definition.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#specification-extensions}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specification-extensions}
   * @param extension Specification extension to lookup.
   */
  hasExtension(extension: string): boolean {
    return hasRootExtension(extension, this.api);
  }

  /**
   * Retrieve a custom specification extension off of the API definition.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#specification-extensions}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specification-extensions}
   * @param extension Specification extension to lookup.
   */
  getExtension(extension: string | keyof Extensions, operation?: Operation): any {
    return getExtension(extension, this.api, operation);
  }

  /**
   * Determine if a given OpenAPI custom extension is valid or not.
   *
   * @see {@link https://docs.readme.com/docs/openapi-extensions}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#specification-extensions}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specification-extensions}
   * @param extension Specification extension to validate.
   * @throws
   */
  validateExtension(extension: keyof Extensions): void {
    if (this.hasExtension('x-readme')) {
      const data = this.getExtension('x-readme') satisfies Extensions;
      if (typeof data !== 'object' || Array.isArray(data) || data === null) {
        throw new TypeError('"x-readme" must be of type "Object"');
      }

      if (extension in data) {
        if ([CODE_SAMPLES, HEADERS, PARAMETER_ORDERING, SAMPLES_LANGUAGES].includes(extension)) {
          if (data[extension] !== undefined) {
            if (!Array.isArray(data[extension])) {
              throw new TypeError(`"x-readme.${extension}" must be of type "Array"`);
            }

            if (extension === PARAMETER_ORDERING) {
              validateParameterOrdering(data[extension], `x-readme.${extension}`);
            }
          }
        } else if (extension === OAUTH_OPTIONS) {
          if (typeof data[extension] !== 'object') {
            throw new TypeError(`"x-readme.${extension}" must be of type "Object"`);
          }
        } else if (typeof data[extension] !== 'boolean') {
          throw new TypeError(`"x-readme.${extension}" must be of type "Boolean"`);
        }
      }
    }

    // If the extension isn't grouped under `x-readme`, we need to look for them with `x-` prefixes.
    if (this.hasExtension(`x-${extension}`)) {
      const data = this.getExtension(`x-${extension}`);
      if ([CODE_SAMPLES, HEADERS, PARAMETER_ORDERING, SAMPLES_LANGUAGES].includes(extension)) {
        if (!Array.isArray(data)) {
          throw new TypeError(`"x-${extension}" must be of type "Array"`);
        }

        if (extension === PARAMETER_ORDERING) {
          validateParameterOrdering(data, `x-${extension}`);
        }
      } else if (extension === OAUTH_OPTIONS) {
        if (typeof data !== 'object') {
          throw new TypeError(`"x-${extension}" must be of type "Object"`);
        }
      } else if (typeof data !== 'boolean') {
        throw new TypeError(`"x-${extension}" must be of type "Boolean"`);
      }
    }
  }

  /**
   * Validate all of our custom or known OpenAPI extensions, throwing exceptions when necessary.
   *
   * @see {@link https://docs.readme.com/docs/openapi-extensions}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#specification-extensions}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specification-extensions}
   */
  validateExtensions(): void {
    Object.keys(extensionDefaults).forEach(extension => {
      this.validateExtension(extension as keyof Extensions);
    });
  }

  /**
   * Retrieve any circular `$ref` pointers that maybe present within the API definition.
   *
   * This method requires that you first dereference the definition.
   *
   * @see Oas.dereference
   */
  getCircularReferences(): string[] {
    if (!this.dereferencing.complete) {
      throw new Error('.dereference() must be called first in order for this method to obtain circular references.');
    }

    return this.dereferencing.circularRefs;
  }

  /**
   * Dereference the current OAS definition so it can be parsed free of worries of `$ref` schemas
   * and circular structures.
   *
   */
  async dereference(
    opts: {
      /**
       * A callback method can be supplied to be called when dereferencing is complete. Used for
       * debugging that the multi-promise handling within this method works.
       *
       * @private
       */
      cb?: () => void;

      /**
       * Preserve component schema names within themselves as a `title`.
       */
      preserveRefAsJSONSchemaTitle?: boolean;
    } = { preserveRefAsJSONSchemaTitle: false },
  ): Promise<(typeof this.promises)[] | boolean> {
    if (this.dereferencing.complete) {
      return new Promise(resolve => {
        resolve(true);
      });
    }

    if (this.dereferencing.processing) {
      return new Promise((resolve, reject) => {
        this.promises.push({ resolve, reject });
      });
    }

    this.dereferencing.processing = true;

    /**
     * Find `discriminator` schemas and their children before dereferencing (`allOf` `$ref` pointers
     * are resolved during dereferencing). For schemas with a `discriminator` using `allOf`
     * inheritance we build a `oneOf` array from the discovered child schemas so consumers can see
     * the full set of polymorphic options.
     *
     * @see {@link https://spec.openapis.org/oas/v3.0.0.html#fixed-fields-20}
     */
    const { children: discriminatorChildrenMap } = findDiscriminatorChildren(this.api);

    const { api, promises } = this;

    // Because referencing will eliminate any lineage back to the original `$ref`, information that
    // we might need at some point, we should run through all available component schemas and denote
    // what their name is so that when dereferencing happens below those names will be preserved.
    if (api?.components?.schemas && typeof api.components.schemas === 'object') {
      Object.keys(api.components.schemas).forEach(schemaName => {
        // As of OpenAPI 3.1 component schemas can be primitives or arrays. If this happens then we
        // shouldn't try to add `title` or `x-readme-ref-name` properties because we can't. We'll
        // have some data loss on these schemas but as they aren't objects they likely won't be used
        // in ways that would require needing a `title` or `x-readme-ref-name` anyways.
        if (
          isPrimitive(api.components?.schemas?.[schemaName]) ||
          Array.isArray(api.components?.schemas?.[schemaName]) ||
          api.components?.schemas?.[schemaName] === null
        ) {
          return;
        }

        if (opts.preserveRefAsJSONSchemaTitle) {
          // This may result in some data loss if there's already a `title` present, but in the case
          // where we want to generate code for the API definition (see http://npm.im/api), we'd
          // prefer to retain original reference name as a title for any generated types.
          (api.components?.schemas?.[schemaName] as SchemaObject).title = schemaName;
        }

        (api.components?.schemas?.[schemaName] as SchemaObject)['x-readme-ref-name'] = schemaName;
      });
    }

    const circularRefs: Set<string> = new Set();
    const dereferencingOptions = getDereferencingOptions(circularRefs);

    return dereference<OASDocument>(api, dereferencingOptions)
      .then((dereferenced: OASDocument) => {
        this.api = dereferenced;

        // Construct `oneOf` arrays for `discriminator` schemas using their dereferenced child
        // schemas. This must be done **after** dereferencing so we have the fully resolved child
        // schemas.
        if (this.api?.components?.schemas && discriminatorChildrenMap.size > 0) {
          buildDiscriminatorOneOf(this.api, discriminatorChildrenMap);
        }

        this.promises = promises;
        this.dereferencing = {
          processing: false,
          complete: true,
          // We need to convert our `Set` to an array in order to match the typings.
          circularRefs: [...circularRefs],
        };

        // Used for debugging that dereferencing promise awaiting works.
        if (opts.cb) {
          opts.cb();
        }
      })
      .then(() => {
        return this.promises.map(deferred => deferred.resolve());
      })
      .catch(err => {
        this.dereferencing.processing = false;
        this.promises.map(deferred => deferred.reject(err));
        throw err;
      });
  }
}
