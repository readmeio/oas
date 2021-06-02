module.exports = function getPath(oas, doc) {
  if (!oas.paths || !doc.swagger) {
    return { parameters: [] };
  }

  return oas.paths[doc.swagger.path];
};
