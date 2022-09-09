module.exports = {
  coveragePathIgnorePatterns: ['__tests__/__fixtures__/'],
  preset: 'ts-jest/presets/js-with-ts',
  testPathIgnorePatterns: ['__tests__/__fixtures__/'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(js?|ts?)$',
  transform: {
    '\\.ts$': ['ts-jest', { tsconfig: '__tests__/tsconfig.json' }],
  },
};
