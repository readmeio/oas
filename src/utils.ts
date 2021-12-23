import findSchemaDefinition from './lib/find-schema-definition';
import getSchema from './lib/get-schema';
import matchesMimeType from './lib/matches-mimetype';
import { types as jsonSchemaTypes } from './operation/get-parameters-as-json-schema';

const supportedMethods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

export default {
  findSchemaDefinition,
  getSchema,
  jsonSchemaTypes,
  matchesMimeType,
};

export { supportedMethods };
