import { describe, it, expect, assert } from 'vitest';

import { ValidationError } from '../../../src/errors.js';
import { validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';

describe('Large file memory leak protection', { timeout: 20000 }, () => {
  it.each([
    ['cloudflare spec (stringified to a single line)', 'cloudflare-stringified.json'],
    ['cloudflare spec', 'cloudflare.json'],
  ])('%s', async (name, file) => {
    try {
      await validate(relativePath(`specs/large-file-memory-leak/${file}`));
      assert.fail();
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.message).toMatch(/^OpenAPI schema validation failed.\n(.*)+/);
      expect(err.message.match(/4xx is not expected to be here!/g) || []).toHaveLength(20);
      expect(err.message).toContain(
        'Plus an additional 1016 errors. Please resolve the above and re-run validation to see more.',
      );
    }
  });
});
