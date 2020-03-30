/* eslint-disable max-classes-per-file */
const { pathToRegexp, match } = require('path-to-regexp');
const getPathOperation = require('./lib/get-path-operation');
const getUserVariable = require('./lib/get-user-variable');
const findSchemaDefinition = require('./lib/find-schema-definition');

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
          } else if (security.type === 'apiKey') {
            if (security.in === 'query') type = 'Query';
            else if (security.in === 'header' || security.in === 'cookie') type = 'Header';
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

  getHeaders() {
    this.headers = {
      request: [],
      response: [],
    };

    const security = this.prepareSecurity();
    if (security.Header) {
      this.headers.request = security.Header.map(h => {
        if (h.in === 'cookie') return 'Cookie';
        return h.name;
      });
    }
    if (security.Bearer || security.Basic) {
      this.headers.request.push('Authorization');
    }

    if (this.parameters) {
      this.headers.request = this.headers.request.concat(
        this.parameters
          .map(p => {
            if (p.in && p.in === 'header') return p.name;
            if (p.$ref) {
              const { name } = findSchemaDefinition(p.$ref, this.oas);
              return name;
            }
            return undefined;
          })
          .filter(p => p)
      );
    }

    this.headers.response = Object.keys(this.responses)
      .filter(r => this.responses[r].headers)
      .map(r => Object.keys(this.responses[r].headers))
      .reduce((a, b) => a.concat(b), []);

    return this.headers;
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
    const { origin } = new URL(url);
    const originRegExp = new RegExp(origin);
    const { servers, paths } = this;

    if (!servers || !servers.length) return undefined;
    const targetServer = servers.find(s => originRegExp.exec(s.url));
    if (!targetServer) return undefined;

    const [, pathName] = url.split(targetServer.url);
    if (pathName === undefined) return undefined;
    const annotatedPaths = generatePathMatches(paths, pathName, targetServer.url);
    if (!annotatedPaths.length) return undefined;

    const includesMethod = filterPathMethods(annotatedPaths, method);
    if (!includesMethod.length) return undefined;

    return findTargetPath(includesMethod);
  }
}

module.exports = Oas;
module.exports.Operation = Operation;
