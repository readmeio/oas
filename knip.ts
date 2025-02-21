import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: ['packages/**/dist/**', 'packages/**/tsup.config.ts', 'tsup.config.ts'],

  // `attw` is used to ensure that our dists have proper typings.
  ignoreBinaries: ['attw'],

  workspaces: {
    'packages/oas': {
      entry: [
        'src/index.ts',
        'src/analyzer/index.ts',
        'src/analyzer/types.ts',
        'src/extensions.ts',
        'src/operation/index.ts',
        'src/operation/lib/get-parameters-as-json-schema.ts',
        'src/reducer/index.ts',
        'src/utils.ts',
        'src/types.ts',
      ],
    },
    'packages/oas-normalize': {
      entry: ['src/index.ts', 'src/lib/types.ts', 'src/lib/utils.ts'],
    },
    'packages/oas-to-har': {
      entry: ['src/index.ts', 'src/lib/configure-security.ts', 'src/lib/types.ts'],
    },
    'packages/oas-to-snippet': {
      entry: ['src/index.ts', 'src/languages.ts', 'src/types.ts'],
      ignoreDependencies: ['@types/har-format'],
    },
    'packages/parser': {
      entry: ['src/index.ts'],
    },
    'packages/postman-types': {
      entry: ['src/index.ts'],
    },
  },
};

export default config;
