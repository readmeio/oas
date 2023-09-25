import findSchemaDefinition from './lib/find-schema-definition';
import matchesMimeType from './lib/matches-mimetype';
import { types as jsonSchemaTypes } from './operation/get-parameters-as-json-schema';

const supportedMethods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

export default {
  findSchemaDefinition,
  jsonSchemaTypes,
  matchesMimeType,
};

export { supportedMethods };
