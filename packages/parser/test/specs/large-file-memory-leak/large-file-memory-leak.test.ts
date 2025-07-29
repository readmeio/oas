import { assert, describe, expect, it } from 'vitest';

import { validate } from '../../../src/index.js';
import { relativePath } from '../../utils.js';

describe('Large file memory leak protection', { timeout: 20000 }, () => {
  it.each([
    ['cloudflare spec (stringified to a single line)', 'cloudflare-stringified.json'],
    ['cloudflare spec', 'cloudflare.json'],
  ])('%s', async (name, file) => {
    const res = await validate(relativePath(`specs/large-file-memory-leak/${file}`));
    if (res.valid === true) {
      assert.fail();
    }

    expect(res.valid).toBe(false);
    expect(res.errors).toHaveLength(20);
    expect(res.errors).toStrictEqual(
      expect.arrayContaining([
        {
          message: expect.stringContaining('4xx is not expected to be here!'),
        },
      ]),
    );
    expect(res.additionalErrors).toBe(1016);
  });
});
