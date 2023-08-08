import type { JestConfigWithTsJest } from 'ts-jest';

export default {
  coveragePathIgnorePatterns: ['/dist', '/node_modules'],
  modulePaths: ['<rootDir>'],
  roots: ['<rootDir>'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(js?|ts?)$',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  preset: 'ts-jest/presets/default-esm',
  transformIgnorePatterns: ['node_modules/(?!mdast-util-from-markdown|node-fetch|unist-util-find)'],
} as JestConfigWithTsJest;
