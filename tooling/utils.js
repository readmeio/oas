const findSchemaDefinition = require('./lib/find-schema-definition');
const flattenArray = require('./lib/flatten-array');
const flattenSchema = require('./lib/flatten-schema');
const getPath = require('./lib/get-path');
const getSchema = require('./lib/get-schema');
const matchesMimeType = require('./lib/matches-mimetype');

module.exports = {
  findSchemaDefinition,
  flattenArray,
  flattenSchema,
  getPath,
  getSchema,
  matchesMimeType,
};
