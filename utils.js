const findSchemaDefinition = require('./src/lib/find-schema-definition');
const flattenArray = require('./src/lib/flatten-array');
const flattenSchema = require('./src/lib/flatten-schema');
const getPath = require('./src/lib/get-path');
const getSchema = require('./src/lib/get-schema');
const parametersToJsonSchema = require('./src/lib/parameters-to-json-schema');

module.exports = {
  findSchemaDefinition,
  flattenArray,
  flattenSchema,
  getPath,
  getSchema,
  parametersToJsonSchema,
};
