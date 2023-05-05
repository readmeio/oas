import type { Config } from 'jest';

export default {
  coveragePathIgnorePatterns: ['/dist', '/node_modules'],
  modulePaths: ['<rootDir>'],
  roots: ['<rootDir>'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(js?|ts?)$',
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
  },
} as Config;
