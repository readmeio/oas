import { assert, describe, expect, it } from 'vitest';

import { validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';
import { toValidate } from '../../vitest.matchers.js';

expect.extend({ toValidate });

describe('API validation timeout', () => {
  it('should timeout validation if timeout is exceeded', async () => {
    try {
      await validate(relativePath('specs/large-file-memory-leak/cloudflare.json'), { timeoutMs: 5 });
      assert.fail();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('timeout');
    }
  });

  it('should succeed validation if timeout is not exceeded', async () => {
    await expect(relativePath('specs/circular/circular.yaml')).toValidate({ options: { timeoutMs: 5000 } });
  });
});
