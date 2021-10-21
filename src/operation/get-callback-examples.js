const getResponseExamples = require('./get-response-examples');

/**
 * @param {object} operation
 */
module.exports = operation => {
  return Object.keys(operation.callbacks || {})
    .map(callback => {
      let callbackExamples;
      Object.keys(operation.callbacks[callback]).map(expression => {
        Object.keys(operation.callbacks[callback][expression]).map(method => {
          const example = getResponseExamples(operation.callbacks[callback][expression][method]);
          if (example.length === 0) return false;
  
          return callbackExamples = {
            identifier: callback,
            expression,
            method,
            example,
          };
        });
      });
      return callbackExamples;
    })
    .filter(Boolean);
};
