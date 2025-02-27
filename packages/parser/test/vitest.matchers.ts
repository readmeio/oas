/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { ParserOptions, ParserRulesOpenAPI, ValidationError, ValidationWarning } from '../src/types.js';
import type { AsyncExpectationResult, MatcherState } from '@vitest/expect';

import { expect } from 'vitest';

import { validate } from '../src/index.js';

interface CustomMatchers<R = unknown> {
  /**
   * Ensure that an API definition is valid, or optionally using `.not` is invalid. You can also
   * supply and assert against a specific set of errors and/or warnings.
   *
   */
  toValidate({
    options,
    rules,
    errors,
    warnings,
  }?: {
    options?: ParserOptions;
    rules?: Partial<ParserRulesOpenAPI>;
    errors?: ValidationError[];
    warnings?: ValidationWarning[];
  }): Promise<R>;
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

export async function toValidate(
  this: MatcherState,
  file: string,
  {
    options,
    rules,
    errors,
    warnings,
  }: {
    options?: ParserOptions;
    rules?: Partial<ParserRulesOpenAPI>;
    errors?: ValidationError[];
    warnings?: ValidationWarning[];
  } = {},
): AsyncExpectationResult {
  const { isNot } = this;

  const result = await validate(file, {
    ...options,
    validate: {
      ...options?.validate,
      rules: {
        openapi: rules || {},
      },
    },
  });

  // If we're expecting this API definition to **not** be valid then we need to have some differing
  // logic because the validator returns differnt data for invalid definitions.
  if (isNot) {
    if (result.valid === true) {
      return {
        pass: true,
        message: () => 'expected api definition to be valid',
      };
    }

    // We can't use `this.equals` because our expectations may be using regex matchers like
    // `expect.stringContaining()` and `this.equals` doesn't support that.
    try {
      expect(result.errors).toStrictEqual(errors || []);
      expect(result.warnings).toStrictEqual(warnings || []);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      return {
        pass: true,
        message: () =>
          'expected errors and/or warnings to not match.\n\n' +
          `${this.utils.printExpected({ errors, warnings })}\n` +
          `${this.utils.printReceived({ errors: result.errors, warnings: result.warnings })}`,
      };
    }

    return {
      pass: false,
      message: () => 'expected api definition to be valid',
    };
  }

  if (result.valid === false) {
    return {
      pass: false,
      message: () =>
        'expected api definition to be valid\n\n' +
        `${this.utils.printReceived({ errors: result.errors, warnings: result.warnings })}`,
    };
  }

  try {
    expect(result.warnings).toStrictEqual(warnings || []);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return {
      pass: false,
      message: () =>
        'expected warnings to not match.\n\n' +
        `${this.utils.printExpected(warnings)}\n` +
        `${this.utils.printReceived(result.warnings)}`,
    };
  }

  return {
    pass: true,
    message: () => 'expected api definition to be valid',
  };
}
