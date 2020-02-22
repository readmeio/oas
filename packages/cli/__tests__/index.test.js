const Oas = require('../src/index');

describe('index.js', () => {
  it('should be a simple pass through of `@readme/oas-tooling`', () => {
    expect(Object.keys(Oas)).toStrictEqual(['Operation']);
  });
});
