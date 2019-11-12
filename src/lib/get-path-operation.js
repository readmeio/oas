const getPath = require('./get-path');

module.exports = function getPathOperation(swagger, doc) {
  if (swagger.paths && doc.swagger) {
    const path = getPath(swagger, doc);
    if (path) return path[doc.api.method];
  }

  return { parameters: [] };
};
