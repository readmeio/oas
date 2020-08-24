/* eslint-disable no-underscore-dangle */
const findSchemaDefinition = require('./lib/find-schema-definition');

function matchesMimeType(arr, contentType) {
  return arr.some(function (type) {
    return contentType.indexOf(type) > -1;
  });
}

class Operation {
  constructor(oas, path, method, operation) {
    Object.assign(this, operation);
    this.oas = oas;
    this.path = path;
    this.method = method;
  }

  getContentType() {
    if (typeof this.contentType !== 'undefined') {
      return this.contentType;
    }

    let types = [];
    if (this.requestBody) {
      if ('$ref' in this.requestBody) {
        this.requestBody = findSchemaDefinition(this.requestBody.$ref, this.oas);
      }

      if ('content' in this.requestBody) {
        types = Object.keys(this.requestBody.content);
      }
    }

    this.contentType = 'application/json';
    if (types && types.length) {
      this.contentType = types[0];
    }

    // Favor JSON if it exists
    types.forEach(t => {
      if (t.match(/json/)) {
        this.contentType = t;
      }
    });

    return this.contentType;
  }

  isFormUrlEncoded() {
    return matchesMimeType(['application/x-www-form-urlencoded'], this.getContentType());
  }

  isMultipart() {
    return matchesMimeType(
      ['multipart/mixed', 'multipart/related', 'multipart/form-data', 'multipart/alternative'],
      this.getContentType()
    );
  }

  isJson() {
    return matchesMimeType(
      ['application/json', 'application/x-json', 'text/json', 'text/x-json', '+json'],
      this.getContentType()
    );
  }

  getSecurity() {
    if (!('components' in this.oas) || !('securitySchemes' in this.oas.components)) {
      return [];
    }

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
            else if (security.in === 'header') type = 'Header';
            else if (security.in === 'cookie') type = 'Cookie';
          } else {
            return false;
          }

          security._key = key;

          return { type, security };
        });
      })
      .reduce((prev, securities) => {
        securities.forEach(security => {
          // Remove non-existent schemes
          if (!security) return;
          if (!prev[security.type]) prev[security.type] = [];

          // Only add schemes we haven't seen yet.
          const exists = prev[security.type].findIndex(sec => sec._key === security.security._key);
          if (exists < 0) {
            prev[security.type].push(security.security);
          }
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
        return h.name;
      });
    }

    if (security.Bearer || security.Basic) {
      this.headers.request.push('Authorization');
    }

    if (security.Cookie) {
      this.headers.request.push('Cookie');
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

    // If the operation doesn't already specify a 'content-type' request header,
    // we check if the path operation request body contains content, which implies that
    // we should also include the 'content-type' header.
    if (!this.headers.request.includes('Content-Type') && this.requestBody) {
      if (this.requestBody.$ref) {
        const ref = findSchemaDefinition(this.requestBody.$ref, this.oas);
        if (ref.content && Object.keys(ref.content)) this.headers.request.push('Content-Type');
      } else if (this.requestBody.content && Object.keys(this.requestBody.content))
        this.headers.request.push('Content-Type');
    }

    // This is a similar approach, but in this case if we check the response content
    // and prioritize the 'accept' request header and 'content-type' request header
    if (this.responses) {
      if (Object.keys(this.responses).some(response => !!this.responses[response].content)) {
        if (!this.headers.request.includes('Accept')) this.headers.request.push('Accept');
        if (!this.headers.response.includes('Content-Type')) this.headers.response.push('Content-Type');
      }
    }

    return this.headers;
  }
}

module.exports = Operation;
