import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  // `attw` is used to ensure that our dists have proper typings.
  ignoreBinaries: ['attw'],

  ignoreDependencies: [
    // This is pulled in for `oas-to-har` via `import 'har-format'` in order to package up and
    // export some HAR typings.
    '@types/har-format',
  ],
};

export default config;
