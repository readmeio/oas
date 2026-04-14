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
  rules: {
    'class-methods-use-this': 'off',
  },
  overrides: [
    {
      files: ['packages/**/*.test.{js,ts}'],
      ...oxlintConfigVitest,
      rules: Object.assign(structuredClone(oxlintConfigVitest.rules), {
        'jest/max-nested-describe': 'off',
        'jest/require-hook': 'off',

        // Unsafe optional chaining in tests is fine because if it fails we'll fail the test.
        'no-unsafe-optional-chaining': 'off',

        'vitest/warn-todo': 'off',
      }),
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
    {
      files: ['packages/oas/src/**/*.ts'],
      rules: {
        'max-classes-per-file': 'off',
        'no-continue': 'off',
        'no-param-reassign': 'off',
        'no-plusplus': 'off',
        'no-use-before-define': 'off',
      },
    },
    {
      files: ['packages/parser/**/*.ts'],
      rules: {
        'no-continue': 'off',
        'no-param-reassign': 'off',
        'no-plusplus': 'off',
        'no-use-before-define': 'off',
      },
    },
    {
      files: ['packages/parser/test/**/*.ts'],
      rules: {
        'no-conditional-expect': 'off',
        'no-multi-assign': 'off',
      },
    },
  ],
});
