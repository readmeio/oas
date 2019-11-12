module.exports = function getPath(swagger, doc) {
  if (!swagger.paths || !doc.swagger) {
    return { parameters: [] };
  }
  return swagger.paths[doc.swagger.path];
};
