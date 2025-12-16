import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: ['packages/jest-expect-*/jest.config.cjs'],

  ignoreDependencies: [
    // This is pulled in for `oas-to-har` via `import 'har-format'` in order to package up and
    // export some HAR typings.
    '@types/har-format',

    // `ts-jest` is used by Jest in order to run TS.
    'ts-jest',
  ],
};

export default config;
