import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: ['packages/jest-expect-*/jest.config.cjs'],

  // The matcher packages optionally support Jest or Vitest. They augment `vitest` types
  // so Vitest consumers get matcher typings, which knip reports as a hard reference.
  ignoreIssues: {
    'packages/jest-expect-har/**': ['optionalPeerDependencies'],
    'packages/jest-expect-jsonschema/**': ['optionalPeerDependencies'],
    'packages/jest-expect-openapi/**': ['optionalPeerDependencies'],
  },

  ignoreDependencies: [
    '@readme/oxlint-config',
    // This is pulled in for `oas-to-har` via `import 'har-format'` in order to package up and
    // export some HAR typings.
    '@types/har-format',

    // `ts-jest` is used by Jest in order to run TS.
    'ts-jest',
  ],

  ignoreFiles: ['oxfmt.config.ts', 'oxlint.config.ts'],

  workspaces: {
    'packages/oas-normalize': {
      // Mocked in tests via the repo-root install (see vitest.config.mts alias); not a package dep.
      ignoreDependencies: ['undici'],
    },
  },
};

export default config;
