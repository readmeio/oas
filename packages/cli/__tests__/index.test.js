const Oas = require('../src/index');

describe('index.js', () => {
  it('should be returning the `@readme/oas-tooling` library', () => {
    expect(Object.keys(Oas)).toStrictEqual(['Operation']);
  });
});
