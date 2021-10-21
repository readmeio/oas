const getResponseExamples = require('./get-response-examples');

/**
 * @param {object} operation
 */
module.exports = operation => {
  return Object.keys(operation.callbacks || {})
    .map(callback => {
      let callbackExamples;
      Object.keys(operation.callbacks[callback]).forEach(expression => {
        const method = Object.keys(operation.callbacks[callback][expression]);
        const example = getResponseExamples(operation.callbacks[callback][expression][method]);
        if (example.length === 0) return false;

        callbackExamples = {
          identifier: callback,
          expression,
          method,
          example,
        };
        return callbackExamples;
      });
      return callbackExamples;
    })
    .filter(Boolean);
};
