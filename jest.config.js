module.exports = {
  coveragePathIgnorePatterns: ['__tests__/__fixtures__/'],
  globals: {
    'ts-jest': {
      tsconfig: '__tests__/tsconfig.json',
    },
  },
  preset: 'ts-jest/presets/js-with-ts',
  testPathIgnorePatterns: ['__tests__/__fixtures__/'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(js?|ts?)$',
};
