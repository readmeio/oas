const getResponseExamples = require('./get-response-examples');

/**
 * @param {object} operation
 */
module.exports = operation => {
  // spreads the contents of the map for each callback so there's not nested arrays returned
  return [].concat(
    ...Object.keys(operation.callbacks || {}).map(callback => {
      // spreads the contents again so there's not nested arrays returned
      return []
        .concat(
          ...Object.keys(operation.callbacks[callback]).map(expression => {
            return Object.keys(operation.callbacks[callback][expression]).map(method => {
              const example = getResponseExamples(operation.callbacks[callback][expression][method]);
              if (example.length === 0) return false;

              return {
                identifier: callback,
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
