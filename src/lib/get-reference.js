module.exports = function findReference(reference, type, oas) {
  const explodedRef = reference.split('/');
  const key = explodedRef[explodedRef.length - 1];
  return oas.components[type][key];
};
