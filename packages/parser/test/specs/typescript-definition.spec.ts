/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable vitest/require-hook */
/* eslint-disable vitest/consistent-test-filename */
import type { OpenAPI } from 'openapi-types';

import * as assert from 'assert';

import * as OpenAPIParser from '../../lib';

const baseUrl = 'http://example.com/api';
const openapiPath = 'my-api.json';
const options = {};
const promiseResolve = (_: object) => undefined;
const promiseReject = (_: Error) => undefined;
const callback = (_err: Error | null, _api?: object) => undefined;
const openapiObject: OpenAPI.Document = {
  openapi: '3.0.0',
  info: {
    title: 'My API',
    version: '1.0.0',
  },
  paths: {},
};

// OpenAPIParser class instance
const parser = new OpenAPIParser();

// OpenAPIParser instance properties
assert(parser.$refs.circular === true);
assert(parser.api.info.title === 'My API');

// OpenAPIParser instance methods (with callbacks)
parser.bundle(openapiPath, callback);
parser.bundle(openapiObject, callback);
parser.bundle(openapiPath, options, callback);
parser.bundle(openapiObject, options, callback);
parser.bundle(baseUrl, openapiPath, options, callback);
parser.bundle(baseUrl, openapiObject, options, callback);

parser.dereference(openapiPath, callback);
parser.dereference(openapiObject, callback);
parser.dereference(openapiPath, options, callback);
parser.dereference(openapiObject, options, callback);
parser.dereference(baseUrl, openapiPath, options, callback);
parser.dereference(baseUrl, openapiObject, options, callback);

parser.validate(openapiPath, callback);
parser.validate(openapiObject, callback);
parser.validate(openapiPath, options, callback);
parser.validate(openapiObject, options, callback);
parser.validate(baseUrl, openapiPath, options, callback);
parser.validate(baseUrl, openapiObject, options, callback);

parser.parse(openapiPath, callback);
parser.parse(openapiObject, callback);
parser.parse(openapiPath, options, callback);
parser.parse(openapiObject, options, callback);
parser.parse(baseUrl, openapiPath, options, callback);
parser.parse(baseUrl, openapiObject, options, callback);

parser.resolve(openapiPath, callback);
parser.resolve(openapiObject, callback);
parser.resolve(openapiPath, options, callback);
parser.resolve(openapiObject, options, callback);
parser.resolve(baseUrl, openapiPath, options, callback);
parser.resolve(baseUrl, openapiObject, options, callback);

// OpenAPIParser instance methods (with Promises)
parser.bundle(openapiPath).then(promiseResolve, promiseReject);
parser.bundle(openapiObject).then(promiseResolve, promiseReject);
parser.bundle(openapiPath, options).then(promiseResolve, promiseReject);
parser.bundle(openapiObject, options).then(promiseResolve, promiseReject);
parser.bundle(baseUrl, openapiPath, options).then(promiseResolve, promiseReject);
parser.bundle(baseUrl, openapiObject, options).then(promiseResolve, promiseReject);

parser.dereference(openapiPath).then(promiseResolve, promiseReject);
parser.dereference(openapiObject).then(promiseResolve, promiseReject);
parser.dereference(openapiPath, options).then(promiseResolve, promiseReject);
parser.dereference(openapiObject, options).then(promiseResolve, promiseReject);
parser.dereference(baseUrl, openapiPath, options).then(promiseResolve, promiseReject);
parser.dereference(baseUrl, openapiObject, options).then(promiseResolve, promiseReject);

parser.validate(openapiPath).then(promiseResolve, promiseReject);
parser.validate(openapiObject).then(promiseResolve, promiseReject);
parser.validate(openapiPath, options).then(promiseResolve, promiseReject);
parser.validate(openapiObject, options).then(promiseResolve, promiseReject);
parser.validate(baseUrl, openapiPath, options).then(promiseResolve, promiseReject);
parser.validate(baseUrl, openapiObject, options).then(promiseResolve, promiseReject);

parser.parse(openapiPath).then(promiseResolve, promiseReject);
parser.parse(openapiObject).then(promiseResolve, promiseReject);
parser.parse(openapiPath, options).then(promiseResolve, promiseReject);
parser.parse(openapiObject, options).then(promiseResolve, promiseReject);
parser.parse(baseUrl, openapiPath, options).then(promiseResolve, promiseReject);
parser.parse(baseUrl, openapiObject, options).then(promiseResolve, promiseReject);

parser.resolve(openapiPath).then(promiseResolve, promiseReject);
parser.resolve(openapiObject).then(promiseResolve, promiseReject);
parser.resolve(openapiPath, options).then(promiseResolve, promiseReject);
parser.resolve(openapiObject, options).then(promiseResolve, promiseReject);
parser.resolve(baseUrl, openapiPath, options).then(promiseResolve, promiseReject);
parser.resolve(baseUrl, openapiObject, options).then(promiseResolve, promiseReject);

// OpenAPIParser static methods (with callbacks)
OpenAPIParser.bundle(openapiPath, callback);
OpenAPIParser.bundle(openapiObject, callback);
OpenAPIParser.bundle(openapiPath, options, callback);
OpenAPIParser.bundle(openapiObject, options, callback);
OpenAPIParser.bundle(baseUrl, openapiPath, options, callback);
OpenAPIParser.bundle(baseUrl, openapiObject, options, callback);

OpenAPIParser.dereference(openapiPath, callback);
OpenAPIParser.dereference(openapiObject, callback);
OpenAPIParser.dereference(openapiPath, options, callback);
OpenAPIParser.dereference(openapiObject, options, callback);
OpenAPIParser.dereference(baseUrl, openapiPath, options, callback);
OpenAPIParser.dereference(baseUrl, openapiObject, options, callback);

OpenAPIParser.validate(openapiPath, callback);
OpenAPIParser.validate(openapiObject, callback);
OpenAPIParser.validate(openapiPath, options, callback);
OpenAPIParser.validate(openapiObject, options, callback);
OpenAPIParser.validate(baseUrl, openapiPath, options, callback);
OpenAPIParser.validate(baseUrl, openapiObject, options, callback);

OpenAPIParser.parse(openapiPath, callback);
OpenAPIParser.parse(openapiObject, callback);
OpenAPIParser.parse(openapiPath, options, callback);
OpenAPIParser.parse(openapiObject, options, callback);
OpenAPIParser.parse(baseUrl, openapiPath, options, callback);
OpenAPIParser.parse(baseUrl, openapiObject, options, callback);

OpenAPIParser.resolve(openapiPath, callback);
OpenAPIParser.resolve(openapiObject, callback);
OpenAPIParser.resolve(openapiPath, options, callback);
OpenAPIParser.resolve(openapiObject, options, callback);
OpenAPIParser.resolve(baseUrl, openapiPath, options, callback);
OpenAPIParser.resolve(baseUrl, openapiObject, options, callback);

// OpenAPIParser static methods (with Promises)
OpenAPIParser.bundle(openapiPath).then(promiseResolve, promiseReject);
OpenAPIParser.bundle(openapiObject).then(promiseResolve, promiseReject);
OpenAPIParser.bundle(openapiPath, options).then(promiseResolve, promiseReject);
OpenAPIParser.bundle(openapiObject, options).then(promiseResolve, promiseReject);
OpenAPIParser.bundle(baseUrl, openapiPath, options).then(promiseResolve, promiseReject);
OpenAPIParser.bundle(baseUrl, openapiObject, options).then(promiseResolve, promiseReject);

OpenAPIParser.dereference(openapiPath).then(promiseResolve, promiseReject);
OpenAPIParser.dereference(openapiObject).then(promiseResolve, promiseReject);
OpenAPIParser.dereference(openapiPath, options).then(promiseResolve, promiseReject);
OpenAPIParser.dereference(openapiObject, options).then(promiseResolve, promiseReject);
OpenAPIParser.dereference(baseUrl, openapiPath, options).then(promiseResolve, promiseReject);
OpenAPIParser.dereference(baseUrl, openapiObject, options).then(promiseResolve, promiseReject);

OpenAPIParser.validate(openapiPath).then(promiseResolve, promiseReject);
OpenAPIParser.validate(openapiObject).then(promiseResolve, promiseReject);
OpenAPIParser.validate(openapiPath, options).then(promiseResolve, promiseReject);
OpenAPIParser.validate(openapiObject, options).then(promiseResolve, promiseReject);
OpenAPIParser.validate(baseUrl, openapiPath, options).then(promiseResolve, promiseReject);
OpenAPIParser.validate(baseUrl, openapiObject, options).then(promiseResolve, promiseReject);

OpenAPIParser.parse(openapiPath).then(promiseResolve, promiseReject);
OpenAPIParser.parse(openapiObject).then(promiseResolve, promiseReject);
OpenAPIParser.parse(openapiPath, options).then(promiseResolve, promiseReject);
OpenAPIParser.parse(openapiObject, options).then(promiseResolve, promiseReject);
OpenAPIParser.parse(baseUrl, openapiPath, options).then(promiseResolve, promiseReject);
OpenAPIParser.parse(baseUrl, openapiObject, options).then(promiseResolve, promiseReject);

OpenAPIParser.resolve(openapiPath).then(promiseResolve, promiseReject);
OpenAPIParser.resolve(openapiObject).then(promiseResolve, promiseReject);
OpenAPIParser.resolve(openapiPath, options).then(promiseResolve, promiseReject);
OpenAPIParser.resolve(openapiObject, options).then(promiseResolve, promiseReject);
OpenAPIParser.resolve(baseUrl, openapiPath, options).then(promiseResolve, promiseReject);
OpenAPIParser.resolve(baseUrl, openapiObject, options).then(promiseResolve, promiseReject);
