import { assert, describe, expect, it } from 'vitest';

import { validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';
import { toValidate } from '../../vitest.matchers.js';

expect.extend({ toValidate });

describe('API validation timeout', () => {
  // oxlint-disable jest/no-conditional-expect
  it('should timeout validation if timeout is exceeded', async () => {
    try {
      await validate(relativePath('specs/large-file-memory-leak/cloudflare.json'), { timeoutMs: 5 });
      assert.fail();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('timeout');
    }
  });
  // oxlint-enable jest/no-conditional-expect

  it('should succeed validation if timeout is not exceeded', async () => {
    await expect(relativePath('specs/circular/circular.yaml')).toValidate({ options: { timeoutMs: 5000 } });
  });
});
