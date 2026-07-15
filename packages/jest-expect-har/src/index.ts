// Anchors the `@jest/expect` module augmentation below: since this file is a module, TS won't
// resolve that augmentation unless something here actually pulls `@jest/expect` into the program.
/// <reference types="@jest/expect" />

import type { MatcherState } from '@vitest/expect';
import type { Har } from 'har-format';

import { request as validateHarRequest } from 'har-validator';

declare global {
  // oxlint-disable-next-line typescript/no-namespace -- This is how you type Jest matchers.
  namespace jest {
    interface Matchers<R> {
      /**
       * Ensures that the expected HAR is a valid HAR representation.
       */
      toBeAValidHAR(): Promise<R>;
    }
  }
}

// This augments `@jest/expect`'s `Matchers` interface (as opposed to the ambient `jest` namespace
// above) so that this matcher is typed when using `@jest/globals` instead of Jest's injected
// globals.
declare module '@jest/expect' {
  interface Matchers<R> {
    /**
     * Ensures that the expected HAR is a valid HAR representation.
     */
    toBeAValidHAR(): Promise<R>;
  }
}

export default async function toBeAValidHAR(
  this: jest.MatcherUtils | MatcherState,
  har: Har,
): Promise<{ message: () => string; pass: boolean }> {
  const request = har?.log?.entries?.[0]?.request || undefined;
  if (!request) {
    return {
      message: () => 'expected supplied HAR to be valid\n\nUnable to destructure `log.entries[0].request`',
      pass: false,
    };
  }

  return validateHarRequest(request)
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
