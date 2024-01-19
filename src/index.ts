import type { MatcherState } from '@vitest/expect';
import type { Har } from 'har-format';

import * as validate from 'har-validator';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      /**
       * Ensures that the expected HAR is a valid HAR representation.
       */
      toBeAValidHAR(): R;
    }
  }
}

export default function toBeAValidHAR(
  this: jest.MatcherUtils | MatcherState,
  har: Har,
): { message: () => string; pass: boolean } {
  const request = har?.log?.entries?.[0]?.request || undefined;
  if (!request) {
    return {
      message: () => 'expected supplied HAR to be valid\n\nUnable to destructure `log.entries[0].request`',
      pass: false,
    };
  }

  return validate
    .request(request)
    .then(() => {
      return {
        message: () => 'expected supplied HAR not to be valid',
        pass: true,
      };
    })
    .catch((err: { errors: unknown }) => {
      // error type: // https://github.com/ahmadnassri/node-har-validator/blob/master/lib/error.js
      return {
        message: () => `expected supplied HAR to be valid\n\nError: ${this.utils.printReceived(err.errors)}`,
        pass: false,
      };
    });
}
