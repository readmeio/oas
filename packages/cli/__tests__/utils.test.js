const utils = require('../src/utils');

describe('utils.js', () => {
  it('should be a simple pass through of `@readme/oas-tooling/utils`', () => {
    // No need to test that everything from the tooling package is there, if we have `flattenSchema`, we've got them
    // all.
    expect(Object.keys(utils)).toContain('flattenSchema');
    expect(typeof utils.flattenSchema).toBe('function');
  });
});
