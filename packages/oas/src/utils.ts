import findSchemaDefinition from './lib/find-schema-definition.js';
import { getParameterContentType } from './lib/get-parameter-content-type.js';
import matchesMimeType from './lib/matches-mimetype.js';
import { types as jsonSchemaTypes } from './operation/lib/get-parameters-as-json-schema.js';

export const supportedMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

export const SERVER_VARIABLE_REGEX: RegExp = /{([-_a-zA-Z0-9:.[\]]+)}/g;

export { findSchemaDefinition, getParameterContentType, jsonSchemaTypes, matchesMimeType };
