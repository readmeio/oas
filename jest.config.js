module.exports = {
  coveragePathIgnorePatterns: ['/dist', '/node_modules', '/__tests__/__fixtures__/', '/__tests__/(.*)/__fixtures__/'],
  modulePaths: ['<rootDir>'],
  roots: ['<rootDir>'],
  testPathIgnorePatterns: ['/__tests__/__fixtures__/', '/__tests__/(.*)/__fixtures__/'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(js?|ts?)$',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '__tests__/tsconfig.json',
      },
    ],
  },
};
