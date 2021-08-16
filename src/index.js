const $RefParser = require('@apidevtools/json-schema-ref-parser');
const { pathToRegexp, match } = require('path-to-regexp');
const getAuth = require('./lib/get-auth');
const getPathOperation = require('./lib/get-path-operation');
const getUserVariable = require('./lib/get-user-variable');
const Operation = require('./operation');

function ensureProtocol(url) {
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

function stripTrailingSlash(url) {
  if (url[url.length - 1] === '/') {
    return url.slice(0, -1);
  }

  return url;
}

function normalizedUrl(oas, selected) {
  const exampleDotCom = 'https://example.com';
  let url;
  try {
    url = oas.servers[selected].url;
    // This is to catch the case where servers = [{}]
    if (!url) throw new Error('no url');

    // Stripping the '/' off the end
    url = stripTrailingSlash(url);

    // RM-1044 Check if the URL is just a path a missing an origin, for example `/api/v3`
    // If so, then make example.com the origin to avoid it becoming something invalid like https:///api/v3
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
 * With a URL that may contain server variables, transform those server variables into regex that we can query against.
 *
 * For example, when given `https://{region}.node.example.com/v14` this will return back:
 *
 *    https://([-_a-zA-Z0-9[\\]]+).node.example.com/v14
 *
 * @param {String} url
 * @returns {String}
 */
function transformUrlIntoRegex(url) {
  return stripTrailingSlash(url.replace(/{([-_a-zA-Z0-9[\]]+)}/g, '([-_a-zA-Z0-9[\\]]+)'));
}

function normalizePath(path) {
  // In addition to transforming `{pathParam}` into `:pathParam` we also need to escape cases where a non-variabled
  // colon is next to a variabled-colon because if we don't `path-to-regexp` won't be able to correct identify where the
  // variable starts.
  //
  // For example if the URL is `/post/:param1::param2` we'll be escaping it to `/post/:param1\::param2`.
  return (
    path
      .replace(/{(.*?)}/g, ':$1')
      .replace(/::/, '\\::')
      // Need to escape question marks too because they're treated as regex modifiers in `path-to-regexp`
      .split('?')[0]
  );
}

function generatePathMatches(paths, pathName, origin) {
  const prunedPathName = pathName.split('?')[0];
  return Object.keys(paths)
    .map(path => {
      const cleanedPath = normalizePath(path);
      const matchStatement = match(cleanedPath, { decode: decodeURIComponent });
      const matchResult = matchStatement(prunedPathName);
      const slugs = {};

      if (matchResult && Object.keys(matchResult.params).length) {
        Object.keys(matchResult.params).forEach(param => {
          slugs[`:${param}`] = matchResult.params[param];
        });
      }

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
    .filter(p => p.match);
}

function filterPathMethods(pathMatches, targetMethod) {
  const regExp = pathToRegexp(targetMethod);
  return pathMatches
    .map(p => {
      const captures = Object.keys(p.operation).filter(r => regExp.exec(r));

      if (captures.length) {
        const method = captures[0];
        p.url.method = method.toUpperCase();

        return {
          url: p.url,
          operation: p.operation[method],
        };
      }
      return undefined;
    })
    .filter(p => p);
}

function findTargetPath(pathMatches) {
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

class Oas {
  constructor(oas, user) {
    Object.assign(this, oas);
    this.user = user || {};

    this._promises = [];
    this._dereferencing = {
      processing: false,
      complete: false,
    };
  }

  url(selected = 0, variables) {
    const url = normalizedUrl(this, selected);
    return this.replaceUrl(url, variables || this.variables(selected)).trim();
  }

  variables(selected = 0) {
    let variables;
    try {
      variables = this.servers[selected].variables;
      if (!variables) throw new Error('no variables');
    } catch (e) {
      variables = {};
    }

    return variables;
  }

  defaultVariables(selected = 0) {
    const variables = this.variables(selected);
    const defaults = {};

    Object.keys(variables).forEach(key => {
      defaults[key] = getUserVariable(this.user, key) || variables[key].default || '';
    });

    return defaults;
  }

  // Taken from here: https://github.com/readmeio/readme/blob/09ab5aab1836ec1b63d513d902152aa7cfac6e4d/packages/explorer/src/PathUrl.jsx#L9-L22
  splitUrl(selected = 0) {
    const url = normalizedUrl(this, selected);
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

        // I wanted to do this here but due to us not
        // babelifying node_modules and not committing ./.tooling
        // to git, I'm just gunna do this for now so I can
        // get on with my life!
        //
        // const variable = variables?.[value]
        const variable = variables[value] || {};

        return {
          type: 'variable',
          value,
          key,
          description: variable.description,
          enum: variable.enum,
        };
      });
  }

  /**
   * With a fully composed server URL, run through our list of known OAS servers and return back which server URL was
   * selected along with any contained server variables split out.
   *
   * For example, if you have an OAS server URL of `https://{name}.example.com:{port}/{basePath}`, and pass in
   * `https://buster.example.com:3000/pet` to this function, you'll get back the following:
   *
   *    { selected: 0, variables: { name: 'buster', port: 3000, basePath: 'pet' } }
   *
   * Re-supplying this data to `oas.url()` should return the same URL you passed into this method.
   *
   * @param {String} baseUrl
   * @returns {Object|Boolean}
   */
  splitVariables(baseUrl) {
    const matchedServer = (this.servers || [])
      .map((server, i) => {
        const rgx = transformUrlIntoRegex(server.url);
        const found = new RegExp(rgx).exec(baseUrl);
        if (!found) {
          return false;
        }

        // While it'd be nice to use named regex groups to extract path parameters from the URL and match them up with
        // the variables that we have present in it, JS unfortunately doesn't support having the groups duplicated. So
        // instead of doing that we need to re-regex the server URL, this time splitting on the path parameters -- this
        // way we'll be able to extract the parameter names and match them up with the matched server that we obtained
        // above.
        const variables = {};
        [...server.url.matchAll(/{([-_a-zA-Z0-9[\]]+)}/g)].forEach((variable, y) => {
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
   *  - If data is stored in `this.user` and it matches up with the variable name in the URL user data
   *    will always take priority. See `getUserVariable` for some more information on how this data is pulled from
   *    `this.user`.
   *  - Supplying a `variables` object. This incoming `variables` object can be two formats:
   *    `{ variableName: { default: 'value' } }` and `{ variableName: 'value' }`. If the former is present, that will
   *    take prescendence over the latter.
   *
   * If no variables supplied match up with the template name, the template name will instead be used as the variable
   * data.
   *
   * @param {String} url
   * @param {Object} variables
   * @returns String
   */
  replaceUrl(url, variables = {}) {
    // When we're constructing URLs, server URLs with trailing slashes cause problems with doing lookups, so if we have
    // one here on, slice it off.
    return stripTrailingSlash(
      url.replace(/{([-_a-zA-Z0-9[\]]+)}/g, (original, key) => {
        if (getUserVariable(this.user, key)) {
          return getUserVariable(this.user, key);
        }

        if (key in variables) {
          if (typeof variables[key] === 'object') {
            if (!Array.isArray(variables[key]) && variables[key] !== null && 'default' in variables[key]) {
              return variables[key].default;
            }
          } else {
            return variables[key];
          }
        }

        return original;
      })
    );
  }

  operation(path, method) {
    const operation = getPathOperation(this, { swagger: { path }, api: { method } });
    // If `getPathOperation` wasn't able to find the operation in the API definition, we should still set an empty
    // schema on the operation in the `Operation` class because if we don't trying to use any of the accessors on that
    // class are going to fail as `schema` will be `undefined`.
    return new Operation(this, path, method, operation || {});
  }

  findOperationMatches(url) {
    const { origin, hostname } = new URL(url);
    const originRegExp = new RegExp(origin, 'i');
    const { servers, paths } = this;

    let pathName;
    let targetServer;
    let matchedServer;

    if (!servers || !servers.length) {
      // If this API definition doesn't have any servers set up let's treat it as if it were https://example.com because
      // that's the default origin we add in `normalizedUrl` under the same circumstances. Without this we won't be able
      // to match paths within what is otherwise a valid OpenAPI definition.
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

    // If we **still** haven't found a matching server, then the OAS server URL might have server variables and we
    // should loosen it up with regex to try to discover a matching path.
    //
    // For example if an OAS has `https://{region}.node.example.com/v14` set as its server URL, and the `this.user`
    // object has a `region` value of `us`, if we're trying to locate an operation for
    // https://eu.node.example.com/v14/api/esm we won't be able to because normally the users `region` of `us` will be
    // transposed in and we'll be trying to locate `eu.node.example.com` in `us.node.example.com` -- which won't work.
    //
    // So what this does is transform `https://{region}.node.example.com/v14` into
    // `https://([-_a-zA-Z0-9[\\]]+).node.example.com/v14`, and from there we'll be able to match
    // https://eu.node.example.com/v14/api/esm and ultimately find the operation matches for `/api/esm`.
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
        .filter(Boolean);

      if (!matchedServerAndPath.length) {
        return undefined;
      }

      pathName = matchedServerAndPath[0].pathName;
      targetServer = {
        ...matchedServerAndPath[0].matchedServer,
      };
    } else {
      // Instead of setting `url` directly against `matchedServer` we need to set it to an intermediary object as
      // directly modifying `matchedServer.url` will in turn update `this.servers[idx].url` which we absolutely do not
      // want to happen.
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
   * Discover an operation in an OAS from a fully-formed URL and HTTP method. Will return an object containing a `url`
   * object and another one for `operation`. This differs from `getOperation()` in that it does not return an instance
   * of the `Operation` class.
   *
   * @param {String} url
   * @param {String} method
   * @return {(Object|undefined)}
   */
  findOperation(url, method) {
    const annotatedPaths = this.findOperationMatches(url);
    if (!annotatedPaths) {
      return undefined;
    }

    const includesMethod = filterPathMethods(annotatedPaths, method);
    if (!includesMethod.length) return undefined;
    return findTargetPath(includesMethod);
  }

  /**
   * Discover an operation in an OAS from a fully-formed URL without an HTTP method. Will return an object containing a `url`
   * object and another one for `operation`.
   *
   * @param {String} url
   * @return {(Object|undefined)}
   */
  findOperationWithoutMethod(url) {
    const annotatedPaths = this.findOperationMatches(url);
    if (!annotatedPaths) {
      return undefined;
    }
    return findTargetPath(annotatedPaths);
  }

  /**
   * Retrieve an operation in an OAS from a fully-formed URL and HTTP method. Differs from `findOperation` in that while
   * this method will return an `Operation` instance, `findOperation()` does not.
   *
   * @param {String} url
   * @param {String} method
   * @return {(Operation|undefined)}
   */
  getOperation(url, method) {
    const op = this.findOperation(url, method);
    if (op === undefined) {
      return undefined;
    }

    return this.operation(op.url.nonNormalizedPath, method);
  }

  /**
   * With an object of user information, retrieve an appropriate API key from the current OAS definition.
   *
   * @link https://docs.readme.com/docs/passing-data-to-jwt
   * @param {Object} user
   * @param {Boolean|String} selectedApp
   * @return {Object}
   */
  getAuth(user, selectedApp = false) {
    if (
      Object.keys(this.components || {}).length === 0 ||
      Object.keys(this.components.securitySchemes || {}).length === 0
    ) {
      return {};
    }

    return getAuth(this, user, selectedApp);
  }

  /**
   * Dereference the current OAS definition so it can be parsed free of worries of `$ref` schemas and circular
   * structures.
   *
   * @returns {Promise<void>}
   */
  async dereference() {
    if (this._dereferencing.complete) {
      return new Promise(resolve => resolve());
    }

    if (this._dereferencing.processing) {
      return new Promise((resolve, reject) => {
        this._promises.push({ resolve, reject });
      });
    }

    this._dereferencing.processing = true;

    // Extract non-OAS properties that are on the class so we can supply only the OAS to the ref parser.
    const { _dereferencing, _promises, user, ...oas } = this;

    // Because referencing will eliminate any lineage back to the original `$ref`, information that we might need at
    // some point, we should run through all available component schemas and denote what their name is so that when
    // dereferencing happens below those names will be preserved.
    if (oas && oas.components && oas.components.schemas && typeof oas.components.schemas === 'object') {
      Object.keys(oas.components.schemas).forEach(schemaName => {
        oas.components.schemas[schemaName]['x-readme-ref-name'] = schemaName;
      });
    }

    return $RefParser
      .dereference(oas, {
        resolve: {
          // We shouldn't be resolving external pointers at this point so just ignore them.
          external: false,
        },
        dereference: {
          // If circular `$refs` are ignored they'll remain in the OAS as `$ref: String`, otherwise `$ref‘ just won't
          // exist. This allows us to do easy circular reference detection.
          circular: 'ignore',
        },
      })
      .then(dereferenced => {
        Object.assign(this, dereferenced);
        this.user = user;

        this._promises = _promises;
        this._dereferencing = {
          processing: false,
          complete: true,
        };
      })
      .then(() => {
        return this._promises.map(deferred => deferred.resolve());
      });
  }
}

module.exports = Oas;
module.exports.Operation = Operation;
