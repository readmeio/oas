const getResponseExamples = require('./get-response-examples');

/**
 * @param {object} operation
 */
module.exports = operation => {
  // spreads the contents of the map for each callback so there's not nested arrays returned
  return [].concat(
    ...Object.keys(operation.callbacks || {}).map(identifier => {
      // spreads the contents again so there's not nested arrays returned
      return []
        .concat(
          ...Object.keys(operation.callbacks[identifier]).map(expression => {
            return Object.keys(operation.callbacks[identifier][expression]).map(method => {
              const example = getResponseExamples(operation.callbacks[identifier][expression][method]);
              if (example.length === 0) return false;

              return {
                identifier,
                expression,
                method,
                example,
              };
            });
          })
        )
        .filter(Boolean);
    })
  );
};
