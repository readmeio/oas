import oxfmtConfig from '@readme/oxlint-config/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig(
  Object.assign(structuredClone(oxfmtConfig), {
    sortImports: {
      ...oxfmtConfig.sortImports,
    },
    ignorePatterns: [
      '**/.turbo/',
      '**/coverage/',
      '**/dist/',
      '**/node_modules/',
      '.changeset/',

      'packages/**/package.json', // Temporarily ignoring `package.json` files.

      'packages/parser/test/specs/large-file-memory-leak/cloudflare-stringified.json',
    ],
  }),
);
