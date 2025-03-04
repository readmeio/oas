/** @type {import('jest').Config} */
module.exports = {
  coveragePathIgnorePatterns: ['test/__fixtures__/'],
  preset: 'ts-jest/presets/js-with-ts',
  testPathIgnorePatterns: ['test/__fixtures__/'],
  testRegex: '\\/test/[A-z]+\\.test\\.(js?|ts?)$',
  transform: {
    '\\.ts$': ['ts-jest', { tsconfig: 'test/tsconfig.json' }],
  },
};
