import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['.tmp/**', 'src/schemas/**'],
  },
});
