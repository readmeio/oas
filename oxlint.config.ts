import oxlintConfig from '@readme/oxlint-config';
import oxlintConfigVitest from '@readme/oxlint-config/testing/vitest';
import oxlintConfigTS from '@readme/oxlint-config/typescript';
import { defineConfig } from 'oxlint';

export default defineConfig({
  extends: [oxlintConfig, oxlintConfigTS],
  options: {
    reportUnusedDisableDirectives: 'error',
  },
  ignorePatterns: ['**/coverage', '**/dist'],
  env: {
    browser: true,
    commonjs: true,
    es2022: true,
    node: true,
  },
  overrides: [
    {
      files: ['packages/**/*.test.{js,ts}'],
      ...oxlintConfigVitest,
    },
    {
      files: [
        'packages/jest-expect-har/test/*.test.{js,ts}',
        'packages/jest-expect-jsonschema/test/*.test.{js,ts}',
        'packages/jest-expect-openapi/test/*.test.{js,ts}',
      ],
      env: {
        jest: true,
        vitest: true,
      },
    },
  ],
});
