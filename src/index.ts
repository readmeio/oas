import type * as RMOAS from './rmoas.types';
import type { OpenAPIV3_1 } from 'openapi-types';
import type { MatchResult } from 'path-to-regexp';

import $RefParser from '@readme/json-schema-ref-parser';
import { pathToRegexp, match } from 'path-to-regexp';

import getAuth from './lib/get-auth';
import getUserVariable from './lib/get-user-variable';
import Operation, { Callback, Webhook } from './operation';
import utils, { supportedMethods } from './utils';

type PathMatch = {
  url: {
    origin: string;
    path: string;
    nonNormalizedPath: string;
    slugs: Record<string, string>;
    method?: RMOAS.HttpMethods;
  };
  operation: RMOAS.PathsObject;
  match?: MatchResult;
};
type PathMatches = PathMatch[];

type Variables = Record<string, string | number | { default?: string | number }[] | { default?: string | number }>;

const SERVER_VARIABLE_REGEX = /{([-_a-zA-Z0-9:.[\]]+)}/g;

function ensureProtocol(url: string) {
  // Add protocol to urls starting with // e.g. //example.com
  // This is because httpsnippet throws a HARError when it doesnt have a protocol
  if (url.match(/^\/\//)) {
    return `https:${url}`;
  }

  // Add protocol to urls with no // within them
  // This is because httpsnippet throws a HARError when it doesnt have a protocol
  if (!url.match(/\/\//)) {
    return `https://${url}`;
  }

  return url;
}

function stripTrailingSlash(url: string) {
  if (url[url.length - 1] === '/') {
    return url.slice(0, -1);
  }

  return url;
}

/**
 * Normalize a OpenAPI server URL by ensuring that it has a proper HTTP protocol and doesn't have a
 * trailing slash.
 *
 * @param api The API definition that we're processing.
 * @param selected The index of the `servers` array in the API definition that we want to normalize.
 */
function normalizedUrl(api: RMOAS.OASDocument, selected: number) {
  const exampleDotCom = 'https://example.com';
  let url;
  try {
    url = api.servers[selected].url;
    // This is to catch the case where servers = [{}]
    if (!url) throw new Error('no url');

    // Stripping the '/' off the end
    url = stripTrailingSlash(url);

    // Check if the URL is just a path a missing an origin, for example `/api/v3`. If so, then make
    // `example.com` the origin to avoid it becoming something invalid like `https:///api/v3`.
    // RM-1044
    if (url.startsWith('/') && !url.startsWith('//')) {
      const urlWithOrigin = new URL(exampleDotCom);
      urlWithOrigin.pathname = url;
      url = urlWithOrigin.href;
    }
  } catch (e) {
    url = exampleDotCom;
  }

  return ensureProtocol(url);
}

/**
 * With a URL that may contain server variables, transform those server variables into regex that
 * we can query against.
 *
 * For example, when given `https://{region}.node.example.com/v14` this will return back:
 *
 *    https://([-_a-zA-Z0-9:.[\\]]+).node.example.com/v14
 *
 * @param url URL to transform
 */
function transformUrlIntoRegex(url: string) {
  return stripTrailingSlash(url.replace(SERVER_VARIABLE_REGEX, '([-_a-zA-Z0-9:.[\\]]+)'));
}

/**
 * Normalize a path so that we can use it with `path-to-regexp` to do operation lookups.
 *
 * @param path Path to normalize.
 */
function normalizePath(path: string) {
  return (
    path
      // This regex transforms `{pathParam}` into `:pathParam` so we can regex against it. We're
      // also handling quirks here like if there's an optional proceeding or trailing curly bracket
      // (`{{pathParam}` or `{pathParam}}`) as any unescaped curlys, which would be present in
      // `:pathParam}`, will throw a regex exception.
      .replace(/({?){(.*?)}(}?)/g, function (str, ...args) {
        // If a path contains a path parameter with hyphens, like `:dlc-release`, when it's regexd
        // with `path-to-regexp` it match against the `:dlc` portion of the parameter, breaking all
        // matching against the full path.
        //
        // For example on `/games/:game/dlc/:dlc-release` the regex that's actually used to search
        // against a path like `/games/destiny-2/dlc/witch-queen` is the following:
        //    /^\/games(?:\/([^\/#\?]+?))\/dlc(?:\/([^\/#\?]+?))-release[\/#\?]?$/i
        //
        // However if `:dlc-release` is rewritten to `:dlcrelease` we end up with a functional
        // regex: /^\/games(?:\/([^\/#\?]+?))\/dlc(?:\/([^\/#\?]+?))[\/#\?]?$/i.
        return `:${args[1].replace('-', '')}`;
      })

      // In addition to transforming `{pathParam}` into `:pathParam` we also need to escape cases
      // where a non-variabled colon is next to a variabled-colon because if we don't then
      // `path-to-regexp` won't be able to correct identify where the variable starts.
      //
      // For example if the URL is `/post/:param1::param2` we'll be escaping it to
      // `/post/:param1\::param2`.
      .replace(/::/, '\\::')

      // We also need to escape question marks too because they're treated as regex modifiers.
      .split('?')[0]
  );
}

/**
 * Generate path matches for a given path and origin on a set of OpenAPI path objects.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#pathsObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#pathsObject}
 * @param paths The OpenAPI Paths Object to process.
 * @param pathName Path to look for a match.
 * @param origin The origin that we're matching against.
 */
function generatePathMatches(paths: RMOAS.PathsObject, pathName: string, origin: string) {
  const prunedPathName = pathName.split('?')[0];
  return Object.keys(paths)
    .map(path => {
      const cleanedPath = normalizePath(path);

      let matchResult: MatchResult;
      try {
        const matchStatement = match(cleanedPath, { decode: decodeURIComponent });
        matchResult = matchStatement(prunedPathName) as MatchResult;
      } catch (err) {
        // If path matching fails for whatever reason (maybe they have a malformed path parameter)
        // then we shouldn't also fail.
        return;
      }

      const slugs: Record<string, string> = {};

      if (matchResult && Object.keys(matchResult.params).length) {
        Object.keys(matchResult.params).forEach(param => {
          slugs[`:${param}`] = (matchResult.params as Record<string, string>)[param];
        });
      }

      // eslint-disable-next-line consistent-return
      return {
        url: {
          origin,
          path: cleanedPath.replace(/\\::/, '::'),
          nonNormalizedPath: path,
          slugs,
        },
        operation: paths[path],
        match: matchResult,
      };
    })
    .filter(Boolean)
    .filter(p => p.match) as PathMatches;
}

/**
 * @param pathMatches Array of path matches to filter down.
 * @param targetMethod HTTP method to look for.
 * @returns Filtered down path matches.
 */
function filterPathMethods(pathMatches: PathMatches, targetMethod: RMOAS.HttpMethods) {
  const regExp = pathToRegexp(targetMethod);
  return pathMatches
    .map(p => {
      const captures = Object.keys(p.operation).filter(r => regExp.exec(r));

      if (captures.length) {
        const method = captures[0];
        p.url.method = method.toUpperCase() as RMOAS.HttpMethods;

        return {
          url: p.url,
          operation: p.operation[method],
        };
      }

      return false;
    })
    .filter(Boolean) as { url: PathMatch['url']; operation: RMOAS.OperationObject }[];
}

/**
 * @param pathMatches URL and PathsObject matches to narrow down to find a target path.
 * @returns An object containing matches that were discovered in the API definition.
 */
function findTargetPath(pathMatches: { url: PathMatch['url']; operation: RMOAS.PathsObject }[]) {
  let minCount = Object.keys(pathMatches[0].url.slugs).length;
  let operation;

  for (let m = 0; m < pathMatches.length; m += 1) {
    const selection = pathMatches[m];
    const paramCount = Object.keys(selection.url.slugs).length;
    if (paramCount <= minCount) {
      minCount = paramCount;
      operation = selection;
    }
  }

  return operation;
}

export default class Oas {
  /**
   * An OpenAPI API Definition.
   */
  api: RMOAS.OASDocument;

  /**
   * The current user that we should use when pulling auth tokens from security schemes.
   */
  user: RMOAS.User;

  /**
   * Internal storage array that the library utilizes to keep track of the times the
   * {@see Oas.dereference} has been called so that if you initiate multiple promises they'll all
   * end up returning the same data set once the initial dereference call completed.
   */
  protected promises: {
    resolve: any;
    reject: any;
  }[];

  /**
   * Internal storage array that the library utilizes to keep track of its `dereferencing` state so
   * it doesn't initiate multiple dereferencing processes.
   */
  protected dereferencing: {
    processing: boolean;
    complete: boolean;
  };

  /**
   * @param oas An OpenAPI definition.
   * @param user The information about a user that we should use when pulling auth tokens from
   *    security schemes.
   */
  constructor(oas: RMOAS.OASDocument, user?: RMOAS.User) {
    // @todo throw an exception here instead of allowing an empty oas
    this.api = oas;
    this.user = user || {};

    this.promises = [];
    this.dereferencing = {
      processing: false,
      complete: false,
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
  static init(oas: Record<string, unknown> | RMOAS.OASDocument, user?: RMOAS.User) {
    return new Oas(oas as RMOAS.OASDocument, user);
  }

  /**
   * Retrieve the OpenAPI version that this API definition is targeted for.
   */
  getVersion() {
    if (this.api.openapi) {
      return this.api.openapi;
    }

    throw new Error('Unable to recognize what specification version this API definition conforms to.');
  }

  /**
   * Retrieve the current OpenAPI API Definition.
   *
   */
  getDefinition() {
    return this.api;
  }

  url(selected = 0, variables?: Variables) {
    const url = normalizedUrl(this.api, selected);
    return this.replaceUrl(url, variables || this.variables(selected)).trim();
  }

  variables(selected = 0) {
    let variables;
    try {
      variables = this.api.servers[selected].variables;
      if (!variables) throw new Error('no variables');
    } catch (e) {
      variables = {};
    }

    return variables;
  }

  defaultVariables(selected = 0) {
    const variables = this.variables(selected);
    const defaults: Record<string, unknown> = {};

    Object.keys(variables).forEach(key => {
      defaults[key] = getUserVariable(this.user, key) || variables[key].default || '';
    });

    return defaults;
  }

  splitUrl(selected = 0) {
    const url = normalizedUrl(this.api, selected);
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
  splitVariables(baseUrl: string) {
    const matchedServer = (this.api.servers || [])
      .map((server, i) => {
        const rgx = transformUrlIntoRegex(server.url);
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
        const variables: Record<string, string | number> = {};
        Array.from(server.url.matchAll(SERVER_VARIABLE_REGEX)).forEach((variable, y) => {
          variables[variable[1]] = found[y + 1];
        });

        return {
          selected: i,
          variables,
        };
      })
      .filter(Boolean);

    return matchedServer.length ? matchedServer[0] : false;
  }

  /**
   * Replace templated variables with supplied data in a given URL.
   *
   * There are a couple ways that this will utilize variable data:
   *
   *  - If data is stored in `this.user` and it matches up with the variable name in the URL user
   *    data will always take priority. See `getUserVariable` for some more information on how this
   *    data is pulled from `this.user`.
   *  - Supplying a `variables` object. This incoming `variables` object can be two formats:
   *    `{ variableName: { default: 'value' } }` and `{ variableName: 'value' }`. If the former is
   *    present, that will take prescendence over the latter.
   *
   * If no variables supplied match up with the template name, the template name will instead be
   * used as the variable data.
   *
   * @param url A URL to swap variables into.
   * @param variables An object containing variables to swap into the URL.
   */
  replaceUrl(url: string, variables: Variables = {}) {
    // When we're constructing URLs, server URLs with trailing slashes cause problems with doing
    // lookups, so if we have one here on, slice it off.
    return stripTrailingSlash(
      url.replace(SERVER_VARIABLE_REGEX, (original: string, key: string) => {
        const userVariable = getUserVariable(this.user, key);
        if (userVariable) {
          return userVariable as string;
        }

        if (key in variables) {
          const data = variables[key];
          if (typeof data === 'object') {
            if (!Array.isArray(data) && data !== null && 'default' in data) {
              return data.default as string;
            }
          } else {
            return data as string;
          }
        }

        return original;
      })
    );
  }

  /**
   * Retrieve an Operation of Webhook class instance for a given path and method.
   *
   * @param path Path to lookup and retrieve.
   * @param method HTTP Method to retrieve on the path.
   * @param opts Options
   * @param opts.isWebhook If you prefer to first look for a webhook with this path and method.
   */
  operation(path: string, method: RMOAS.HttpMethods, opts: { isWebhook?: boolean } = {}) {
    // If we're unable to locate an operation for this path+method combination within the API
    // definition, we should still set an empty schema on the operation in the `Operation` class
    // because if we don't trying to use any of the accessors on that class are going to fail as
    // `schema` will be `undefined`.
    let operation: RMOAS.OperationObject = {
      parameters: [],
    };

    if (opts.isWebhook) {
      const api = this.api as OpenAPIV3_1.Document;
      // Typecasting this to a `PathsObject` because we don't have `$ref` pointers here.
      if ((api?.webhooks[path] as RMOAS.PathsObject)?.[method]) {
        operation = (api.webhooks[path] as RMOAS.PathsObject)[method] as RMOAS.OperationObject;
        return new Webhook(api, path, method, operation);
      }
    }

    if (this?.api?.paths?.[path]?.[method]) {
      operation = this.api.paths[path][method];
    }

    return new Operation(this.api, path, method, operation);
  }

  findOperationMatches(url: string): PathMatches {
    const { origin, hostname } = new URL(url);
    const originRegExp = new RegExp(origin, 'i');
    const { servers, paths } = this.api;

    let pathName;
    let targetServer;
    let matchedServer;

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
    if (!matchedServer) {
      const matchedServerAndPath = servers
        .map(server => {
          const rgx = transformUrlIntoRegex(server.url);
          const found = new RegExp(rgx).exec(url);
          if (!found) {
            return false;
          }

          return {
            matchedServer: server,
            pathName: url.split(new RegExp(rgx)).slice(-1).pop(),
          };
        })
        .filter(Boolean) as { matchedServer: RMOAS.ServerObject; pathName: string }[];

      if (!matchedServerAndPath.length) {
        return undefined;
      }

      pathName = matchedServerAndPath[0].pathName;
      targetServer = {
        ...matchedServerAndPath[0].matchedServer,
      };
    } else {
      // Instead of setting `url` directly against `matchedServer` we need to set it to an
      // intermediary object as directly modifying `matchedServer.url` will in turn update
      // `this.servers[idx].url` which we absolutely do not want to happen.
      targetServer = {
        ...matchedServer,
        url: this.replaceUrl(matchedServer.url, matchedServer.variables || {}),
      };

      [, pathName] = url.split(new RegExp(targetServer.url, 'i'));
    }

    if (pathName === undefined) return undefined;
    if (pathName === '') pathName = '/';
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
  findOperation(url: string, method: RMOAS.HttpMethods): PathMatch {
    const annotatedPaths = this.findOperationMatches(url);
    if (!annotatedPaths) {
      return undefined;
    }

    const matches = filterPathMethods(annotatedPaths, method) as {
      url: PathMatch['url'];
      operation: RMOAS.PathsObject; // @fixme this should actually be an `OperationObject`.
    }[];
    if (!matches.length) return undefined;
    return findTargetPath(matches);
  }

  /**
   * Discover an operation in an OAS from a fully-formed URL without an HTTP method. Will return an
   * object containing a `url` object and another one for `operation`.
   *
   * @param url A full URL to look up.
   */
  findOperationWithoutMethod(url: string): PathMatch {
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
  getOperation(url: string, method: RMOAS.HttpMethods) {
    const op = this.findOperation(url, method);
    if (op === undefined) {
      return undefined;
    }

    return this.operation(op.url.nonNormalizedPath, method);
  }

  /**
   * With an object of user information, retrieve the appropriate API auth keys from the current
   * OAS definition.
   *
   * @see {@link https://docs.readme.com/docs/passing-data-to-jwt}
   * @param user User
   * @param selectedApp The user app to retrieve an auth key for.
   */
  getAuth(user: RMOAS.User, selectedApp?: string | number) {
    if (!this.api?.components?.securitySchemes) {
      return {};
    }

    return getAuth(this.api, user, selectedApp);
  }

  /**
   * Returns the `paths` object that exists in this API definition but with every `method` mapped
   * to an instance of the `Operation` class.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#oasObject}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#openapi-object}
   */
  getPaths() {
    /**
     * Because a path doesn't need to contain a keyed-object of HTTP methods, we should exclude
     * anything from within the paths object that isn't a known HTTP method.
     *
     * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#fixed-fields-7}
     * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#fixed-fields-7}
     */
    const paths: Record<string, Record<RMOAS.HttpMethods, Operation | Webhook>> = {};

    Object.keys(this.api.paths ? this.api.paths : []).forEach(path => {
      paths[path] = {} as Record<RMOAS.HttpMethods, Operation | Webhook>;

      // Though this library is generally unaware of `$ref` pointers we're making a singular
      // exception with this accessor out of convenience.
      if ('$ref' in this.api.paths[path]) {
        this.api.paths[path] = utils.findSchemaDefinition(this.api.paths[path].$ref, this.api);
      }

      Object.keys(this.api.paths[path]).forEach((method: RMOAS.HttpMethods) => {
        if (!supportedMethods.has(method)) return;

        paths[path][method] = this.operation(path, method);
      });
    });

    return paths;
  }

  /**
   * Returns the `webhooks` object that exists in this API definition but with every `method`
   * mapped to an instance of the `Operation` class.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#oasObject}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#openapi-object}
   */
  getWebhooks() {
    const webhooks: Record<string, Record<RMOAS.HttpMethods, Webhook>> = {};
    const api = this.api as OpenAPIV3_1.Document;

    Object.keys(api.webhooks ? api.webhooks : []).forEach(id => {
      webhooks[id] = {} as Record<RMOAS.HttpMethods, Webhook>;
      Object.keys(api.webhooks[id]).forEach((method: RMOAS.HttpMethods) => {
        webhooks[id][method] = this.operation(id, method, { isWebhook: true });
      });
    });

    return webhooks;
  }

  /**
   * Return an array of all tag names that exist on this API definition.
   *
   * Note: This method right now does **not** factor in webhooks that have tags.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#oasObject}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#openapi-object}
   * @param setIfMissing If a tag is not present on an operation that operations path will be added
   *    into the list of tags returned.
   */
  getTags(setIfMissing = false) {
    const allTags = new Set();

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

    return Array.from(allTags);
  }

  /**
   * Determine if a given a custom specification extension exists within the API definition.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#specificationExtensions}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specificationExtensions}
   * @param extension Specification extension to lookup.
   */
  hasExtension(extension: string) {
    return Boolean(this.api && extension in this.api);
  }

  /**
   * Retrieve a custom specification extension off of the API definition.
   *
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#specificationExtensions}
   * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specificationExtensions}
   * @param extension Specification extension to lookup.
   */
  getExtension(extension: string) {
    return this.api?.[extension];
  }

  /**
   * Dereference the current OAS definition so it can be parsed free of worries of `$ref` schemas
   * and circular structures.
   *
   * @param opts Options
   * @param opts.preserveRefAsJSONSchemaTitle Preserve component schema names within themselves as a `title`.
   */
  async dereference(opts = { preserveRefAsJSONSchemaTitle: false }) {
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

    const { api, promises } = this;

    // Because referencing will eliminate any lineage back to the original `$ref`, information that
    // we might need at some point, we should run through all available component schemas and denote
    // what their name is so that when dereferencing happens below those names will be preserved.
    if (api && api.components && api.components.schemas && typeof api.components.schemas === 'object') {
      Object.keys(api.components.schemas).forEach(schemaName => {
        if (opts.preserveRefAsJSONSchemaTitle) {
          // This may result in some data loss if there's already a `title` present, but in the case
          // where we want to generate code for the API definition (see http://npm.im/api), we'd
          // prefer to retain original reference name as a title for any generated types.
          (api.components.schemas[schemaName] as RMOAS.SchemaObject).title = schemaName;
        }

        (api.components.schemas[schemaName] as RMOAS.SchemaObject)['x-readme-ref-name'] = schemaName;
      });
    }

    return $RefParser
      .dereference(api || {}, {
        resolve: {
          // We shouldn't be resolving external pointers at this point so just ignore them.
          external: false,
        },
        dereference: {
          // If circular `$refs` are ignored they'll remain in the OAS as `$ref: String`, otherwise
          // `$ref‘ just won't exist. This allows us to do easy circular reference detection.
          circular: 'ignore',
        },
      })
      .then((dereferenced: RMOAS.OASDocument) => {
        this.api = dereferenced;

        this.promises = promises;
        this.dereferencing = {
          processing: false,
          complete: true,
        };
      })
      .then(() => {
        return this.promises.map(deferred => deferred.resolve());
      });
  }
}

export { Operation, Callback, Webhook, utils };
