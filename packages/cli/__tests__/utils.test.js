const utils = require('../src/utils');

describe('utils.js', () => {
  it('should be returning the `@readme/oas-tooling/utils` file', () => {
    // No need to test that everything from the tooling package is there, if we have `flattenSchema`, we've got them
    // all.
    expect(Object.keys(utils)).toContain('flattenSchema');
    expect(typeof utils.flattenSchema).toBe('function');
  });
});
