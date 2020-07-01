const validate = require('har-validator');

expect.extend({
  toBeAValidHAR(har) {
    return validate
      .request(har.log.entries[0].request)
      .then(() => {
        return {
          message: () => `expected supplied HAR not to be valid`,
          pass: true,
        };
      })
      .catch(err => {
        return {
          message: () => `expected supplied HAR to be valid\n\nError: ${this.utils.printReceived(err.errors)}`,
          pass: false,
        };
      });
  },
});
