import findSchemaDefinition from './lib/find-schema-definition.js';
import { getParameterContentType } from './lib/get-parameter-content-type.js';
import matchesMimeType from './lib/matches-mimetype.js';
import { types as jsonSchemaTypes } from './operation/lib/get-parameters-as-json-schema.js';

const supportedMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

export { findSchemaDefinition, getParameterContentType, jsonSchemaTypes, matchesMimeType, supportedMethods };
