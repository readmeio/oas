import { host } from '@jsdevtools/host-environment';
import { describe, it } from 'vitest';

import OpenAPIParser from '../../..';
import realWorldAPIs from '../../fixtures/real-world-apis.json';

import { isKnownError } from './known-errors';

const MAX_APIS_TO_TEST = host.ci ? 1500 : 100;

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
        await OpenAPIParser.validate(api.url);
      } catch (error) {
        // If we have errors pulling the API definition down then don't fail out.
        if (error.message.includes('Error downloading https://') || error.message.includes('socket hang up')) {
          return;
        }

        // Validation failed but maybe we've marked this as a known and acceptable error.
        const knownError = isKnownError(api.name, error);
        if (knownError) {
          return;
        }

        throw error;
      }
    });
  },
);
