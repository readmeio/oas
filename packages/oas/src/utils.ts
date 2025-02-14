import findSchemaDefinition from './lib/find-schema-definition.js';
import matchesMimeType from './lib/matches-mimetype.js';
import { types as jsonSchemaTypes } from './operation/lib/get-parameters-as-json-schema.js';

const methods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

const supportedMethods: Set<(typeof methods)[number]> = new Set(methods);

export { findSchemaDefinition, jsonSchemaTypes, matchesMimeType, supportedMethods };
