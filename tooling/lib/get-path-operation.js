const getPath = require('./get-path');

module.exports = function getPathOperation(oas, doc) {
  if (oas.paths && doc.swagger) {
    const path = getPath(oas, doc);
    if (path) {
      return path[doc.api.method];
    }
  }

  return { parameters: [] };
};
