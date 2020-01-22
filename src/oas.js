/* eslint-disable max-classes-per-file */
const { pathToRegexp, match } = require('path-to-regexp');
const getPathOperation = require('./lib/get-path-operation');
const getUserVariable = require('./lib/get-user-variable');

class Operation {
  constructor(oas, path, method, operation) {
    Object.assign(this, operation);
    this.oas = oas;
    this.path = path;
    this.method = method;
  }

  getSecurity() {
    return this.security || this.oas.security || [];
  }

  prepareSecurity() {
    const securityRequirements = this.getSecurity();

    return securityRequirements
      .map(requirement => {
        let keys;
        try {
          keys = Object.keys(requirement);
        } catch (e) {
          return false;
        }

        return keys.map(key => {
          let security;
          try {
            security = this.oas.components.securitySchemes[key];
          } catch (e) {
            return false;
          }

          if (!security) return false;
          let { type } = security;
          if (security.type === 'http') {
            if (security.scheme === 'basic') type = 'Basic';
            if (security.scheme === 'bearer') type = 'Bearer';
          } else if (security.type === 'oauth2') {
            type = 'OAuth2';
          } else if (security.type === 'apiKey' && security.in === 'query') {
            type = 'Query';
          } else if (security.type === 'apiKey' && security.in === 'header') {
            type = 'Header';
          } else {
            return false;
          }

          // eslint-disable-next-line no-underscore-dangle
          security._key = key;

          return { type, security };
        });
      })
      .reduce((prev, securities) => {
        securities.forEach(security => {
          // Remove non-existent schemes
          if (!security) return;
          if (!prev[security.type]) prev[security.type] = [];
          prev[security.type].push(security.security);
        });
        return prev;
      }, {});
  }
}

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

function normalizedUrl(oas) {
  let url;
  try {
    url = oas.servers[0].url;
    // This is to catch the case where servers = [{}]
    if (!url) throw new Error('no url');

    // Stripping the '/' off the end
    if (url[url.length - 1] === '/') {
      url = url.slice(0, -1);
    }
  } catch (e) {
    url = 'https://example.com';
  }

  return ensureProtocol(url);
}

function normalizePath(path) {
  return path.replace(/{(.*?)}/g, ':$1');
}

function generatePathMatches(paths, pathName, origin) {
  return Object.keys(paths)
    .map(path => {
      const cleanedPath = normalizePath(path);
      const matchStatement = match(cleanedPath, { decode: decodeURIComponent });
      const matchResult = matchStatement(pathName);
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
          slugs,
        },
        ref: paths[path],
        match: matchResult,
      };
    })
    .filter(p => p.match);
}

function filterPathMethods(pathMatches, targetMethod) {
  const regExp = pathToRegexp(targetMethod);
  return pathMatches
    .map(p => {
      const captures = Object.keys(p.ref).filter(r => regExp.exec(r));

      if (captures.length) {
        const method = captures[0];
        return {
          url: p.url,
          ref: p.ref[method],
        };
      }
      return undefined;
    })
    .filter(p => p);
}

function findTargetPath(pathMatches) {
  let minCount = Object.keys(pathMatches[0].url.slugs).length;
  let candidate;

  for (let m = 0; m < pathMatches.length; m += 1) {
    const selection = pathMatches[m];
    const paramCount = Object.keys(selection.url.slugs).length;
    if (paramCount <= minCount) {
      minCount = paramCount;
      candidate = selection;
    }
  }

  return candidate;
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

    return url.replace(/{([-_a-zA-Z0-9[\]]+)}/g, (original, key) => {
      if (getUserVariable(this.user, key)) return getUserVariable(this.user, key);
      return variables[key] ? variables[key].default : original;
    });
  }

  operation(path, method) {
    const operation = getPathOperation(this, { swagger: { path }, api: { method } });
    return new Operation(this, path, method, operation);
  }

  findOperation(url, method) {
    const { origin, pathname } = new URL(url);
    const { servers, paths } = this;

    const targetServer = servers.find(s => s.url === origin);
    if (!targetServer) return undefined;

    const annotatedPaths = generatePathMatches(paths, pathname, origin);
    if (!annotatedPaths.length) return undefined;

    const includesMethod = filterPathMethods(annotatedPaths, method);
    if (!includesMethod.length) return undefined;

    return findTargetPath(includesMethod);
  }
}

module.exports = Oas;
module.exports.Operation = Operation;
