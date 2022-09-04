module.exports = {
  coveragePathIgnorePatterns: ['/dist', '/node_modules', '/__tests__/__fixtures__/', '/__tests__/(.*)/__fixtures__/'],
  modulePaths: ['<rootDir>'],
  preset: 'ts-jest/presets/js-with-ts',
  roots: ['<rootDir>'],
  testPathIgnorePatterns: ['/__tests__/__fixtures__/', '/__tests__/(.*)/__fixtures__/'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(js?|ts?)$',
  transform: {
    '\\.ts?$': ['ts-jest', { tsconfig: '__tests__/tsconfig.json' }],
  },
};
