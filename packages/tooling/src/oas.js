const { pathToRegexp, match } = require('path-to-regexp');
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

function normalizedUrl(oas) {
  let url;
  try {
    url = oas.servers[0].url;
    // This is to catch the case where servers = [{}]
    if (!url) throw new Error('no url');

    // Stripping the '/' off the end
    url = stripTrailingSlash(url);
  } catch (e) {
    url = 'https://example.com';
  }

  return ensureProtocol(url);
}

function normalizePath(path) {
  return path.replace(/{(.*?)}/g, ':$1');
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
          path: cleanedPath,
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
  }

  url() {
    const url = normalizedUrl(this);

    let variables;
    try {
      variables = this.servers[0].variables;
      if (!variables) throw new Error('no variables');
    } catch (e) {
      variables = {};
    }

    return this.replaceUrl(url, variables).trim();
  }

  replaceUrl(url, variables) {
    // When we're constructing URLs, server URLs with trailing slashes cause problems with doing lookups, so if we have
    // one here on, slice it off.
    return stripTrailingSlash(
      url.replace(/{([-_a-zA-Z0-9[\]]+)}/g, (original, key) => {
        if (getUserVariable(this.user, key)) return getUserVariable(this.user, key);
        return variables[key] ? variables[key].default : original;
      })
    );
  }

  operation(path, method) {
    const operation = getPathOperation(this, { swagger: { path }, api: { method } });
    return new Operation(this, path, method, operation);
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
    const { origin } = new URL(url);
    const originRegExp = new RegExp(origin);
    const { servers, paths } = this;

    if (!servers || !servers.length) return undefined;
    const targetServer = servers.find(s => originRegExp.exec(this.replaceUrl(s.url, s.variables || {})));
    if (!targetServer) return undefined;
    targetServer.url = this.replaceUrl(targetServer.url, targetServer.variables || {});

    const [, pathName] = url.split(targetServer.url);
    if (pathName === undefined) return undefined;
    const annotatedPaths = generatePathMatches(paths, pathName, targetServer.url);
    if (!annotatedPaths.length) return undefined;

    const includesMethod = filterPathMethods(annotatedPaths, method);
    if (!includesMethod.length) return undefined;

    return findTargetPath(includesMethod);
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
}

module.exports = Oas;
module.exports.Operation = Operation;
