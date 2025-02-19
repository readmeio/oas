import { describe, it } from 'vitest';

import { validate } from '../../../src/index.js';

import { isKnownError } from './known-errors.js';
import realWorldAPIs from './real-world-apis.json';

const MAX_APIS_TO_TEST = 100;

describe(
  'Real-world APIs',
  {
    // Increase the timeouts by A LOT because:
    //   1) CI is really slow
    //   2) Some API definitions are HUGE and take a while to download
    //   3) If the download fails, we retry 2 times, which takes even more time
    //   4) Really large API definitions take longer to pase, dereference, and validate
    // timeout: host.ci ? 300000 : 60000, // 5 minutes in CI, 1 minute locally
  },
  () => {
    it.each(realWorldAPIs.slice(0, MAX_APIS_TO_TEST))('$name', async api => {
      try {
        await validate(api.url);
      } catch (err) {
        // If we have errors pulling the API definition down then don't fail out.
        if (err.message.includes('Error downloading https://') || err.message.includes('socket hang up')) {
          return;
        }

        // Validation failed but maybe we've marked this as a known and acceptable error.
        const knownError = isKnownError(api.name, err);
        if (knownError) {
          return;
        }

        throw err;
      }
    });
  },
);
